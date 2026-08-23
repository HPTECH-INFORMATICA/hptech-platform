import uuid
from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.identity import (
    AuthenticatedIdentity,
    PermissionAction,
    PermissionModule,
    UserRole,
)
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.user_admin import (
    UserAdminListResponse,
    UserAdminResponse,
    UserAdminRoleUpdate,
    UserAdminStatusUpdate,
    UserAdminUpdate,
)
from app.schemas.user_invitation import InvitationCreate, InvitationResponse
from app.services.invitation_notifier import ResendInvitationNotifier
from app.services.user_invitation import (
    InvitationConflictError,
    InvitationForbiddenError,
    InvitationNotFoundError,
    UserInvitationService,
)
from app.services.user_admin import (
    UserAdminConflictError,
    UserAdminForbiddenError,
    UserAdminNotFoundError,
    UserAdminService,
)


router = APIRouter(prefix="/users", tags=["Users"])

require_users_view = require_permission(
    PermissionModule.USERS, PermissionAction.VIEW
)
require_users_update = require_permission(
    PermissionModule.USERS, PermissionAction.UPDATE
)
require_users_role = require_permission(
    PermissionModule.USERS, PermissionAction.MANAGE_ROLE
)
require_users_block = require_permission(
    PermissionModule.USERS, PermissionAction.BLOCK
)
require_users_delete = require_permission(
    PermissionModule.USERS, PermissionAction.DELETE
)
require_users_create = require_permission(
    PermissionModule.USERS, PermissionAction.CREATE
)


@router.post("/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    data: InvitationCreate,
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_create)],
) -> InvitationResponse:
    try:
        invitation = UserInvitationService.create(
            db, identity, data, ResendInvitationNotifier()
        )
        return InvitationResponse.model_validate(invitation)
    except InvitationForbiddenError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN) from error
    except InvitationConflictError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.get("/invitations", response_model=list[InvitationResponse])
def list_invitations(
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_view)],
) -> list[InvitationResponse]:
    return [
        InvitationResponse.model_validate(item)
        for item in UserInvitationService.list(db, identity)
    ]


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(
    invitation_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_create)],
) -> Response:
    try:
        UserInvitationService.revoke(db, identity, invitation_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except InvitationNotFoundError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND) from error
    except InvitationConflictError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


def _raise_domain_error(db: Session, error: RuntimeError) -> NoReturn:
    db.rollback()
    if isinstance(error, UserAdminNotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND) from error
    if isinstance(error, UserAdminForbiddenError):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN) from error
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=str(error),
    ) from error


@router.get("", response_model=UserAdminListResponse)
def list_users(
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_view)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=150)] = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> UserAdminListResponse:
    users, total = UserAdminService.list_users(
        db,
        identity,
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        is_active=is_active,
    )
    return UserAdminListResponse(
        items=[UserAdminResponse.model_validate(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{user_id}", response_model=UserAdminResponse)
def get_user(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_view)],
) -> UserAdminResponse:
    try:
        return UserAdminResponse.model_validate(
            UserAdminService.detail(db, identity, user_id)
        )
    except UserAdminNotFoundError as error:
        _raise_domain_error(db, error)


@router.patch("/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: uuid.UUID,
    data: UserAdminUpdate,
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_update)],
) -> UserAdminResponse:
    try:
        target = UserAdminService.update(db, identity, user_id, data)
        UserAdminService.commit(db)
        return UserAdminResponse.model_validate(target)
    except (
        UserAdminNotFoundError,
        UserAdminForbiddenError,
        UserAdminConflictError,
    ) as error:
        _raise_domain_error(db, error)


@router.patch("/{user_id}/role", response_model=UserAdminResponse)
def update_user_role(
    user_id: uuid.UUID,
    data: UserAdminRoleUpdate,
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_role)],
) -> UserAdminResponse:
    try:
        target = UserAdminService.change_role(db, identity, user_id, data.role)
        UserAdminService.commit(db)
        return UserAdminResponse.model_validate(target)
    except (
        UserAdminNotFoundError,
        UserAdminForbiddenError,
        UserAdminConflictError,
    ) as error:
        _raise_domain_error(db, error)


@router.patch("/{user_id}/status", response_model=UserAdminResponse)
def update_user_status(
    user_id: uuid.UUID,
    data: UserAdminStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_block)],
) -> UserAdminResponse:
    try:
        target = UserAdminService.set_active(
            db, identity, user_id, data.is_active
        )
        UserAdminService.commit(db)
        return UserAdminResponse.model_validate(target)
    except (
        UserAdminNotFoundError,
        UserAdminForbiddenError,
        UserAdminConflictError,
    ) as error:
        _raise_domain_error(db, error)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_users_delete)],
) -> Response:
    try:
        UserAdminService.soft_delete(db, identity, user_id)
        UserAdminService.commit(db)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except (
        UserAdminNotFoundError,
        UserAdminForbiddenError,
        UserAdminConflictError,
    ) as error:
        _raise_domain_error(db, error)
