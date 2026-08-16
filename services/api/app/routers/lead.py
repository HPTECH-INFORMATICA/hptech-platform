import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.lead import (
    LeadCreate,
    LeadKanbanResponse,
    LeadPipelineUpdate,
    LeadResponse,
    LeadUpdate,
)
from app.services.lead import LeadService

router = APIRouter(
    prefix="/leads",
    tags=["Leads"],
)


@router.post(
    "",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lead(
    data: LeadCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
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
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
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
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
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
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
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
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
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
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
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
    )

    db.commit()

@router.patch(
    "/{lead_id}/pipeline",
    response_model=LeadResponse,
)
def update_lead_pipeline(
    lead_id: uuid.UUID,
    data: LeadPipelineUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
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
