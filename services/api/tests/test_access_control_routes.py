from collections.abc import AsyncIterator
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.identity import (
    AuthenticatedIdentity,
    CompanyStatus,
    PermissionAction,
    PermissionModule,
    UserRole,
)
from app.core.rbac import has_permission, permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.role_permission_override import RolePermissionOverrideRepository
from app.schemas.access_control import AccessControlPermissionInput
from app.services.access_control import AccessControlService
from app.services.permissions import effective_permissions


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole, company_id=None) -> AuthenticatedIdentity:
    company = Company(
        id=company_id or uuid4(), name="Empresa Teste", slug=str(uuid4()),
        status=CompanyStatus.ACTIVE,
    )
    user = User(
        id=uuid4(), company_id=company.id, name="Pessoa Teste",
        email=f"{uuid4()}@example.com", password_hash="hash-seguro-de-teste",
        role=role, is_active=True, created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    user.company = company
    return AuthenticatedIdentity(
        user=user, company=company, role=role, permissions=permissions_for_role(role)
    )


@pytest.fixture(autouse=True)
def empty_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(RolePermissionOverrideRepository, "list_for_role", lambda *_args: [])


@pytest.fixture
async def client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    monkeypatch.setattr(RolePermissionOverrideRepository, "replace_role", lambda *_args: None)
    monkeypatch.setattr(RolePermissionOverrideRepository, "reset_role", lambda *_args: 1)
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.ADMIN])
async def test_owner_and_admin_can_view_catalog(client: AsyncClient, role: UserRole) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(role)
    response = await client.get("/api/v1/access-control")
    assert response.status_code == 200
    body = response.json()
    assert [item["role"] for item in body["roles"]] == [item.value for item in UserRole]
    assert body["can_manage"] is (role is UserRole.OWNER)
    assert body["roles"][0]["editable"] is False
    assert all(item["customized"] is False for item in body["roles"])


async def test_viewer_cannot_view_catalog(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.VIEWER)
    assert (await client.get("/api/v1/access-control")).status_code == 403


async def test_unauthenticated_request_is_rejected(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/access-control")).status_code == 401


@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.VIEWER])
async def test_only_owner_can_manage(client: AsyncClient, role: UserRole) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(role)
    response = await client.put(
        "/api/v1/access-control/roles/VIEWER", json={"permissions": []}
    )
    assert response.status_code == 403


async def test_owner_role_is_not_editable(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.OWNER)
    response = await client.put(
        "/api/v1/access-control/roles/OWNER", json={"permissions": []}
    )
    assert response.status_code == 403


@pytest.mark.parametrize(
    "payload",
    [
        {"permissions": [{"module": "UNKNOWN", "action": "VIEW"}]},
        {"permissions": [{"module": "CRM", "action": "UNKNOWN"}]},
        {"permissions": [{"module": "CRM", "action": "BLOCK"}]},
        {"permissions": [{"module": "CRM", "action": "VIEW", "extra": True}]},
        {"permissions": [{"module": "CRM", "action": "VIEW"}, {"module": "CRM", "action": "VIEW"}]},
        {"permissions": [], "extra": True},
    ],
)
async def test_invalid_payload_is_rejected(client: AsyncClient, payload: dict) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.OWNER)
    response = await client.put("/api/v1/access-control/roles/VIEWER", json=payload)
    assert response.status_code == 422


def override(module: PermissionModule, action: PermissionAction, allowed: bool):
    return SimpleNamespace(module=module.value, action=action.value, allowed=allowed)


def test_effective_policy_supports_allow_deny_and_multiple_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        RolePermissionOverrideRepository,
        "list_for_role",
        lambda *_args: [
            override(PermissionModule.CRM, PermissionAction.VIEW, False),
            override(PermissionModule.CRM, PermissionAction.UPDATE, True),
            override(PermissionModule.COMPANY, PermissionAction.VIEW, True),
        ],
    )
    permissions = effective_permissions(MagicMock(), uuid4(), UserRole.VIEWER)
    assert not has_permission(permissions, PermissionModule.CRM, PermissionAction.VIEW)
    assert has_permission(permissions, PermissionModule.CRM, PermissionAction.UPDATE)
    assert has_permission(permissions, PermissionModule.COMPANY, PermissionAction.VIEW)


def test_services_overrides_extend_and_revoke_base_policy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        RolePermissionOverrideRepository,
        "list_for_role",
        lambda *_args: [
            override(PermissionModule.SERVICES, PermissionAction.VIEW, True),
            override(PermissionModule.SERVICES, PermissionAction.UPDATE, False),
        ],
    )
    viewer = effective_permissions(MagicMock(), uuid4(), UserRole.VIEWER)
    manager = effective_permissions(MagicMock(), uuid4(), UserRole.MANAGER)
    assert has_permission(viewer, PermissionModule.SERVICES, PermissionAction.VIEW)
    assert not has_permission(manager, PermissionModule.SERVICES, PermissionAction.UPDATE)


def test_service_category_overrides_use_effective_permissions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        RolePermissionOverrideRepository,
        "list_for_role",
        lambda *_args: [
            override(PermissionModule.SERVICE_CATEGORIES, PermissionAction.VIEW, True),
            override(PermissionModule.SERVICE_CATEGORIES, PermissionAction.UPDATE, False),
        ],
    )
    viewer = effective_permissions(MagicMock(), uuid4(), UserRole.VIEWER)
    manager = effective_permissions(MagicMock(), uuid4(), UserRole.MANAGER)
    assert has_permission(viewer, PermissionModule.SERVICE_CATEGORIES, PermissionAction.VIEW)
    assert not has_permission(manager, PermissionModule.SERVICE_CATEGORIES, PermissionAction.UPDATE)


def test_overrides_are_tenant_scoped(monkeypatch: pytest.MonkeyPatch) -> None:
    tenant_a, tenant_b = uuid4(), uuid4()
    monkeypatch.setattr(
        RolePermissionOverrideRepository,
        "list_for_role",
        lambda _db, company_id, _role: [override(PermissionModule.CRM, PermissionAction.VIEW, False)] if company_id == tenant_a else [],
    )
    assert not has_permission(effective_permissions(MagicMock(), tenant_a, UserRole.VIEWER), PermissionModule.CRM, PermissionAction.VIEW)
    assert has_permission(effective_permissions(MagicMock(), tenant_b, UserRole.VIEWER), PermissionModule.CRM, PermissionAction.VIEW)


def test_owner_policy_and_manage_permission_are_immutable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        RolePermissionOverrideRepository,
        "list_for_role",
        lambda *_args: [
            override(PermissionModule.USERS, PermissionAction.VIEW, False),
            override(PermissionModule.ACCESS_CONTROL, PermissionAction.MANAGE, True),
        ],
    )
    owner = effective_permissions(MagicMock(), uuid4(), UserRole.OWNER)
    admin = effective_permissions(MagicMock(), uuid4(), UserRole.ADMIN)
    assert has_permission(owner, PermissionModule.USERS, PermissionAction.VIEW)
    assert has_permission(owner, PermissionModule.ACCESS_CONTROL, PermissionAction.MANAGE)
    assert not has_permission(admin, PermissionModule.ACCESS_CONTROL, PermissionAction.MANAGE)


def test_change_is_immediate_and_reset_restores_base(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(UserRole.OWNER)
    stored: list = []
    monkeypatch.setattr(RolePermissionOverrideRepository, "list_for_role", lambda *_args: list(stored))
    monkeypatch.setattr(RolePermissionOverrideRepository, "replace_role", lambda _db, _company, _role, values: stored.__setitem__(slice(None), values))
    monkeypatch.setattr(RolePermissionOverrideRepository, "reset_role", lambda *_args: (stored.clear() or 1))
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)
    db = MagicMock()
    before = effective_permissions(db, identity.company.id, UserRole.MANAGER)
    assert has_permission(before, PermissionModule.CRM, PermissionAction.UPDATE)
    desired = [
        AccessControlPermissionInput(module=permission.module, action=action)
        for permission in permissions_for_role(UserRole.MANAGER)
        for action in permission.actions
        if not (permission.module is PermissionModule.CRM and action is PermissionAction.UPDATE)
    ]
    AccessControlService.update_role(db, identity, UserRole.MANAGER, desired)
    after = effective_permissions(db, identity.company.id, UserRole.MANAGER)
    assert not has_permission(after, PermissionModule.CRM, PermissionAction.UPDATE)
    AccessControlService.reset_role(db, identity, UserRole.MANAGER)
    restored = effective_permissions(db, identity.company.id, UserRole.MANAGER)
    assert has_permission(restored, PermissionModule.CRM, PermissionAction.UPDATE)


def test_updates_and_reset_generate_safe_audit_events(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(UserRole.OWNER)
    events: list[dict] = []
    monkeypatch.setattr(RolePermissionOverrideRepository, "replace_role", lambda *_args: None)
    monkeypatch.setattr(RolePermissionOverrideRepository, "reset_role", lambda *_args: 1)
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **kwargs: events.append(kwargs))
    AccessControlService.update_role(MagicMock(), identity, UserRole.VIEWER, [])
    AccessControlService.reset_role(MagicMock(), identity, UserRole.VIEWER)
    assert [event["action"] for event in events] == ["ROLE_PERMISSIONS_CHANGED", "ROLE_PERMISSIONS_RESET"]
    assert events[0]["details"].keys() == {"role", "enabled", "revoked"}
    assert events[1]["details"] == {"role": "VIEWER"}
