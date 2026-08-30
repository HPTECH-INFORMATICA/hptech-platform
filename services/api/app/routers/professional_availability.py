import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.professional_availability import (
    AvailabilityExceptionCreate,
    AvailabilityExceptionListResponse,
    AvailabilityExceptionResponse,
    AvailabilityExceptionUpdate,
    WeeklyAvailabilityResponse,
    WeeklyAvailabilityUpdate,
)
from app.services.professional_availability import (
    AvailabilityNotFoundError,
    AvailabilityPersistenceError,
    AvailabilityValidationError,
    ProfessionalAvailabilityDomain,
)


router = APIRouter(prefix="/professionals", tags=["Professional Availability"])
require_view = require_permission(PermissionModule.PROFESSIONALS, PermissionAction.VIEW)
require_update = require_permission(PermissionModule.PROFESSIONALS, PermissionAction.UPDATE)


def translate_availability_error(error: Exception) -> None:
    if isinstance(error, AvailabilityNotFoundError):
        raise HTTPException(status_code=404, detail="Profissional ou exceção não encontrado.") from error
    if isinstance(error, AvailabilityValidationError):
        raise HTTPException(status_code=422, detail=str(error)) from error
    if isinstance(error, AvailabilityPersistenceError):
        raise HTTPException(status_code=409, detail="Não foi possível persistir a disponibilidade.") from error
    raise error


@router.get("/{professional_id}/availability/weekly", response_model=WeeklyAvailabilityResponse)
def get_weekly_availability(
    professional_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
) -> WeeklyAvailabilityResponse:
    try:
        return ProfessionalAvailabilityDomain.get_weekly(db, identity, professional_id)
    except AvailabilityNotFoundError as error:
        translate_availability_error(error)
        raise AssertionError("unreachable")


@router.put("/{professional_id}/availability/weekly", response_model=WeeklyAvailabilityResponse)
def replace_weekly_availability(
    professional_id: uuid.UUID,
    data: WeeklyAvailabilityUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> WeeklyAvailabilityResponse:
    try:
        return ProfessionalAvailabilityDomain.replace_weekly(db, identity, professional_id, data)
    except (AvailabilityNotFoundError, AvailabilityValidationError, AvailabilityPersistenceError) as error:
        translate_availability_error(error)
        raise AssertionError("unreachable")


@router.get("/{professional_id}/availability/exceptions", response_model=AvailabilityExceptionListResponse)
def list_availability_exceptions(
    professional_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
    date_from: date | None = None,
    date_to: date | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> AvailabilityExceptionListResponse:
    try:
        return ProfessionalAvailabilityDomain.list_exceptions(
            db, identity, professional_id, date_from=date_from, date_to=date_to, page=page, page_size=page_size
        )
    except (AvailabilityNotFoundError, AvailabilityValidationError) as error:
        translate_availability_error(error)
        raise AssertionError("unreachable")


@router.post(
    "/{professional_id}/availability/exceptions",
    response_model=AvailabilityExceptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_availability_exception(
    professional_id: uuid.UUID,
    data: AvailabilityExceptionCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> AvailabilityExceptionResponse:
    try:
        return AvailabilityExceptionResponse.model_validate(
            ProfessionalAvailabilityDomain.create_exception(db, identity, professional_id, data)
        )
    except (AvailabilityNotFoundError, AvailabilityValidationError, AvailabilityPersistenceError) as error:
        translate_availability_error(error)
        raise AssertionError("unreachable")


@router.patch(
    "/{professional_id}/availability/exceptions/{exception_id}",
    response_model=AvailabilityExceptionResponse,
)
def update_availability_exception(
    professional_id: uuid.UUID,
    exception_id: uuid.UUID,
    data: AvailabilityExceptionUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> AvailabilityExceptionResponse:
    try:
        return AvailabilityExceptionResponse.model_validate(
            ProfessionalAvailabilityDomain.update_exception(db, identity, professional_id, exception_id, data)
        )
    except (AvailabilityNotFoundError, AvailabilityValidationError, AvailabilityPersistenceError) as error:
        translate_availability_error(error)
        raise AssertionError("unreachable")


@router.delete(
    "/{professional_id}/availability/exceptions/{exception_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_availability_exception(
    professional_id: uuid.UUID,
    exception_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        ProfessionalAvailabilityDomain.delete_exception(db, identity, professional_id, exception_id)
    except (AvailabilityNotFoundError, AvailabilityValidationError, AvailabilityPersistenceError) as error:
        translate_availability_error(error)
