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
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.schemas.audit_log import AuditLogListResponse
from app.services.audit_log import AuditLogService, sanitize_audit_metadata


pytestmark = pytest.mark.anyio
FORBIDDEN_METADATA_KEYS = {
    "password", "password_hash", "token", "token_hash", "authorization",
    "cookie", "jwt", "secret", "api_key", "database_url",
}


def make_identity(role: UserRole) -> AuthenticatedIdentity:
    company = Company(id=uuid4(), name="Empresa Teste", slug=str(uuid4()), status=CompanyStatus.ACTIVE)
    user = User(
        id=uuid4(), company_id=company.id, name="Pessoa Teste",
        email=f"{uuid4()}@example.com", password_hash="hash-seguro-de-teste",
        role=role, is_active=True, created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    user.company = company
    return AuthenticatedIdentity(user=user, company=company, role=role, permissions=permissions_for_role(role))


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.ADMIN])
async def test_administrators_can_list_audit_logs(client: AsyncClient, role: UserRole, monkeypatch: pytest.MonkeyPatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(role)
    monkeypatch.setattr(AuditLogService, "list_logs", lambda *_args, **_kwargs: AuditLogListResponse(items=[], total=0, page=1, page_size=20))
    response = await client.get("/api/v1/audit-logs")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "page": 1, "page_size": 20}


async def test_viewer_cannot_list_audit_logs(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.VIEWER)
    assert (await client.get("/api/v1/audit-logs")).status_code == 403


async def test_unauthenticated_request_is_rejected(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/audit-logs")).status_code == 401


@pytest.mark.parametrize("query", ["page=0", "page_size=0", "page_size=101", "actor_user_id=invalid", "from=2026-02-01T00:00:00", "from=2026-02-01T00:00:00Z&to=2025-01-01T00:00:00Z", "from=2024-01-01T00:00:00Z&to=2026-01-02T00:00:00Z"])
async def test_invalid_filters_return_422(client: AsyncClient, query: str) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.OWNER)
    assert (await client.get(f"/api/v1/audit-logs?{query}")).status_code == 422


def test_service_scopes_repository_to_authenticated_tenant(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(UserRole.OWNER)
    repository = MagicMock(return_value=([], 0))
    monkeypatch.setattr(AuditLogRepository, "list_by_company", repository)
    result = AuditLogService.list_logs(
        MagicMock(), identity, page=2, page_size=10, search=None, action="USER_UPDATED",
        actor_user_id=None, target_type=None, target_id=None,
        occurred_from=None, occurred_to=None,
    )
    assert result.total == 0
    assert repository.call_args.args[1] == identity.company.id
    assert "company_id" not in repository.call_args.kwargs


def test_actor_can_be_null_and_metadata_is_sanitized(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(UserRole.OWNER)
    event = AuditLog(
        id=uuid4(), company_id=identity.company.id, actor_user_id=None,
        target_type="USER", target_id=uuid4(), action="USER_ROLE_CHANGED",
        details={"from": "VIEWER", "to": "ADMIN", "token": "proibido"},
        occurred_at=datetime.now(timezone.utc),
    )
    monkeypatch.setattr(AuditLogRepository, "list_by_company", lambda *_args, **_kwargs: ([(event, None)], 1))
    result = AuditLogService.list_logs(
        MagicMock(), identity, page=1, page_size=20, search=None, action=None,
        actor_user_id=None, target_type=None, target_id=None,
        occurred_from=None, occurred_to=None,
    )
    assert result.items[0].actor is None
    assert result.items[0].metadata == {"from": "VIEWER", "to": "ADMIN"}


def test_all_supported_event_metadata_excludes_forbidden_keys() -> None:
    unsafe = {key: "sensitive" for key in FORBIDDEN_METADATA_KEYS}
    safe_samples = {
        "USER_UPDATED": {"fields": ["name"]},
        "USER_ROLE_CHANGED": {"from": "VIEWER", "to": "ADMIN"},
        "USER_BLOCKED": {"from": True, "to": False},
        "USER_REACTIVATED": {"from": False, "to": True},
        "USER_SOFT_DELETED": {"is_active": False},
        "USER_INVITED": {"role": "VIEWER", "delivery": "PENDING"},
        "USER_INVITATION_DELIVERY_FAILED": {"state": "FAILED"},
        "USER_INVITATION_REVOKED": {"state": "REVOKED"},
        "USER_INVITATION_ACCEPTED": {"user_id": str(uuid4()), "role": "VIEWER"},
        "PASSWORD_CHANGED": {}, "PASSWORD_RESET_REQUESTED": {}, "PASSWORD_RESET_COMPLETED": {},
        "ROLE_PERMISSIONS_CHANGED": {
            "role": "VIEWER",
            "enabled": ["CRM/VIEW"],
            "revoked": ["DASHBOARD/VIEW"],
        },
        "ROLE_PERMISSIONS_RESET": {"role": "VIEWER"},
    }
    for action, sample in safe_samples.items():
        metadata = sanitize_audit_metadata(action, {**sample, **unsafe})
        assert not ({key.lower() for key in metadata} & FORBIDDEN_METADATA_KEYS)


def test_permission_event_metadata_keeps_only_safe_delta() -> None:
    metadata = sanitize_audit_metadata(
        "ROLE_PERMISSIONS_CHANGED",
        {
            "role": "VIEWER",
            "enabled": ["CRM/VIEW"],
            "revoked": ["DASHBOARD/VIEW"],
            "token": "proibido",
        },
    )
    assert metadata == {
        "role": "VIEWER",
        "enabled": ["CRM/VIEW"],
        "revoked": ["DASHBOARD/VIEW"],
    }


def test_audit_routes_are_append_only() -> None:
    operations = app.openapi()["paths"]["/api/v1/audit-logs"]
    assert set(operations) == {"get"}
