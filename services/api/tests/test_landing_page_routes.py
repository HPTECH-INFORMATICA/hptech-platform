from collections.abc import AsyncIterator
from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects import postgresql

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
    PublicLandingPageResponse,
    PublicLandingPageSubmission,
    LandingPageUpdate,
)
from app.services.audit_log import sanitize_audit_metadata
from app.services.landing_page import (
    LandingPageConflictError,
    LandingPageDomain,
    LandingPageLifecycleError,
    LandingPageNotFoundError,
    LandingPageSubmissionUnavailableError,
)
from app.services.landing_page_submission_limit import (
    LandingPageSubmissionRateLimitExceeded,
    LandingPageSubmissionRateLimiter,
)
from app.services.lead import LeadService


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
        "/api/v1/public/landing-pages/{company_slug}/{landing_page_slug}",
        "/api/v1/public/landing-pages/{company_slug}/{landing_page_slug}/submissions",
    }


async def test_public_route_does_not_require_authentication(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    landing_page = make_landing_page(
        identity,
        status="PUBLISHED",
        published_at=datetime.now(timezone.utc),
        content={
            "version": 1,
            "blocks": [{"id": str(uuid4()), "type": "TEXT", "body": "Olá"}],
        },
    )
    response_data = PublicLandingPageResponse(
        name=landing_page.name,
        slug=landing_page.slug,
        template=landing_page.template,
        content=landing_page.content,
        seo=landing_page.seo,
        published_at=landing_page.published_at,
        company={"name": identity.company.name, "slug": identity.company.slug},
    )
    public_detail = MagicMock(return_value=response_data)
    monkeypatch.setattr(LandingPageDomain, "public_detail", public_detail)

    response = await client.get(
        f"/api/v1/public/landing-pages/{identity.company.slug}/{landing_page.slug}"
    )

    assert response.status_code == 200
    assert response.json()["company"] == {
        "name": identity.company.name,
        "slug": identity.company.slug,
    }
    assert response.headers["cache-control"] == (
        "public, max-age=60, stale-while-revalidate=300"
    )
    public_detail.assert_called_once()


async def test_public_route_hides_unavailable_pages(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        LandingPageDomain,
        "public_detail",
        MagicMock(side_effect=LandingPageNotFoundError),
    )

    response = await client.get(
        "/api/v1/public/landing-pages/empresa-exemplo/pagina-exemplo"
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Landing page não encontrada."}


async def test_public_submission_accepts_valid_contact_without_authentication(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    ensure_allowed = MagicMock()
    record_attempt = MagicMock()
    public_submit = MagicMock(return_value=True)
    monkeypatch.setattr(
        LandingPageSubmissionRateLimiter,
        "ensure_allowed",
        ensure_allowed,
    )
    monkeypatch.setattr(
        LandingPageSubmissionRateLimiter,
        "record_attempt",
        record_attempt,
    )
    monkeypatch.setattr(LandingPageDomain, "public_submit", public_submit)

    response = await client.post(
        "/api/v1/public/landing-pages/empresa-exemplo/pagina-exemplo/submissions",
        json={
            "name": "Pessoa Exemplo",
            "email": "PESSOA@EXAMPLE.COM",
            "privacy_consent": True,
        },
    )

    assert response.status_code == 202
    assert response.json() == {
        "accepted": True,
        "message": "Recebemos seus dados.",
    }
    ensure_allowed.assert_called_once()
    record_attempt.assert_called_once()
    submitted = public_submit.call_args.args[3]
    assert submitted.email == "pessoa@example.com"
    db.commit.assert_called_once_with()


async def test_public_submission_requires_consent_and_contact_channel(
    client: AsyncClient,
) -> None:
    endpoint = (
        "/api/v1/public/landing-pages/empresa-exemplo/"
        "pagina-exemplo/submissions"
    )

    missing_consent = await client.post(
        endpoint,
        json={"name": "Pessoa Exemplo", "email": "pessoa@example.com"},
    )
    missing_contact = await client.post(
        endpoint,
        json={"name": "Pessoa Exemplo", "privacy_consent": True},
    )

    assert missing_consent.status_code == 422
    assert missing_contact.status_code == 422


async def test_public_submission_returns_retry_after_when_limited(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    record_attempt = MagicMock()
    public_submit = MagicMock()
    monkeypatch.setattr(
        LandingPageSubmissionRateLimiter,
        "ensure_allowed",
        MagicMock(side_effect=LandingPageSubmissionRateLimitExceeded(73)),
    )
    monkeypatch.setattr(
        LandingPageSubmissionRateLimiter,
        "record_attempt",
        record_attempt,
    )
    monkeypatch.setattr(LandingPageDomain, "public_submit", public_submit)

    response = await client.post(
        "/api/v1/public/landing-pages/empresa-exemplo/pagina-exemplo/submissions",
        json={
            "name": "Pessoa Exemplo",
            "phone": "+5511999999999",
            "privacy_consent": True,
        },
    )

    assert response.status_code == 429
    assert response.headers["retry-after"] == "73"
    record_attempt.assert_not_called()
    public_submit.assert_not_called()


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


def test_public_detail_returns_only_public_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    landing_page = make_landing_page(
        identity,
        status="PUBLISHED",
        published_at=datetime.now(timezone.utc),
    )
    monkeypatch.setattr(
        LandingPageRepository,
        "get_published_by_public_slug",
        MagicMock(return_value=(landing_page, identity.company)),
    )

    result = LandingPageDomain.public_detail(
        MagicMock(),
        identity.company.slug,
        landing_page.slug,
    )

    assert result.company.slug == identity.company.slug
    assert result.slug == landing_page.slug
    assert "id" not in result.model_dump()
    assert "company_id" not in result.model_dump()


def test_public_submission_derives_tenant_and_audits_without_pii(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    landing_page = make_landing_page(
        identity,
        status="PUBLISHED",
        published_at=datetime.now(timezone.utc),
        content={
            "version": 1,
            "blocks": [{"id": str(uuid4()), "type": "CONTACT"}],
        },
    )
    monkeypatch.setattr(
        LandingPageRepository,
        "get_published_by_public_slug",
        MagicMock(return_value=(landing_page, identity.company)),
    )
    lead_id = uuid4()
    create_lead = MagicMock(return_value=MagicMock(id=lead_id))
    audit = MagicMock()
    monkeypatch.setattr(LeadService, "create", create_lead)
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    submission = PublicLandingPageSubmission(
        name="Pessoa Exemplo",
        email="pessoa@example.com",
        privacy_consent=True,
    )

    created = LandingPageDomain.public_submit(
        MagicMock(),
        identity.company.slug,
        landing_page.slug,
        submission,
    )

    assert created is True
    assert create_lead.call_args.args[1] == identity.company.id
    assert create_lead.call_args.args[3] is None
    lead_data = create_lead.call_args.args[2]
    assert lead_data.source == "Landing Page"
    assert lead_data.email == "pessoa@example.com"
    assert audit.call_args.kwargs == {
        "company_id": identity.company.id,
        "actor_user_id": None,
        "target_type": "LEAD",
        "target_id": lead_id,
        "action": "LANDING_PAGE_LEAD_CAPTURED",
        "details": {"landing_page_id": str(landing_page.id)},
    }
    assert sanitize_audit_metadata(
        "LANDING_PAGE_LEAD_CAPTURED",
        {
            "landing_page_id": str(landing_page.id),
            "email": "pessoa@example.com",
        },
    ) == {"landing_page_id": str(landing_page.id)}


def test_public_submission_honeypot_does_not_create_lead(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    landing_page = make_landing_page(
        identity,
        status="PUBLISHED",
        published_at=datetime.now(timezone.utc),
        content={
            "version": 1,
            "blocks": [{"id": str(uuid4()), "type": "CONTACT"}],
        },
    )
    monkeypatch.setattr(
        LandingPageRepository,
        "get_published_by_public_slug",
        MagicMock(return_value=(landing_page, identity.company)),
    )
    create_lead = MagicMock()
    monkeypatch.setattr(LeadService, "create", create_lead)

    created = LandingPageDomain.public_submit(
        MagicMock(),
        identity.company.slug,
        landing_page.slug,
        PublicLandingPageSubmission(
            name="Bot Example",
            privacy_consent=True,
            website="https://spam.example",
        ),
    )

    assert created is False
    create_lead.assert_not_called()


def test_public_submission_requires_contact_block(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    landing_page = make_landing_page(
        identity,
        status="PUBLISHED",
        published_at=datetime.now(timezone.utc),
    )
    monkeypatch.setattr(
        LandingPageRepository,
        "get_published_by_public_slug",
        MagicMock(return_value=(landing_page, identity.company)),
    )

    with pytest.raises(LandingPageSubmissionUnavailableError):
        LandingPageDomain.public_submit(
            MagicMock(),
            identity.company.slug,
            landing_page.slug,
            PublicLandingPageSubmission(
                name="Pessoa Exemplo",
                phone="+5511999999999",
                privacy_consent=True,
            ),
        )


def test_public_repository_query_enforces_publication_and_company_state() -> None:
    db = MagicMock()
    db.execute.return_value.one_or_none.return_value = None

    LandingPageRepository.get_published_by_public_slug(
        db,
        "empresa-exemplo",
        "pagina-exemplo",
    )

    statement = db.execute.call_args.args[0]
    sql = str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )
    assert "companies.slug = 'empresa-exemplo'" in sql
    assert "companies.status IN ('ACTIVE', 'TRIAL')" in sql
    assert "companies.deleted_at IS NULL" in sql
    assert "landing_pages.slug = 'pagina-exemplo'" in sql
    assert "landing_pages.status = 'PUBLISHED'" in sql
    assert "landing_pages.published_at IS NOT NULL" in sql
    assert "landing_pages.deleted_at IS NULL" in sql
