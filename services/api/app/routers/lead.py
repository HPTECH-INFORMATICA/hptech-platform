import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.core.rbac import has_permission
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_permission
from app.schemas.lead import (
    LeadCreate,
    LeadKanbanResponse,
    LeadPipelineUpdate,
    LeadResponse,
    LeadUpdate,
)
from app.schemas.lead_patient import (
    LeadPatientCreateRequest,
    LeadPatientLinkRequest,
    LeadPatientLinkResponse,
    LeadPatientSummary,
)
from app.models.patient import Patient
from app.services.lead import LeadService
from app.services.lead_patient import (
    LeadPatientConflictError,
    LeadPatientDependencyError,
    LeadPatientDomain,
    LeadPatientInactiveError,
    LeadPatientNotFoundError,
    LeadPatientPersistenceError,
)

router = APIRouter(
    prefix="/leads",
    tags=["Leads"],
)

require_crm_view = require_permission(PermissionModule.CRM, PermissionAction.VIEW)
require_crm_create = require_permission(PermissionModule.CRM, PermissionAction.CREATE)
require_crm_update = require_permission(PermissionModule.CRM, PermissionAction.UPDATE)
require_crm_delete = require_permission(PermissionModule.CRM, PermissionAction.DELETE)


def require_all_permissions(
    *requirements: tuple[PermissionModule, PermissionAction],
) -> Callable[..., AuthenticatedIdentity]:
    def dependency(
        identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
    ) -> AuthenticatedIdentity:
        if not all(
            has_permission(identity.permissions, module, action)
            for module, action in requirements
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente para esta operação.",
            )
        return identity

    return dependency


require_link_view = require_all_permissions(
    (PermissionModule.CRM, PermissionAction.VIEW),
    (PermissionModule.PATIENTS, PermissionAction.VIEW),
)
require_link_create = require_all_permissions(
    (PermissionModule.CRM, PermissionAction.UPDATE),
    (PermissionModule.PATIENTS, PermissionAction.CREATE),
)
require_link_existing = require_all_permissions(
    (PermissionModule.CRM, PermissionAction.UPDATE),
    (PermissionModule.PATIENTS, PermissionAction.VIEW),
)
require_link_delete = require_all_permissions(
    (PermissionModule.CRM, PermissionAction.UPDATE),
    (PermissionModule.PATIENTS, PermissionAction.UPDATE),
)


def translate_patient_link_error(error: Exception) -> None:
    if isinstance(error, LeadPatientNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead ou paciente não encontrado.",
        ) from error
    if isinstance(error, LeadPatientConflictError):
        detail = "Lead já associado a outro paciente."
    elif isinstance(error, LeadPatientInactiveError):
        detail = "Paciente inativo não pode receber nova associação."
    elif isinstance(error, LeadPatientDependencyError):
        detail = "O vínculo possui agendamentos dependentes."
    elif isinstance(error, LeadPatientPersistenceError):
        detail = "Não foi possível persistir o vínculo com o paciente."
    else:
        raise error
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from error


def patient_link_response(patient: Patient | None) -> LeadPatientLinkResponse:
    return LeadPatientLinkResponse(
        linked=patient is not None,
        patient=(
            LeadPatientSummary.model_validate(patient)
            if patient is not None
            else None
        ),
    )


@router.post(
    "",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lead(
    data: LeadCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_crm_create)],
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService.create(
        db,
        identity.company.id,
        data,
    )

    db.commit()
    db.refresh(lead)

    return lead


@router.get(
    "",
    response_model=list[LeadResponse],
)
def list_leads(
    identity: Annotated[AuthenticatedIdentity, Depends(require_crm_view)],
    db: Session = Depends(get_db),
) -> list[LeadResponse]:
    return LeadService.list(
        db,
        identity.company.id,
    )

@router.get(
    "/kanban",
    response_model=LeadKanbanResponse,
)
def get_lead_kanban(
    identity: Annotated[AuthenticatedIdentity, Depends(require_crm_view)],
    db: Session = Depends(get_db),
) -> LeadKanbanResponse:
    return LeadService.get_kanban(
        db,
        identity.company.id,
    )

@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_lead(
    lead_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_crm_view)],
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService.get_by_id(
        db,
        identity.company.id,
        lead_id,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead não encontrado",
        )

    return lead


@router.patch(
    "/{lead_id}",
    response_model=LeadResponse,
)
def update_lead(
    lead_id: uuid.UUID,
    data: LeadUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_crm_update)],
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService.get_by_id(
        db,
        identity.company.id,
        lead_id,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead não encontrado",
        )

    lead = LeadService.update(
        db,
        lead,
        data,
    )

    db.commit()
    db.refresh(lead)

    return lead


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_lead(
    lead_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_crm_delete)],
    db: Session = Depends(get_db),
) -> None:
    lead = LeadService.get_by_id(
        db,
        identity.company.id,
        lead_id,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead não encontrado",
        )

    LeadService.delete(
        db,
        lead,
        identity.user.id,
    )

    db.commit()


@router.get(
    "/{lead_id}/patient-link",
    response_model=LeadPatientLinkResponse,
)
def get_patient_link(
    lead_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_link_view)],
    db: Session = Depends(get_db),
) -> LeadPatientLinkResponse:
    try:
        return patient_link_response(LeadPatientDomain.get_link(db, identity, lead_id))
    except LeadPatientNotFoundError as error:
        translate_patient_link_error(error)
        raise AssertionError("unreachable")


@router.post(
    "/{lead_id}/patient-link",
    response_model=LeadPatientLinkResponse,
)
def create_patient_from_lead(
    lead_id: uuid.UUID,
    _data: LeadPatientCreateRequest,
    identity: Annotated[AuthenticatedIdentity, Depends(require_link_create)],
    db: Session = Depends(get_db),
) -> LeadPatientLinkResponse:
    try:
        return patient_link_response(
            LeadPatientDomain.create_from_lead(db, identity, lead_id)
        )
    except (
        LeadPatientNotFoundError,
        LeadPatientConflictError,
        LeadPatientPersistenceError,
    ) as error:
        translate_patient_link_error(error)
        raise AssertionError("unreachable")


@router.put(
    "/{lead_id}/patient-link/{patient_id}",
    response_model=LeadPatientLinkResponse,
)
def link_existing_patient(
    lead_id: uuid.UUID,
    patient_id: uuid.UUID,
    _data: LeadPatientLinkRequest,
    identity: Annotated[AuthenticatedIdentity, Depends(require_link_existing)],
    db: Session = Depends(get_db),
) -> LeadPatientLinkResponse:
    try:
        return patient_link_response(
            LeadPatientDomain.link_existing(db, identity, lead_id, patient_id)
        )
    except (
        LeadPatientNotFoundError,
        LeadPatientConflictError,
        LeadPatientInactiveError,
        LeadPatientPersistenceError,
    ) as error:
        translate_patient_link_error(error)
        raise AssertionError("unreachable")


@router.delete(
    "/{lead_id}/patient-link",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_patient(
    lead_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_link_delete)],
    db: Session = Depends(get_db),
) -> None:
    try:
        LeadPatientDomain.unlink(db, identity, lead_id)
    except (
        LeadPatientNotFoundError,
        LeadPatientDependencyError,
        LeadPatientPersistenceError,
    ) as error:
        translate_patient_link_error(error)

@router.patch(
    "/{lead_id}/pipeline",
    response_model=LeadResponse,
)
def update_lead_pipeline(
    lead_id: uuid.UUID,
    data: LeadPipelineUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_crm_update)],
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService.get_by_id(
        db,
        identity.company.id,
        lead_id,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead não encontrado",
        )

    lead = LeadService.update_pipeline(
        db,
        lead,
        data,
        identity.user.id,
    )

    db.commit()
    db.refresh(lead)

    return lead
