from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.identity import (
    AuthenticatedIdentity,
    PermissionAction,
    PermissionModule,
    UserRole,
)
from app.core.rbac import permissions_for_role
from app.dependencies.auth import require_permission
from app.schemas.access_control import (
    AccessControlCatalogResponse,
    AccessControlModuleResponse,
    AccessControlPermissionResponse,
    AccessControlRoleResponse,
)


router = APIRouter(prefix="/access-control", tags=["Access Control"])

require_access_control_view = require_permission(
    PermissionModule.ACCESS_CONTROL, PermissionAction.VIEW
)


def _ordered_actions(actions: frozenset[PermissionAction]) -> list[PermissionAction]:
    return [action for action in PermissionAction if action in actions]


def _build_catalog() -> AccessControlCatalogResponse:
    roles: list[AccessControlRoleResponse] = []
    actions_by_module: dict[PermissionModule, set[PermissionAction]] = {
        module: set() for module in PermissionModule
    }

    for role in UserRole:
        permissions = permissions_for_role(role)
        roles.append(
            AccessControlRoleResponse(
                role=role,
                permissions=[
                    AccessControlPermissionResponse(
                        module=permission.module,
                        actions=_ordered_actions(permission.actions),
                    )
                    for permission in permissions
                ],
            )
        )
        for permission in permissions:
            actions_by_module[permission.module].update(permission.actions)

    modules = [
        AccessControlModuleResponse(
            module=module,
            actions=[
                action for action in PermissionAction if action in actions_by_module[module]
            ],
        )
        for module in PermissionModule
    ]
    return AccessControlCatalogResponse(roles=roles, modules=modules)


@router.get("", response_model=AccessControlCatalogResponse)
def get_access_control_catalog(
    _identity: Annotated[
        AuthenticatedIdentity, Depends(require_access_control_view)
    ],
) -> AccessControlCatalogResponse:
    return _build_catalog()
