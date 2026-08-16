import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.tenant import resolve_authenticated_company_id
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
    company_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[LeadHistoryResponse]:
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

    history = LeadHistoryService.list_by_lead(
        db=db,
        company_id=authenticated_company_id,
        lead_id=lead_id,
    )

    return [
        LeadHistoryResponse.model_validate(item)
        for item in history
    ]
