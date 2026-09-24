import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.landing_page import (
    LandingPageCreate,
    LandingPageListResponse,
    LandingPageResponse,
    LandingPageStatus,
    LandingPageUpdate,
)
from app.services.landing_page import (
    LandingPageConflictError,
    LandingPageDomain,
    LandingPageLifecycleError,
    LandingPageNotFoundError,
    LandingPagePersistenceError,
)


router = APIRouter(prefix="/landing-pages", tags=["Landing Pages"])
require_view = require_permission(
    PermissionModule.LANDING_PAGES, PermissionAction.VIEW
)
require_create = require_permission(
    PermissionModule.LANDING_PAGES, PermissionAction.CREATE
)
require_update = require_permission(
    PermissionModule.LANDING_PAGES, PermissionAction.UPDATE
)
require_delete = require_permission(
    PermissionModule.LANDING_PAGES, PermissionAction.DELETE
)


def translate_landing_page_error(error: Exception) -> None:
    if isinstance(error, LandingPageNotFoundError):
        raise HTTPException(status_code=404, detail="Landing page não encontrada.") from error
    if isinstance(error, (LandingPageConflictError, LandingPageLifecycleError)):
        raise HTTPException(status_code=409, detail=str(error)) from error
    if isinstance(error, LandingPagePersistenceError):
        raise HTTPException(
            status_code=409,
            detail="Não foi possível persistir a landing page.",
        ) from error
    raise error


@router.get("", response_model=LandingPageListResponse)
def list_landing_pages(
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
    landing_page_status: Annotated[
        LandingPageStatus | None, Query(alias="status")
    ] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> LandingPageListResponse:
    return LandingPageDomain.list(
        db,
        identity,
        status=landing_page_status,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=LandingPageResponse, status_code=201)
def create_landing_page(
    data: LandingPageCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_create)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    try:
        return LandingPageResponse.model_validate(
            LandingPageDomain.create(db, identity, data)
        )
    except Exception as error:
        translate_landing_page_error(error)
        raise AssertionError("unreachable")


@router.get("/{landing_page_id}", response_model=LandingPageResponse)
def get_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    try:
        return LandingPageResponse.model_validate(
            LandingPageDomain.detail(db, identity, landing_page_id)
        )
    except Exception as error:
        translate_landing_page_error(error)
        raise AssertionError("unreachable")


@router.patch("/{landing_page_id}", response_model=LandingPageResponse)
def update_landing_page(
    landing_page_id: uuid.UUID,
    data: LandingPageUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    try:
        return LandingPageResponse.model_validate(
            LandingPageDomain.update(db, identity, landing_page_id, data)
        )
    except Exception as error:
        translate_landing_page_error(error)
        raise AssertionError("unreachable")


def _transition(
    operation,
    db: Session,
    identity: AuthenticatedIdentity,
    landing_page_id: uuid.UUID,
) -> LandingPageResponse:
    try:
        return LandingPageResponse.model_validate(
            operation(db, identity, landing_page_id)
        )
    except Exception as error:
        translate_landing_page_error(error)
        raise AssertionError("unreachable")


@router.post("/{landing_page_id}/publish", response_model=LandingPageResponse)
def publish_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    return _transition(LandingPageDomain.publish, db, identity, landing_page_id)


@router.post("/{landing_page_id}/unpublish", response_model=LandingPageResponse)
def unpublish_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    return _transition(LandingPageDomain.unpublish, db, identity, landing_page_id)


@router.post("/{landing_page_id}/archive", response_model=LandingPageResponse)
def archive_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    return _transition(LandingPageDomain.archive, db, identity, landing_page_id)


@router.delete("/{landing_page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_delete)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        LandingPageDomain.soft_delete(db, identity, landing_page_id)
    except Exception as error:
        translate_landing_page_error(error)
