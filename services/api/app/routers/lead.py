import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.tenant import resolve_authenticated_company_id
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
    company_id = resolve_authenticated_company_id(identity, data.company_id)

    lead = LeadService.create(
        db,
        company_id,
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
    company_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[LeadResponse]:
    authenticated_company_id = resolve_authenticated_company_id(
        identity,
        company_id,
    )
    return LeadService.list(
        db,
        authenticated_company_id,
    )

@router.get(
    "/kanban",
    response_model=LeadKanbanResponse,
)
def get_lead_kanban(
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
    company_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> LeadKanbanResponse:
    authenticated_company_id = resolve_authenticated_company_id(
        identity,
        company_id,
    )
    return LeadService.get_kanban(
        db,
        authenticated_company_id,
    )

@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_lead(
    lead_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
    company_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> LeadResponse:
    authenticated_company_id = resolve_authenticated_company_id(
        identity,
        company_id,
    )
    lead = LeadService.get_by_id(
        db,
        authenticated_company_id,
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
    company_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> LeadResponse:
    authenticated_company_id = resolve_authenticated_company_id(
        identity,
        company_id,
    )
    lead = LeadService.get_by_id(
        db,
        authenticated_company_id,
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
    company_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> None:
    authenticated_company_id = resolve_authenticated_company_id(
        identity,
        company_id,
    )
    lead = LeadService.get_by_id(
        db,
        authenticated_company_id,
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
    company_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> LeadResponse:
    authenticated_company_id = resolve_authenticated_company_id(
        identity,
        company_id,
    )
    lead = LeadService.get_by_id(
        db,
        authenticated_company_id,
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
