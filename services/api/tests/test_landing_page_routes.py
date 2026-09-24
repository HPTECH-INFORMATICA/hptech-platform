from collections.abc import AsyncIterator
from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.identity import AuthenticatedIdentity, CompanyStatus, UserRole
from app.core.rbac import permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.landing_page import LandingPage
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.landing_page import LandingPageRepository
from app.schemas.landing_page import (
    LandingPageCreate,
    LandingPageListResponse,
    LandingPageUpdate,
)
from app.services.audit_log import sanitize_audit_metadata
from app.services.landing_page import (
    LandingPageConflictError,
    LandingPageDomain,
    LandingPageLifecycleError,
)


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole = UserRole.OWNER) -> AuthenticatedIdentity:
    now = datetime.now(timezone.utc)
    company = Company(
        id=uuid4(),
        name="Empresa Teste",
        slug=f"empresa-{uuid4()}",
        status=CompanyStatus.ACTIVE,
        timezone="America/Sao_Paulo",
        created_at=now,
        updated_at=now,
    )
    user = User(
        id=uuid4(),
        company_id=company.id,
        name="Pessoa Teste",
        email=f"{uuid4()}@example.com",
        password_hash="hash-seguro-de-teste",
        role=role,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    user.company = company
    return AuthenticatedIdentity(
        user=user,
        company=company,
        role=role,
        permissions=permissions_for_role(role),
    )


def make_landing_page(
    identity: AuthenticatedIdentity,
    **values,
) -> LandingPage:
    now = datetime.now(timezone.utc)
    defaults = {
        "id": uuid4(),
        "company_id": identity.company.id,
        "name": "Campanha Exemplo",
        "slug": "campanha-exemplo",
        "status": "DRAFT",
        "template": "BLANK",
        "content": {"version": 1, "blocks": []},
        "seo": {"no_index": False},
        "published_at": None,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    defaults.update(values)
    return LandingPage(**defaults)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_openapi_exposes_authenticated_landing_page_contract() -> None:
    paths = {path for path in app.openapi()["paths"] if "/landing-pages" in path}
    assert paths == {
        "/api/v1/landing-pages",
        "/api/v1/landing-pages/{landing_page_id}",
        "/api/v1/landing-pages/{landing_page_id}/publish",
        "/api/v1/landing-pages/{landing_page_id}/unpublish",
        "/api/v1/landing-pages/{landing_page_id}/archive",
    }


async def test_routes_require_authentication(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/landing-pages")).status_code == 401


async def test_role_without_access_is_rejected(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(
        UserRole.VIEWER
    )
    assert (await client.get("/api/v1/landing-pages")).status_code == 403


async def test_sales_can_list_landing_pages(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity(UserRole.SALES)
    app.dependency_overrides[get_current_user] = lambda: identity
    listing = MagicMock(
        return_value=LandingPageListResponse(
            items=[], total=0, page=1, page_size=20
        )
    )
    monkeypatch.setattr(LandingPageDomain, "list", listing)

    response = await client.get("/api/v1/landing-pages?status=DRAFT")

    assert response.status_code == 200
    assert listing.call_args.kwargs["status"].value == "DRAFT"


def test_create_derives_tenant_and_audits(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    monkeypatch.setattr(
        LandingPageRepository,
        "get_by_slug",
        MagicMock(return_value=None),
    )

    def add(_db, landing_page):
        landing_page.id = uuid4()
        return landing_page

    monkeypatch.setattr(LandingPageRepository, "add", add)
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    db = MagicMock()
    db.refresh.side_effect = lambda _value: None

    result = LandingPageDomain.create(
        db,
        identity,
        LandingPageCreate(
            name="Campanha",
            slug="campanha",
            content={
                "version": 1,
                "blocks": [
                    {"id": str(uuid4()), "type": "TEXT", "body": "Olá"}
                ],
            },
        ),
    )

    assert result.company_id == identity.company.id
    assert result.status == "DRAFT"
    assert result.content["version"] == 1
    assert audit.call_args.kwargs["action"] == "LANDING_PAGE_CREATED"
    db.commit.assert_called_once_with()


def test_create_rejects_duplicate_slug(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    monkeypatch.setattr(
        LandingPageRepository,
        "get_by_slug",
        MagicMock(return_value=make_landing_page(identity)),
    )

    with pytest.raises(LandingPageConflictError, match="slug"):
        LandingPageDomain.create(
            MagicMock(),
            identity,
            LandingPageCreate(name="Campanha", slug="campanha"),
        )


def test_published_page_cannot_be_edited(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    monkeypatch.setattr(
        LandingPageRepository,
        "get_by_id",
        MagicMock(return_value=make_landing_page(identity, status="PUBLISHED")),
    )

    with pytest.raises(LandingPageLifecycleError, match="rascunho"):
        LandingPageDomain.update(
            MagicMock(),
            identity,
            uuid4(),
            LandingPageUpdate(name="Novo nome"),
        )


def test_publish_requires_content(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    monkeypatch.setattr(
        LandingPageRepository,
        "get_by_id",
        MagicMock(return_value=make_landing_page(identity)),
    )

    with pytest.raises(LandingPageLifecycleError, match="ao menos um bloco"):
        LandingPageDomain.publish(MagicMock(), identity, uuid4())


def test_publish_and_unpublish_are_audited(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    landing_page = make_landing_page(
        identity,
        content={
            "version": 1,
            "blocks": [{"id": str(uuid4()), "type": "TEXT", "body": "Olá"}],
        },
    )
    monkeypatch.setattr(
        LandingPageRepository,
        "get_by_id",
        MagicMock(return_value=landing_page),
    )
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    db = MagicMock()

    LandingPageDomain.publish(db, identity, landing_page.id)
    assert landing_page.status == "PUBLISHED"
    assert landing_page.published_at is not None

    LandingPageDomain.unpublish(db, identity, landing_page.id)
    assert landing_page.status == "DRAFT"
    assert landing_page.published_at is None
    assert [call.kwargs["action"] for call in audit.call_args_list] == [
        "LANDING_PAGE_PUBLISHED",
        "LANDING_PAGE_UNPUBLISHED",
    ]


def test_published_page_cannot_be_deleted(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    monkeypatch.setattr(
        LandingPageRepository,
        "get_by_id",
        MagicMock(return_value=make_landing_page(identity, status="PUBLISHED")),
    )

    with pytest.raises(LandingPageLifecycleError, match="Despublique"):
        LandingPageDomain.soft_delete(MagicMock(), identity, uuid4())


def test_landing_page_audit_metadata_is_allowlisted() -> None:
    assert sanitize_audit_metadata(
        "LANDING_PAGE_CREATED",
        {"status": "DRAFT", "template": "BLANK", "content": "secret"},
    ) == {"status": "DRAFT", "template": "BLANK"}
    assert sanitize_audit_metadata(
        "LANDING_PAGE_UPDATED",
        {"fields": ["name"], "payload": "secret"},
    ) == {"fields": ["name"]}
