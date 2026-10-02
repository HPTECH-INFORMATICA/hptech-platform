from collections.abc import AsyncIterator
from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import IntegrityError

from app.core.identity import AuthenticatedIdentity, CompanyStatus, UserRole
from app.core.rbac import permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.company import CompanyRepository
from app.schemas.company import CompanyUpdate
from app.services.company import CompanyConflictError, CompanyService


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole, *, company_id=None) -> AuthenticatedIdentity:
    now = datetime.now(timezone.utc)
    company = Company(
        id=company_id or uuid4(),
        name="Empresa Teste",
        legal_name="Empresa Teste Ltda",
        document="DOC-TESTE",
        email="contato@example.com",
        phone="(11) 99999-0000",
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


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.ADMIN])
async def test_owner_and_admin_can_get_company(
    client: AsyncClient,
    role: UserRole,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity(role)
    app.dependency_overrides[get_current_user] = lambda: identity
    monkeypatch.setattr(CompanyService, "detail", lambda *_args: identity.company)

    response = await client.get("/api/v1/company")

    assert response.status_code == 200
    assert response.json()["id"] == str(identity.company.id)
    assert response.json()["slug"] == identity.company.slug
    assert response.json()["timezone"] == "America/Sao_Paulo"


async def test_viewer_cannot_get_or_update_company(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.VIEWER)
    assert (await client.get("/api/v1/company")).status_code == 403
    assert (
        await client.patch("/api/v1/company", json={"name": "Outro nome"})
    ).status_code == 403


async def test_unauthenticated_company_requests_return_401(
    client: AsyncClient,
) -> None:
    assert (await client.get("/api/v1/company")).status_code == 401
    assert (
        await client.patch("/api/v1/company", json={"name": "Outro nome"})
    ).status_code == 401


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"name": ""},
        {"status": "ACTIVE"},
        {"slug": "outro-slug"},
        {"company_id": "00000000-0000-0000-0000-000000000000"},
        {"timezone": None},
        {"timezone": ""},
        {"timezone": "GMT-3"},
        {"timezone": "BRT"},
        {"timezone": "-03:00"},
        {"timezone": "america/sao_paulo"},
        {"timezone": "Area/Inexistente"},
        {"unknown": "value"},
    ],
)
async def test_invalid_or_protected_fields_return_422(
    client: AsyncClient,
    payload: dict[str, object],
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.OWNER)
    response = await client.patch("/api/v1/company", json=payload)
    assert response.status_code == 422


async def test_valid_update_uses_authenticated_company(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity(UserRole.OWNER)
    app.dependency_overrides[get_current_user] = lambda: identity
    observed: list[tuple[object, CompanyUpdate]] = []

    def update(_db, received_identity, data):
        observed.append((received_identity, data))
        identity.company.phone = data.phone
        return identity.company

    monkeypatch.setattr(CompanyService, "update", update)
    monkeypatch.setattr(CompanyService, "commit", lambda _db: None)

    response = await client.patch(
        "/api/v1/company",
        json={"phone": " (11) 98888-7777 "},
    )

    assert response.status_code == 200
    assert observed[0][0] is identity
    assert observed[0][1].phone == "(11) 98888-7777"


def test_service_scopes_update_and_audit_to_authenticated_tenant(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity(UserRole.OWNER)
    company_b_id = uuid4()
    repository = MagicMock(return_value=identity.company)
    audit = MagicMock()
    monkeypatch.setattr(CompanyRepository, "get_by_id", repository)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    result = CompanyService.update(
        MagicMock(),
        identity,
        CompanyUpdate(phone="(11) 97777-6666"),
    )

    assert result.id != company_b_id
    assert repository.call_args.args[1] == identity.company.id
    assert repository.call_args.kwargs == {"for_update": True}
    assert audit.call_args.kwargs["company_id"] == identity.company.id
    assert audit.call_args.kwargs["target_id"] == identity.company.id
    assert audit.call_args.kwargs["details"] == {"fields": ["phone"]}


def test_no_op_does_not_create_audit_event(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity(UserRole.OWNER)
    monkeypatch.setattr(
        CompanyRepository,
        "get_by_id",
        lambda *_args, **_kwargs: identity.company,
    )
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    result = CompanyService.update(
        MagicMock(),
        identity,
        CompanyUpdate(timezone=identity.company.timezone),
    )

    assert result is identity.company
    audit.assert_not_called()


@pytest.mark.parametrize(
    "timezone_name",
    ["America/Sao_Paulo", "America/Manaus", "Europe/Lisbon"],
)
def test_company_update_accepts_iana_timezone(timezone_name: str) -> None:
    assert CompanyUpdate(timezone=timezone_name).timezone == timezone_name


def test_company_update_trims_timezone_without_changing_case() -> None:
    data = CompanyUpdate(timezone="  America/Sao_Paulo  ")
    assert data.timezone == "America/Sao_Paulo"


def test_timezone_change_uses_existing_sanitized_audit_event(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity(UserRole.OWNER)
    monkeypatch.setattr(
        CompanyRepository,
        "get_by_id",
        lambda *_args, **_kwargs: identity.company,
    )
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    result = CompanyService.update(
        MagicMock(),
        identity,
        CompanyUpdate(timezone="America/Manaus"),
    )

    assert result.timezone == "America/Manaus"
    assert audit.call_args.kwargs["details"] == {"fields": ["timezone"]}
    assert set(audit.call_args.kwargs["details"]) == {"fields"}


def test_company_update_normalizes_safe_fields() -> None:
    data = CompanyUpdate(
        name="  Empresa Nova  ",
        legal_name="  Empresa Nova Ltda  ",
        document="  DOC-123  ",
        email="  CONTATO@EXAMPLE.COM  ",
        phone="  (11) 96666-5555  ",
        primary_unit_name="  Unidade Centro  ",
        address_line="  Rua das Flores, 100  ",
        address_complement="  Sala 12  ",
        address_district="  Centro  ",
        address_city="  Curitiba  ",
        address_state="  PR  ",
        address_postal_code="  80000-000  ",
        timezone="  America/Sao_Paulo  ",
    )
    assert data.model_dump() == {
        "name": "Empresa Nova",
        "legal_name": "Empresa Nova Ltda",
        "document": "DOC-123",
        "email": "contato@example.com",
        "phone": "(11) 96666-5555",
        "primary_unit_name": "Unidade Centro",
        "address_line": "Rua das Flores, 100",
        "address_complement": "Sala 12",
        "address_district": "Centro",
        "address_city": "Curitiba",
        "address_state": "PR",
        "address_postal_code": "80000-000",
        "timezone": "America/Sao_Paulo",
    }


def test_commit_rolls_back_on_integrity_error() -> None:
    db = MagicMock()
    db.commit.side_effect = IntegrityError("statement", {}, Exception("duplicate"))
    with pytest.raises(CompanyConflictError):
        CompanyService.commit(db)
    db.rollback.assert_called_once()


def test_company_routes_never_accept_company_id_path() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/company" in paths
    assert not any(path.startswith("/api/v1/company/") for path in paths)
