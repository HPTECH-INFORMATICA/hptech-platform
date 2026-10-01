import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDelete,
    AppointmentListResponse,
    AppointmentResponse,
    AppointmentReschedule,
    AppointmentStatus,
    AppointmentUpdate,
)
from app.services.appointment import (
    AppointmentAvailabilityError,
    AppointmentConflictError,
    AppointmentDomain,
    AppointmentLifecycleError,
    AppointmentNotFoundError,
    AppointmentPersistenceError,
    AppointmentReferenceError,
    AppointmentTimeError,
)


router = APIRouter(prefix="/appointments", tags=["Appointments"])
require_view = require_permission(PermissionModule.APPOINTMENTS, PermissionAction.VIEW)
require_create = require_permission(PermissionModule.APPOINTMENTS, PermissionAction.CREATE)
require_update = require_permission(PermissionModule.APPOINTMENTS, PermissionAction.UPDATE)
require_delete = require_permission(PermissionModule.APPOINTMENTS, PermissionAction.DELETE)


def translate_appointment_error(error: Exception) -> None:
    if isinstance(error, (AppointmentNotFoundError, AppointmentReferenceError)):
        raise HTTPException(status_code=404, detail="Agendamento ou referência não encontrado.") from error
    if isinstance(error, AppointmentTimeError):
        raise HTTPException(status_code=422, detail=str(error)) from error
    if isinstance(error, (AppointmentAvailabilityError, AppointmentConflictError)):
        raise HTTPException(status_code=409, detail="Horário indisponível para o profissional.") from error
    if isinstance(error, AppointmentLifecycleError):
        raise HTTPException(status_code=409, detail=str(error)) from error
    if isinstance(error, AppointmentPersistenceError):
        raise HTTPException(status_code=409, detail="Não foi possível persistir o agendamento.") from error
    raise error


@router.get("", response_model=AppointmentListResponse)
def list_appointments(
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
    window_start: Annotated[datetime, Query(alias="from")],
    window_end: Annotated[datetime, Query(alias="to")],
    professional_id: uuid.UUID | None = None,
    patient_id: uuid.UUID | None = None,
    service_id: uuid.UUID | None = None,
    appointment_status: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
) -> AppointmentListResponse:
    if window_start.utcoffset() is None or window_end.utcoffset() is None or window_start >= window_end:
        raise HTTPException(status_code=422, detail="O intervalo deve conter instantes válidos com timezone.")
    try:
        return AppointmentDomain.list(
            db, identity, window_start=window_start, window_end=window_end,
            professional_id=professional_id, patient_id=patient_id,
            service_id=service_id, status=appointment_status,
            page=page, page_size=page_size,
        )
    except AppointmentNotFoundError as error:
        translate_appointment_error(error)
        raise AssertionError("unreachable")


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    data: AppointmentCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_create)],
    db: Annotated[Session, Depends(get_db)],
) -> AppointmentResponse:
    try:
        return AppointmentResponse.model_validate(AppointmentDomain.create(db, identity, data))
    except Exception as error:
        translate_appointment_error(error)
        raise AssertionError("unreachable")


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
) -> AppointmentResponse:
    try:
        return AppointmentResponse.model_validate(AppointmentDomain.detail(db, identity, appointment_id))
    except AppointmentNotFoundError as error:
        translate_appointment_error(error)
        raise AssertionError("unreachable")


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> AppointmentResponse:
    try:
        return AppointmentResponse.model_validate(AppointmentDomain.update(db, identity, appointment_id, data))
    except Exception as error:
        translate_appointment_error(error)
        raise AssertionError("unreachable")


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentDelete,
    identity: Annotated[AuthenticatedIdentity, Depends(require_delete)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        AppointmentDomain.soft_delete(db, identity, appointment_id, data)
    except Exception as error:
        translate_appointment_error(error)


@router.post("/{appointment_id}/reschedule", response_model=AppointmentResponse)
def reschedule_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentReschedule,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> AppointmentResponse:
    try:
        return AppointmentResponse.model_validate(AppointmentDomain.reschedule(db, identity, appointment_id, data))
    except Exception as error:
        translate_appointment_error(error)
        raise AssertionError("unreachable")


def _transition(appointment_id, target, identity, db) -> AppointmentResponse:
    try:
        return AppointmentResponse.model_validate(AppointmentDomain.transition(db, identity, appointment_id, target))
    except Exception as error:
        translate_appointment_error(error)
        raise AssertionError("unreachable")


@router.post("/{appointment_id}/confirm", response_model=AppointmentResponse)
def confirm_appointment(appointment_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(require_update)], db: Annotated[Session, Depends(get_db)]) -> AppointmentResponse:
    return _transition(appointment_id, AppointmentStatus.CONFIRMED, identity, db)


@router.post("/{appointment_id}/start", response_model=AppointmentResponse)
def start_appointment(appointment_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(require_update)], db: Annotated[Session, Depends(get_db)]) -> AppointmentResponse:
    return _transition(appointment_id, AppointmentStatus.IN_PROGRESS, identity, db)


@router.post("/{appointment_id}/complete", response_model=AppointmentResponse)
def complete_appointment(appointment_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(require_update)], db: Annotated[Session, Depends(get_db)]) -> AppointmentResponse:
    return _transition(appointment_id, AppointmentStatus.COMPLETED, identity, db)


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(appointment_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(require_update)], db: Annotated[Session, Depends(get_db)]) -> AppointmentResponse:
    return _transition(appointment_id, AppointmentStatus.CANCELED, identity, db)


@router.post("/{appointment_id}/no-show", response_model=AppointmentResponse)
def no_show_appointment(appointment_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(require_update)], db: Annotated[Session, Depends(get_db)]) -> AppointmentResponse:
    return _transition(appointment_id, AppointmentStatus.NO_SHOW, identity, db)
