from collections.abc import AsyncIterator
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import SQLAlchemyError

from app.core.identity import AuthenticatedIdentity, CompanyStatus, UserRole
from app.core.rbac import permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.service import Service
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.service import ServiceRepository
from app.repositories.service_category import ServiceCategoryRepository
from app.schemas.service import (
    SERVICE_MAX_DURATION_MINUTES,
    ServiceCreate,
    ServiceListResponse,
    ServiceStatusUpdate,
    ServiceUpdate,
)
from app.services.service import (
    ServiceDomain,
    ServiceCategoryUnavailableError,
    ServiceNotFoundError,
    ServicePersistenceError,
)


pytestmark = pytest.mark.anyio


def make_identity(
    role: UserRole = UserRole.OWNER,
    *,
    company_id=None,
) -> AuthenticatedIdentity:
    now = datetime.now(timezone.utc)
    company = Company(
        id=company_id or uuid4(),
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


def make_service(identity: AuthenticatedIdentity, **values) -> Service:
    now = datetime.now(timezone.utc)
    defaults = {
        "id": uuid4(),
        "company_id": identity.company.id,
        "name": "Consulta inicial",
        "description": None,
        "duration_minutes": 60,
        "price": Decimal("100.00"),
        "category_id": None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    defaults.update(values)
    return Service(**defaults)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


async def test_services_require_authentication(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/services")).status_code == 401


async def test_role_without_view_permission_is_rejected(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.VIEWER)
    assert (await client.get("/api/v1/services")).status_code == 403


async def test_receptionist_can_list_services(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity(UserRole.RECEPTIONIST)
    app.dependency_overrides[get_current_user] = lambda: identity
    observed: list[dict[str, object]] = []

    def list_services(_db, received_identity, **filters):
        assert received_identity is identity
        observed.append(filters)
        return ServiceListResponse(items=[], total=0, page=2, page_size=10)

    monkeypatch.setattr(ServiceDomain, "list", list_services)
    response = await client.get(
        "/api/v1/services?page=2&page_size=10&search=consulta&is_active=true"
    )
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "page": 2, "page_size": 10}
    assert observed == [
        {
            "page": 2,
            "page_size": 10,
            "search": "consulta",
            "is_active": True,
            "category_id": None,
        }
    ]


@pytest.mark.parametrize(
    "query",
    ["page=0", "page_size=0", "page_size=101"],
)
async def test_list_rejects_invalid_pagination(
    client: AsyncClient,
    query: str,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.OWNER)
    assert (await client.get(f"/api/v1/services?{query}")).status_code == 422


@pytest.mark.parametrize(
    "extra",
    [
        "company_id",
        "id",
        "created_at",
        "updated_at",
        "deleted_at",
        "permissions",
        "role",
        "tenant",
        "auth_version",
        "is_active",
        "category",
    ],
)
async def test_create_rejects_mass_assignment(
    client: AsyncClient,
    extra: str,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.OWNER)
    payload = {
        "name": "Consulta",
        "duration_minutes": 60,
        "price": "100.00",
        extra: "forbidden",
    }
    assert (await client.post("/api/v1/services", json=payload)).status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "duration_minutes": 60, "price": "0"},
        {"name": "Consulta", "duration_minutes": 0, "price": "0"},
        {
            "name": "Consulta",
            "duration_minutes": SERVICE_MAX_DURATION_MINUTES + 1,
            "price": "0",
        },
        {"name": "Consulta", "duration_minutes": 60, "price": "-0.01"},
        {"name": "Consulta", "duration_minutes": 60, "price": "1.001"},
    ],
)
def test_create_schema_rejects_invalid_domain_values(payload: dict) -> None:
    with pytest.raises(ValueError):
        ServiceCreate.model_validate(payload)


def test_create_schema_normalizes_text_and_decimal() -> None:
    data = ServiceCreate(
        name="  Consulta inicial  ",
        description="   ",
        duration_minutes=60,
        price=Decimal("100.50"),
        category_id=None,
    )
    assert data.name == "Consulta inicial"
    assert data.description is None
    assert data.category_id is None
    assert data.price == Decimal("100.50")


def test_create_is_tenant_scoped_and_audited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    service = make_service(identity)
    repository = MagicMock(return_value=service)
    audit = MagicMock()
    db = MagicMock()
    monkeypatch.setattr(ServiceRepository, "create", repository)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    result = ServiceDomain.create(
        db,
        identity,
        ServiceCreate(name="Consulta", duration_minutes=60, price=Decimal("0")),
    )

    assert result is service
    assert repository.call_args.args[1] == identity.company.id
    assert audit.call_args.kwargs["company_id"] == identity.company.id
    assert audit.call_args.kwargs["action"] == "SERVICE_CREATED"
    db.commit.assert_called_once()


def test_create_rejects_inactive_or_cross_tenant_category(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    category_id = uuid4()
    monkeypatch.setattr(
        ServiceCategoryRepository,
        "get_by_id",
        lambda *_args, **_kwargs: None,
    )

    with pytest.raises(ServiceCategoryUnavailableError):
        ServiceDomain.create(
            MagicMock(),
            identity,
            ServiceCreate(
                name="Consulta",
                duration_minutes=60,
                price=Decimal("100.00"),
                category_id=category_id,
            ),
        )


def test_cross_tenant_detail_update_and_delete_are_not_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant_a = make_identity()
    tenant_b = make_identity()
    service_a = make_service(tenant_a)

    def tenant_scoped(_db, company_id, service_id, **_kwargs):
        if company_id == tenant_a.company.id and service_id == service_a.id:
            return service_a
        return None

    monkeypatch.setattr(ServiceRepository, "get_by_id", tenant_scoped)
    with pytest.raises(ServiceNotFoundError):
        ServiceDomain.detail(MagicMock(), tenant_b, service_a.id)
    with pytest.raises(ServiceNotFoundError):
        ServiceDomain.update(
            MagicMock(),
            tenant_b,
            service_a.id,
            ServiceUpdate(name="Outro"),
        )
    with pytest.raises(ServiceNotFoundError):
        ServiceDomain.soft_delete(MagicMock(), tenant_b, service_a.id)


def test_update_audits_only_changed_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    service = make_service(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(ServiceRepository, "get_by_id", lambda *_args, **_kwargs: service)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    result = ServiceDomain.update(
        db,
        identity,
        service.id,
        ServiceUpdate(name="Consulta revisada", description="  Detalhes  "),
    )

    assert result.name == "Consulta revisada"
    assert result.description == "Detalhes"
    assert audit.call_args.kwargs["details"] == {"fields": ["name", "description"]}
    db.commit.assert_called_once()


def test_update_no_op_does_not_audit_or_commit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    service = make_service(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(ServiceRepository, "get_by_id", lambda *_args, **_kwargs: service)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    assert ServiceDomain.update(
        db,
        identity,
        service.id,
        ServiceUpdate(name=service.name),
    ) is service
    audit.assert_not_called()
    db.commit.assert_not_called()


def test_status_change_and_no_op(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    service = make_service(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(ServiceRepository, "get_by_id", lambda *_args, **_kwargs: service)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    ServiceDomain.change_status(
        db,
        identity,
        service.id,
        ServiceStatusUpdate(is_active=False),
    )
    assert service.is_active is False
    assert audit.call_args.kwargs["details"] == {"from": "ACTIVE", "to": "INACTIVE"}
    db.reset_mock()
    audit.reset_mock()
    ServiceDomain.change_status(
        db,
        identity,
        service.id,
        ServiceStatusUpdate(is_active=False),
    )
    audit.assert_not_called()
    db.commit.assert_not_called()


def test_delete_is_soft_and_preserves_object(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    service = make_service(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(ServiceRepository, "get_by_id", lambda *_args, **_kwargs: service)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    ServiceDomain.soft_delete(db, identity, service.id)

    assert service.deleted_at is not None
    assert service.is_active is False
    assert audit.call_args.kwargs["action"] == "SERVICE_SOFT_DELETED"
    assert audit.call_args.kwargs["details"] == {"state": "DELETED"}
    db.delete.assert_not_called()
    db.commit.assert_called_once()


def test_transaction_rolls_back_on_commit_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    service = make_service(identity)
    db = MagicMock()
    db.commit.side_effect = SQLAlchemyError()
    monkeypatch.setattr(ServiceRepository, "create", lambda *_args: service)
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)

    with pytest.raises(ServicePersistenceError):
        ServiceDomain.create(
            db,
            identity,
            ServiceCreate(name="Consulta", duration_minutes=60, price=Decimal("0")),
        )
    db.rollback.assert_called_once()


def test_repository_contract_excludes_deleted_services() -> None:
    db = MagicMock()
    db.scalar.return_value = 0
    db.execute.return_value.scalars.return_value.all.return_value = []
    ServiceRepository.list_by_company(
        db,
        uuid4(),
        page=1,
        page_size=20,
        search="consulta",
        is_active=True,
        category_id=None,
    )
    statements = [str(call.args[0]) for call in [db.scalar.call_args, db.execute.call_args]]
    assert all("services.deleted_at IS NULL" in statement for statement in statements)
    assert all("services.company_id" in statement for statement in statements)
