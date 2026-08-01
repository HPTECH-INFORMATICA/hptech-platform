import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead_history import LeadHistory
from app.schemas.lead_history import LeadHistoryCreate


class LeadHistoryRepository:
    @staticmethod
    def create(
        db: Session,
        data: LeadHistoryCreate,
    ) -> LeadHistory:
        history = LeadHistory(**data.model_dump())

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