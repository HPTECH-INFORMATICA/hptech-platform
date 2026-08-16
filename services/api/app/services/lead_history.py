import uuid

from sqlalchemy.orm import Session

from app.models.lead_history import LeadHistory
from app.repositories.lead_history import LeadHistoryRepository
from app.schemas.lead_history import LeadHistoryCreate


class LeadHistoryService:
    @staticmethod
    def create(
        db: Session,
        company_id: uuid.UUID,
        lead_id: uuid.UUID,
        user_id: uuid.UUID | None,
        data: LeadHistoryCreate,
    ) -> LeadHistory:
        return LeadHistoryRepository.create(
            db=db,
            company_id=company_id,
            lead_id=lead_id,
            user_id=user_id,
            data=data,
        )

    @staticmethod
    def list_by_lead(
        db: Session,
        company_id: uuid.UUID,
        lead_id: uuid.UUID,
    ) -> list[LeadHistory]:
        return LeadHistoryRepository.list_by_lead(
            db=db,
            company_id=company_id,
            lead_id=lead_id,
        )
