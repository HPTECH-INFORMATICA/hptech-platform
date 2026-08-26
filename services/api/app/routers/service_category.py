import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryListResponse,
    ServiceCategoryResponse,
    ServiceCategoryStatusUpdate,
    ServiceCategoryUpdate,
)
from app.services.service_category import (
    ServiceCategoryConflictError,
    ServiceCategoryDomain,
    ServiceCategoryNotFoundError,
    ServiceCategoryPersistenceError,
)


router = APIRouter(prefix="/service-categories", tags=["Service Categories"])
require_view = require_permission(PermissionModule.SERVICE_CATEGORIES, PermissionAction.VIEW)
require_create = require_permission(PermissionModule.SERVICE_CATEGORIES, PermissionAction.CREATE)
require_update = require_permission(PermissionModule.SERVICE_CATEGORIES, PermissionAction.UPDATE)
require_delete = require_permission(PermissionModule.SERVICE_CATEGORIES, PermissionAction.DELETE)


def translate(error: Exception) -> None:
    if isinstance(error, ServiceCategoryNotFoundError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoria não encontrada.") from error
    if isinstance(error, ServiceCategoryConflictError):
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma categoria com esse nome.") from error
    if isinstance(error, ServiceCategoryPersistenceError):
        raise HTTPException(status.HTTP_409_CONFLICT, "Não foi possível persistir a categoria.") from error
    raise error


@router.get("", response_model=ServiceCategoryListResponse)
def list_categories(
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=80)] = None,
    is_active: bool | None = None,
) -> ServiceCategoryListResponse:
    return ServiceCategoryDomain.list(db, identity, page=page, page_size=page_size, search=search, is_active=is_active)


@router.get("/{category_id}", response_model=ServiceCategoryResponse)
def get_category(category_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(require_view)], db: Annotated[Session, Depends(get_db)]) -> ServiceCategoryResponse:
    try:
        return ServiceCategoryResponse.model_validate(ServiceCategoryDomain.detail(db, identity, category_id))
    except ServiceCategoryNotFoundError as error:
        translate(error)
        raise AssertionError("unreachable")


@router.post("", response_model=ServiceCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(data: ServiceCategoryCreate, identity: Annotated[AuthenticatedIdentity, Depends(require_create)], db: Annotated[Session, Depends(get_db)]) -> ServiceCategoryResponse:
    try:
        return ServiceCategoryResponse.model_validate(ServiceCategoryDomain.create(db, identity, data))
    except (ServiceCategoryConflictError, ServiceCategoryPersistenceError) as error:
        translate(error)
        raise AssertionError("unreachable")


@router.patch("/{category_id}", response_model=ServiceCategoryResponse)
def update_category(category_id: uuid.UUID, data: ServiceCategoryUpdate, identity: Annotated[AuthenticatedIdentity, Depends(require_update)], db: Annotated[Session, Depends(get_db)]) -> ServiceCategoryResponse:
    try:
        return ServiceCategoryResponse.model_validate(ServiceCategoryDomain.update(db, identity, category_id, data))
    except (ServiceCategoryNotFoundError, ServiceCategoryConflictError, ServiceCategoryPersistenceError) as error:
        translate(error)
        raise AssertionError("unreachable")


@router.patch("/{category_id}/status", response_model=ServiceCategoryResponse)
def change_category_status(category_id: uuid.UUID, data: ServiceCategoryStatusUpdate, identity: Annotated[AuthenticatedIdentity, Depends(require_update)], db: Annotated[Session, Depends(get_db)]) -> ServiceCategoryResponse:
    try:
        return ServiceCategoryResponse.model_validate(ServiceCategoryDomain.change_status(db, identity, category_id, data))
    except (ServiceCategoryNotFoundError, ServiceCategoryPersistenceError) as error:
        translate(error)
        raise AssertionError("unreachable")


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(require_delete)], db: Annotated[Session, Depends(get_db)]) -> None:
    try:
        ServiceCategoryDomain.soft_delete(db, identity, category_id)
    except (ServiceCategoryNotFoundError, ServiceCategoryPersistenceError) as error:
        translate(error)
