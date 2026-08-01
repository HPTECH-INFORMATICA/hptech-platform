import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.company import Company
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
    db: Session = Depends(get_db),
) -> LeadResponse:
    company = db.get(Company, data.company_id)

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada",
        )

    lead = LeadService.create(
        db,
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
    company_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> list[LeadResponse]:
    return LeadService.list(
        db,
        company_id,
    )

@router.get(
    "/kanban",
    response_model=LeadKanbanResponse,
)
def get_lead_kanban(
    company_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> LeadKanbanResponse:
    return LeadService.get_kanban(
        db,
        company_id,
    )

@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_lead(
    lead_id: uuid.UUID,
    company_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService.get_by_id(
        db,
        company_id,
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
    company_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService.get_by_id(
        db,
        company_id,
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
    company_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> None:
    lead = LeadService.get_by_id(
        db,
        company_id,
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
    company_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService.get_by_id(
        db,
        company_id,
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
    )

    db.commit()
    db.refresh(lead)

    return lead
