import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import (
    AuthenticatedIdentity,
    PermissionAction,
    PermissionModule,
)
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.service import (
    ServiceCreate,
    ServiceListResponse,
    ServiceResponse,
    ServiceStatusUpdate,
    ServiceUpdate,
)
from app.services.service import (
    ServiceDomain,
    ServiceCategoryUnavailableError,
    ServiceNotFoundError,
    ServicePersistenceError,
)


router = APIRouter(prefix="/services", tags=["Services"])
require_services_view = require_permission(
    PermissionModule.SERVICES,
    PermissionAction.VIEW,
)
require_services_create = require_permission(
    PermissionModule.SERVICES,
    PermissionAction.CREATE,
)
require_services_update = require_permission(
    PermissionModule.SERVICES,
    PermissionAction.UPDATE,
)
require_services_delete = require_permission(
    PermissionModule.SERVICES,
    PermissionAction.DELETE,
)


def translate_service_error(error: Exception) -> None:
    if isinstance(error, ServiceNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Serviço não encontrado.",
        ) from error
    if isinstance(error, ServicePersistenceError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível persistir o serviço.",
        ) from error
    if isinstance(error, ServiceCategoryUnavailableError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria ativa não encontrada.",
        ) from error
    raise error


@router.get("", response_model=ServiceListResponse)
def list_services(
    identity: Annotated[AuthenticatedIdentity, Depends(require_services_view)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=150)] = None,
    is_active: bool | None = None,
    category_id: uuid.UUID | None = None,
) -> ServiceListResponse:
    return ServiceDomain.list(
        db,
        identity,
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
        category_id=category_id,
    )


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(
    service_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_services_view)],
    db: Annotated[Session, Depends(get_db)],
) -> ServiceResponse:
    try:
        return ServiceResponse.model_validate(
            ServiceDomain.detail(db, identity, service_id)
        )
    except ServiceNotFoundError as error:
        translate_service_error(error)
        raise AssertionError("unreachable")


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    data: ServiceCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_services_create)],
    db: Annotated[Session, Depends(get_db)],
) -> ServiceResponse:
    try:
        return ServiceResponse.model_validate(ServiceDomain.create(db, identity, data))
    except (ServicePersistenceError, ServiceCategoryUnavailableError) as error:
        translate_service_error(error)
        raise AssertionError("unreachable")


@router.patch("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: uuid.UUID,
    data: ServiceUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_services_update)],
    db: Annotated[Session, Depends(get_db)],
) -> ServiceResponse:
    try:
        return ServiceResponse.model_validate(
            ServiceDomain.update(db, identity, service_id, data)
        )
    except (ServiceNotFoundError, ServicePersistenceError, ServiceCategoryUnavailableError) as error:
        translate_service_error(error)
        raise AssertionError("unreachable")


@router.patch("/{service_id}/status", response_model=ServiceResponse)
def change_service_status(
    service_id: uuid.UUID,
    data: ServiceStatusUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_services_update)],
    db: Annotated[Session, Depends(get_db)],
) -> ServiceResponse:
    try:
        return ServiceResponse.model_validate(
            ServiceDomain.change_status(db, identity, service_id, data)
        )
    except (ServiceNotFoundError, ServicePersistenceError) as error:
        translate_service_error(error)
        raise AssertionError("unreachable")


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_services_delete)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        ServiceDomain.soft_delete(db, identity, service_id)
    except (ServiceNotFoundError, ServicePersistenceError) as error:
        translate_service_error(error)
