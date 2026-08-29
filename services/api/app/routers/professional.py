import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.core.rbac import has_permission
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_permission
from app.schemas.professional import (
    ProfessionalCreate,
    ProfessionalListResponse,
    ProfessionalResponse,
    ProfessionalStatusUpdate,
    ProfessionalUpdate,
    ProfessionalUserCandidateListResponse,
)
from app.services.professional import (
    ProfessionalDomain,
    ProfessionalNotFoundError,
    ProfessionalPersistenceError,
    ProfessionalUserConflictError,
    ProfessionalUserInactiveError,
    ProfessionalUserNotFoundError,
)


router = APIRouter(prefix="/professionals", tags=["Professionals"])
require_view = require_permission(PermissionModule.PROFESSIONALS, PermissionAction.VIEW)
require_create = require_permission(PermissionModule.PROFESSIONALS, PermissionAction.CREATE)
require_update = require_permission(PermissionModule.PROFESSIONALS, PermissionAction.UPDATE)
require_delete = require_permission(PermissionModule.PROFESSIONALS, PermissionAction.DELETE)


def require_link_management(
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
) -> AuthenticatedIdentity:
    can_create = has_permission(
        identity.permissions,
        PermissionModule.PROFESSIONALS,
        PermissionAction.CREATE,
    )
    can_update = has_permission(
        identity.permissions,
        PermissionModule.PROFESSIONALS,
        PermissionAction.UPDATE,
    )
    if not (can_create or can_update):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PermissÃ£o insuficiente para consultar contas elegÃ­veis.",
        )
    return identity


def translate_professional_error(error: Exception) -> None:
    if isinstance(error, (ProfessionalNotFoundError, ProfessionalUserNotFoundError)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional ou usuário não encontrado.",
        ) from error
    if isinstance(error, ProfessionalUserInactiveError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Usuário inativo não pode ser vinculado ao profissional.",
        ) from error
    if isinstance(error, ProfessionalUserConflictError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Usuário já vinculado a outro profissional.",
        ) from error
    if isinstance(error, ProfessionalPersistenceError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível persistir o profissional.",
        ) from error
    raise error


@router.get("", response_model=ProfessionalListResponse)
def list_professionals(
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=150)] = None,
    is_active: bool | None = None,
) -> ProfessionalListResponse:
    return ProfessionalDomain.list(
        db,
        identity,
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
    )


@router.get(
    "/link-candidates",
    response_model=ProfessionalUserCandidateListResponse,
)
def list_professional_user_candidates(
    identity: Annotated[AuthenticatedIdentity, Depends(require_link_management)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=150)] = None,
    professional_id: uuid.UUID | None = None,
) -> ProfessionalUserCandidateListResponse:
    try:
        return ProfessionalDomain.list_user_candidates(
            db,
            identity,
            page=page,
            page_size=page_size,
            search=search,
            professional_id=professional_id,
        )
    except ProfessionalNotFoundError as error:
        translate_professional_error(error)
        raise AssertionError("unreachable")


@router.get("/{professional_id}", response_model=ProfessionalResponse)
def get_professional(
    professional_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfessionalResponse:
    try:
        return ProfessionalResponse.model_validate(
            ProfessionalDomain.detail(db, identity, professional_id)
        )
    except ProfessionalNotFoundError as error:
        translate_professional_error(error)
        raise AssertionError("unreachable")


@router.post("", response_model=ProfessionalResponse, status_code=status.HTTP_201_CREATED)
def create_professional(
    data: ProfessionalCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_create)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfessionalResponse:
    try:
        return ProfessionalResponse.model_validate(
            ProfessionalDomain.create(db, identity, data)
        )
    except (
        ProfessionalPersistenceError,
        ProfessionalUserConflictError,
        ProfessionalUserInactiveError,
        ProfessionalUserNotFoundError,
    ) as error:
        translate_professional_error(error)
        raise AssertionError("unreachable")


@router.patch("/{professional_id}", response_model=ProfessionalResponse)
def update_professional(
    professional_id: uuid.UUID,
    data: ProfessionalUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfessionalResponse:
    try:
        return ProfessionalResponse.model_validate(
            ProfessionalDomain.update(db, identity, professional_id, data)
        )
    except (
        ProfessionalNotFoundError,
        ProfessionalPersistenceError,
        ProfessionalUserConflictError,
        ProfessionalUserInactiveError,
        ProfessionalUserNotFoundError,
    ) as error:
        translate_professional_error(error)
        raise AssertionError("unreachable")


@router.patch("/{professional_id}/status", response_model=ProfessionalResponse)
def change_professional_status(
    professional_id: uuid.UUID,
    data: ProfessionalStatusUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfessionalResponse:
    try:
        return ProfessionalResponse.model_validate(
            ProfessionalDomain.change_status(db, identity, professional_id, data)
        )
    except (ProfessionalNotFoundError, ProfessionalPersistenceError) as error:
        translate_professional_error(error)
        raise AssertionError("unreachable")


@router.delete("/{professional_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_professional(
    professional_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_delete)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        ProfessionalDomain.soft_delete(db, identity, professional_id)
    except (ProfessionalNotFoundError, ProfessionalPersistenceError) as error:
        translate_professional_error(error)
