import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.lead_history import (
    LeadHistoryResponse,
)
from app.services.lead_history import LeadHistoryService


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
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[LeadHistoryResponse]:
    history = LeadHistoryService.list_by_lead(
        db=db,
        company_id=company_id,
        lead_id=lead_id,
    )

    return [
        LeadHistoryResponse.model_validate(item)
        for item in history
    ]
