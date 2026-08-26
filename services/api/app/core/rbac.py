from app.core.identity import (
    Permission,
    PermissionAction,
    PermissionModule,
    UserRole,
)


VIEW = frozenset({PermissionAction.VIEW})
CRM_WRITE = frozenset(
    {
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
    }
)
CRM_ALL = frozenset({*CRM_WRITE, PermissionAction.DELETE})
COMPANY_ADMIN = Permission(
    PermissionModule.COMPANY,
    frozenset({PermissionAction.VIEW, PermissionAction.UPDATE}),
)
ACCESS_CONTROL_VIEW = Permission(PermissionModule.ACCESS_CONTROL, VIEW)
ACCESS_CONTROL_OWNER = Permission(
    PermissionModule.ACCESS_CONTROL,
    frozenset({PermissionAction.VIEW, PermissionAction.MANAGE}),
)
AUDIT_VIEW = Permission(PermissionModule.AUDIT, VIEW)
SERVICES_ALL = Permission(
    PermissionModule.SERVICES,
    frozenset(
        {
            PermissionAction.VIEW,
            PermissionAction.CREATE,
            PermissionAction.UPDATE,
            PermissionAction.DELETE,
        }
    ),
)
SERVICES_WRITE = Permission(
    PermissionModule.SERVICES,
    frozenset(
        {
            PermissionAction.VIEW,
            PermissionAction.CREATE,
            PermissionAction.UPDATE,
        }
    ),
)
SERVICES_VIEW = Permission(PermissionModule.SERVICES, VIEW)
SERVICE_CATEGORIES_ALL = Permission(
    PermissionModule.SERVICE_CATEGORIES,
    frozenset(
        {
            PermissionAction.VIEW,
            PermissionAction.CREATE,
            PermissionAction.UPDATE,
            PermissionAction.DELETE,
        }
    ),
)
SERVICE_CATEGORIES_WRITE = Permission(
    PermissionModule.SERVICE_CATEGORIES,
    frozenset(
        {
            PermissionAction.VIEW,
            PermissionAction.CREATE,
            PermissionAction.UPDATE,
        }
    ),
)
SERVICE_CATEGORIES_VIEW = Permission(PermissionModule.SERVICE_CATEGORIES, VIEW)
USERS_ADMIN = frozenset(
    {
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
        PermissionAction.BLOCK,
        PermissionAction.MANAGE_ROLE,
        PermissionAction.DELETE,
    }
)


ROLE_PERMISSIONS: dict[UserRole, tuple[Permission, ...]] = {
    UserRole.OWNER: (
        Permission(PermissionModule.DASHBOARD, VIEW),
        Permission(PermissionModule.CRM, CRM_ALL),
        COMPANY_ADMIN,
        Permission(PermissionModule.USERS, USERS_ADMIN),
        ACCESS_CONTROL_OWNER,
        AUDIT_VIEW,
        SERVICES_ALL,
        SERVICE_CATEGORIES_ALL,
    ),
    UserRole.ADMIN: (
        Permission(PermissionModule.DASHBOARD, VIEW),
        Permission(PermissionModule.CRM, CRM_ALL),
        COMPANY_ADMIN,
        Permission(PermissionModule.USERS, USERS_ADMIN),
        ACCESS_CONTROL_VIEW,
        AUDIT_VIEW,
        SERVICES_ALL,
        SERVICE_CATEGORIES_ALL,
    ),
    UserRole.MANAGER: (
        Permission(PermissionModule.DASHBOARD, VIEW),
        Permission(PermissionModule.CRM, CRM_WRITE),
        SERVICES_WRITE,
        SERVICE_CATEGORIES_WRITE,
    ),
    UserRole.SALES: (
        Permission(PermissionModule.DASHBOARD, VIEW),
        Permission(PermissionModule.CRM, CRM_WRITE),
    ),
    UserRole.RECEPTIONIST: (
        Permission(PermissionModule.DASHBOARD, VIEW),
        Permission(PermissionModule.CRM, CRM_WRITE),
        SERVICES_VIEW,
        SERVICE_CATEGORIES_VIEW,
    ),
    UserRole.PROFESSIONAL: (
        Permission(PermissionModule.DASHBOARD, VIEW),
        Permission(PermissionModule.CRM, VIEW),
        SERVICES_VIEW,
        SERVICE_CATEGORIES_VIEW,
    ),
    UserRole.FINANCIAL: (
        Permission(PermissionModule.DASHBOARD, VIEW),
        Permission(PermissionModule.CRM, VIEW),
    ),
    UserRole.VIEWER: (
        Permission(PermissionModule.DASHBOARD, VIEW),
        Permission(PermissionModule.CRM, VIEW),
    ),
}


def permissions_for_role(role: UserRole) -> tuple[Permission, ...]:
    return ROLE_PERMISSIONS[role]


def has_permission(
    permissions: tuple[Permission, ...],
    module: PermissionModule,
    action: PermissionAction,
) -> bool:
    return any(
        permission.module == module and action in permission.actions
        for permission in permissions
    )
