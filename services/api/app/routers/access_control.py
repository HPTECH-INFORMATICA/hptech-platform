from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule, UserRole
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.access_control import (
    AccessControlCatalogResponse,
    AccessControlRoleResponse,
    AccessControlRoleUpdate,
)
from app.services.access_control import (
    AccessControlConflictError,
    AccessControlForbiddenError,
    AccessControlInvalidError,
    AccessControlService,
)


router = APIRouter(prefix="/access-control", tags=["Access Control"])
require_access_control_view = require_permission(PermissionModule.ACCESS_CONTROL, PermissionAction.VIEW)
require_access_control_manage = require_permission(PermissionModule.ACCESS_CONTROL, PermissionAction.MANAGE)


@router.get("", response_model=AccessControlCatalogResponse)
def get_access_control_catalog(
    identity: Annotated[AuthenticatedIdentity, Depends(require_access_control_view)],
    db: Annotated[Session, Depends(get_db)],
) -> AccessControlCatalogResponse:
    return AccessControlService.catalog(db, identity)


def _translate_error(error: Exception) -> None:
    if isinstance(error, AccessControlForbiddenError):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Papel protegido ou não editável.") from error
    if isinstance(error, AccessControlInvalidError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
    if isinstance(error, AccessControlConflictError):
        raise HTTPException(status.HTTP_409_CONFLICT, "Conflito ao atualizar permissões.") from error
    raise error


@router.put("/roles/{role}", response_model=AccessControlRoleResponse)
def update_role_permissions(
    role: UserRole,
    data: AccessControlRoleUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_access_control_manage)],
    db: Annotated[Session, Depends(get_db)],
) -> AccessControlRoleResponse:
    try:
        return AccessControlService.update_role(db, identity, role, data.permissions)
    except (AccessControlForbiddenError, AccessControlInvalidError, AccessControlConflictError) as error:
        _translate_error(error)
        raise AssertionError("unreachable")


@router.post("/roles/{role}/reset", response_model=AccessControlRoleResponse)
def reset_role_permissions(
    role: UserRole,
    identity: Annotated[AuthenticatedIdentity, Depends(require_access_control_manage)],
    db: Annotated[Session, Depends(get_db)],
) -> AccessControlRoleResponse:
    try:
        return AccessControlService.reset_role(db, identity, role)
    except (AccessControlForbiddenError, AccessControlConflictError) as error:
        _translate_error(error)
        raise AssertionError("unreachable")
