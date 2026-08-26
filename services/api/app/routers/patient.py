import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.patient import (
    PatientCreate,
    PatientListResponse,
    PatientResponse,
    PatientStatusUpdate,
    PatientUpdate,
)
from app.services.patient import (
    PatientDomain,
    PatientNotFoundError,
    PatientPersistenceError,
)


router = APIRouter(prefix="/patients", tags=["Patients"])
require_view = require_permission(PermissionModule.PATIENTS, PermissionAction.VIEW)
require_create = require_permission(PermissionModule.PATIENTS, PermissionAction.CREATE)
require_update = require_permission(PermissionModule.PATIENTS, PermissionAction.UPDATE)
require_delete = require_permission(PermissionModule.PATIENTS, PermissionAction.DELETE)


def translate_patient_error(error: Exception) -> None:
    if isinstance(error, PatientNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente não encontrado.",
        ) from error
    if isinstance(error, PatientPersistenceError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível persistir o paciente.",
        ) from error
    raise error


@router.get("", response_model=PatientListResponse)
def list_patients(
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=150)] = None,
    is_active: bool | None = None,
) -> PatientListResponse:
    return PatientDomain.list(
        db,
        identity,
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
    )


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientResponse:
    try:
        return PatientResponse.model_validate(
            PatientDomain.detail(db, identity, patient_id)
        )
    except PatientNotFoundError as error:
        translate_patient_error(error)
        raise AssertionError("unreachable")


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    data: PatientCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_create)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientResponse:
    try:
        return PatientResponse.model_validate(PatientDomain.create(db, identity, data))
    except PatientPersistenceError as error:
        translate_patient_error(error)
        raise AssertionError("unreachable")


@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: uuid.UUID,
    data: PatientUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientResponse:
    try:
        return PatientResponse.model_validate(
            PatientDomain.update(db, identity, patient_id, data)
        )
    except (PatientNotFoundError, PatientPersistenceError) as error:
        translate_patient_error(error)
        raise AssertionError("unreachable")


@router.patch("/{patient_id}/status", response_model=PatientResponse)
def change_patient_status(
    patient_id: uuid.UUID,
    data: PatientStatusUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientResponse:
    try:
        return PatientResponse.model_validate(
            PatientDomain.change_status(db, identity, patient_id, data)
        )
    except (PatientNotFoundError, PatientPersistenceError) as error:
        translate_patient_error(error)
        raise AssertionError("unreachable")


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_delete)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        PatientDomain.soft_delete(db, identity, patient_id)
    except (PatientNotFoundError, PatientPersistenceError) as error:
        translate_patient_error(error)
