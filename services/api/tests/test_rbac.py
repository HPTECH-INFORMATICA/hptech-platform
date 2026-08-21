import pytest

from app.core.identity import PermissionAction, PermissionModule, UserRole
from app.core.rbac import has_permission, permissions_for_role


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.ADMIN])
def test_owner_and_admin_have_full_crm_access(role: UserRole) -> None:
    permissions = permissions_for_role(role)

    for action in (
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
    ):
        assert has_permission(permissions, PermissionModule.CRM, action)

    assert not has_permission(
        permissions, PermissionModule.CRM, PermissionAction.BLOCK
    )
    assert not has_permission(
        permissions, PermissionModule.CRM, PermissionAction.MANAGE_ROLE
    )


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.ADMIN])
def test_owner_and_admin_have_user_administration_access(role: UserRole) -> None:
    permissions = permissions_for_role(role)

    for action in (
        PermissionAction.VIEW,
        PermissionAction.UPDATE,
        PermissionAction.BLOCK,
        PermissionAction.MANAGE_ROLE,
        PermissionAction.DELETE,
    ):
        assert has_permission(permissions, PermissionModule.USERS, action)

    assert not has_permission(
        permissions, PermissionModule.USERS, PermissionAction.CREATE
    )


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.ADMIN])
def test_owner_and_admin_can_view_company_administration(role: UserRole) -> None:
    assert has_permission(
        permissions_for_role(role),
        PermissionModule.COMPANY,
        PermissionAction.VIEW,
    )


@pytest.mark.parametrize(
    "role",
    [
        UserRole.MANAGER,
        UserRole.PROFESSIONAL,
        UserRole.RECEPTIONIST,
        UserRole.SALES,
        UserRole.FINANCIAL,
        UserRole.VIEWER,
    ],
)
def test_non_administrative_roles_cannot_view_company_administration(
    role: UserRole,
) -> None:
    assert not has_permission(
        permissions_for_role(role),
        PermissionModule.COMPANY,
        PermissionAction.VIEW,
    )


@pytest.mark.parametrize(
    "role",
    [UserRole.MANAGER, UserRole.SALES, UserRole.RECEPTIONIST],
)
def test_operational_roles_cannot_delete_crm(role: UserRole) -> None:
    permissions = permissions_for_role(role)

    assert has_permission(permissions, PermissionModule.CRM, PermissionAction.VIEW)
    assert has_permission(permissions, PermissionModule.CRM, PermissionAction.CREATE)
    assert has_permission(permissions, PermissionModule.CRM, PermissionAction.UPDATE)
    assert not has_permission(
        permissions,
        PermissionModule.CRM,
        PermissionAction.DELETE,
    )


@pytest.mark.parametrize(
    "role",
    [UserRole.PROFESSIONAL, UserRole.FINANCIAL, UserRole.VIEWER],
)
def test_read_only_roles_only_view_crm(role: UserRole) -> None:
    permissions = permissions_for_role(role)

    assert has_permission(permissions, PermissionModule.DASHBOARD, PermissionAction.VIEW)
    assert has_permission(permissions, PermissionModule.CRM, PermissionAction.VIEW)
    assert not has_permission(permissions, PermissionModule.CRM, PermissionAction.CREATE)
    assert not has_permission(permissions, PermissionModule.CRM, PermissionAction.UPDATE)
    assert not has_permission(permissions, PermissionModule.CRM, PermissionAction.DELETE)
