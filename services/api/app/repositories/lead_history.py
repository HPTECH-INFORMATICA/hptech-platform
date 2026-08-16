import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead_history import LeadHistory
from app.schemas.lead_history import LeadHistoryCreate


class LeadHistoryRepository:
    @staticmethod
    def create(
        db: Session,
        company_id: uuid.UUID,
        lead_id: uuid.UUID,
        user_id: uuid.UUID | None,
        data: LeadHistoryCreate,
    ) -> LeadHistory:
        history = LeadHistory(
            company_id=company_id,
            lead_id=lead_id,
            user_id=user_id,
            **data.model_dump(exclude={"company_id", "lead_id", "user_id"}),
        )

        db.add(history)
        db.flush()
        db.refresh(history)

        return history

    @staticmethod
    def list_by_lead(
        db: Session,
        company_id: uuid.UUID,
        lead_id: uuid.UUID,
    ) -> list[LeadHistory]:
        statement = (
            select(LeadHistory)
            .where(
                LeadHistory.company_id == company_id,
                LeadHistory.lead_id == lead_id,
            )
            .order_by(LeadHistory.created_at.desc())
        )

        result = db.execute(statement)

        return list(result.scalars().all())
