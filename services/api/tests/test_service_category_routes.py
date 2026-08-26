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
from app.models.service_category import ServiceCategory
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.service_category import ServiceCategoryRepository
from app.schemas.service_category import ServiceCategoryCreate, ServiceCategoryStatusUpdate, ServiceCategoryUpdate
from app.services.service_category import ServiceCategoryDomain, ServiceCategoryNotFoundError


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole = UserRole.OWNER) -> AuthenticatedIdentity:
    now = datetime.now(timezone.utc)
    company = Company(id=uuid4(), name="Empresa Teste", slug=f"empresa-{uuid4()}", status=CompanyStatus.ACTIVE, created_at=now, updated_at=now)
    user = User(id=uuid4(), company_id=company.id, name="Pessoa Teste", email=f"{uuid4()}@example.com", password_hash="hash-seguro-de-teste", role=role, is_active=True, created_at=now, updated_at=now)
    user.company = company
    return AuthenticatedIdentity(user=user, company=company, role=role, permissions=permissions_for_role(role))


def make_category(identity: AuthenticatedIdentity, **values) -> ServiceCategory:
    now = datetime.now(timezone.utc)
    defaults = {"id": uuid4(), "company_id": identity.company.id, "name": "Capilar", "description": None, "is_active": True, "created_at": now, "updated_at": now, "deleted_at": None}
    defaults.update(values)
    return ServiceCategory(**defaults)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as value:
        yield value
    app.dependency_overrides.clear()


async def test_categories_require_authentication(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/service-categories")).status_code == 401


async def test_viewer_cannot_view_categories(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.VIEWER)
    assert (await client.get("/api/v1/service-categories")).status_code == 403


@pytest.mark.parametrize("extra", ["id", "company_id", "is_active", "created_at", "updated_at", "deleted_at", "tenant", "role", "permissions", "auth_version"])
async def test_create_rejects_mass_assignment(client: AsyncClient, extra: str) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity()
    assert (await client.post("/api/v1/service-categories", json={"name": "Capilar", extra: "forbidden"})).status_code == 422


def test_schema_normalizes_name_and_description() -> None:
    data = ServiceCategoryCreate(name="  Saúde   Capilar ", description="  ")
    assert data.name == "Saúde Capilar"
    assert data.description is None


def test_create_is_tenant_scoped_and_audited(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    category = make_category(identity)
    repository = MagicMock(return_value=category)
    audit = MagicMock()
    db = MagicMock()
    monkeypatch.setattr(ServiceCategoryRepository, "create", repository)
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    assert ServiceCategoryDomain.create(db, identity, ServiceCategoryCreate(name="Capilar")) is category
    assert repository.call_args.args[1] == identity.company.id
    assert audit.call_args.kwargs["action"] == "SERVICE_CATEGORY_CREATED"
    assert audit.call_args.kwargs["details"] == {"state": "ACTIVE"}


def test_cross_tenant_category_is_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    tenant_a = make_identity()
    tenant_b = make_identity()
    category = make_category(tenant_a)
    monkeypatch.setattr(ServiceCategoryRepository, "get_by_id", lambda _db, company_id, category_id, **_kwargs: category if company_id == tenant_a.company.id and category_id == category.id else None)
    with pytest.raises(ServiceCategoryNotFoundError):
        ServiceCategoryDomain.detail(MagicMock(), tenant_b, category.id)
    with pytest.raises(ServiceCategoryNotFoundError):
        ServiceCategoryDomain.update(MagicMock(), tenant_b, category.id, ServiceCategoryUpdate(name="Outro"))


def test_update_no_op_does_not_audit_or_commit(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    category = make_category(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(ServiceCategoryRepository, "get_by_id", lambda *_args, **_kwargs: category)
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    assert ServiceCategoryDomain.update(db, identity, category.id, ServiceCategoryUpdate(name=category.name)) is category
    audit.assert_not_called()
    db.commit.assert_not_called()


def test_status_and_soft_delete_preserve_category(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    category = make_category(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(ServiceCategoryRepository, "get_by_id", lambda *_args, **_kwargs: category)
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    ServiceCategoryDomain.change_status(db, identity, category.id, ServiceCategoryStatusUpdate(is_active=False))
    assert category.is_active is False
    assert audit.call_args.kwargs["details"] == {"from": "ACTIVE", "to": "INACTIVE"}
    ServiceCategoryDomain.soft_delete(db, identity, category.id)
    assert category.deleted_at is not None
    assert category.is_active is False
    db.delete.assert_not_called()


def test_repository_contract_is_tenant_scoped_and_excludes_deleted() -> None:
    db = MagicMock()
    db.scalar.return_value = 0
    db.execute.return_value.scalars.return_value.all.return_value = []
    ServiceCategoryRepository.list_by_company(db, uuid4(), page=1, page_size=20, search="capilar", is_active=True)
    statements = [str(call.args[0]) for call in (db.scalar.call_args, db.execute.call_args)]
    assert all("service_categories.company_id" in statement for statement in statements)
    assert all("service_categories.deleted_at IS NULL" in statement for statement in statements)
