import uuid

from sqlalchemy.orm import Session

from app.core.identity import Permission, PermissionAction, PermissionModule, UserRole
from app.core.rbac import permissions_for_role
from app.repositories.role_permission_override import RolePermissionOverrideRepository


def official_permission_pairs() -> frozenset[tuple[PermissionModule, PermissionAction]]:
    return frozenset(
        (permission.module, action)
        for role in UserRole
        for permission in permissions_for_role(role)
        for action in permission.actions
    )


def permission_pairs(permissions: tuple[Permission, ...]) -> set[tuple[PermissionModule, PermissionAction]]:
    return {
        (permission.module, action)
        for permission in permissions
        for action in permission.actions
    }


def effective_permissions(
    db: Session, company_id: uuid.UUID, role: UserRole
) -> tuple[Permission, ...]:
    allowed = permission_pairs(permissions_for_role(role))
    if role is UserRole.OWNER:
        return permissions_for_role(role)
    for override in RolePermissionOverrideRepository.list_for_role(db, company_id, role):
        pair = (PermissionModule(override.module), PermissionAction(override.action))
        if pair not in official_permission_pairs():
            continue
        if pair == (PermissionModule.ACCESS_CONTROL, PermissionAction.MANAGE):
            continue
        if override.allowed:
            allowed.add(pair)
        else:
            allowed.discard(pair)
    return tuple(
        Permission(
            module,
            frozenset(action for action in PermissionAction if (module, action) in allowed),
        )
        for module in PermissionModule
        if any(candidate_module == module for candidate_module, _action in allowed)
    )
