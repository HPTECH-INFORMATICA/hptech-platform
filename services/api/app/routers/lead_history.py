import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.lead_history import (
    LeadHistoryResponse,
)
from app.services.lead_history import LeadHistoryService
from app.services.lead import LeadService


router = APIRouter(
    prefix="/lead-history",
    tags=["Lead History"],
)


@router.get(
    "/lead/{lead_id}",
    response_model=list[LeadHistoryResponse],
)
def list_lead_history(
    lead_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[LeadHistoryResponse]:
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

    history = LeadHistoryService.list_by_lead(
        db=db,
        company_id=identity.company.id,
        lead_id=lead_id,
    )

    return [
        LeadHistoryResponse.model_validate(item)
        for item in history
    ]
