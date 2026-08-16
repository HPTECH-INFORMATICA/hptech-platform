import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadRepository:
    @staticmethod
    def create(
        db: Session,
        company_id: uuid.UUID,
        data: LeadCreate,
    ) -> Lead:
        lead = Lead(
            company_id=company_id,
            **data.model_dump(exclude={"company_id"}),
        )

        db.add(lead)
        db.flush()
        db.refresh(lead)

        return lead

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        lead_id: uuid.UUID,
    ) -> Lead | None:
        statement = (
            select(Lead)
            .where(
                Lead.company_id == company_id,
                Lead.id == lead_id,
            )
        )

        result = db.execute(statement)

        return result.scalar_one_or_none()

    @staticmethod
    def list(
        db: Session,
        company_id: uuid.UUID,
    ) -> list[Lead]:
        statement = (
            select(Lead)
            .where(
                Lead.company_id == company_id,
            )
            .order_by(Lead.created_at.desc())
        )

        result = db.execute(statement)

        return list(result.scalars().all())

    @staticmethod
    def update(
        db: Session,
        lead: Lead,
        data: LeadUpdate,
    ) -> Lead:
        values = data.model_dump(exclude_unset=True)

        for field, value in values.items():
            setattr(lead, field, value)

        db.flush()
        db.refresh(lead)

        return lead

    @staticmethod
    def delete(
        db: Session,
        lead: Lead,
    ) -> None:
        db.delete(lead)
        db.flush()
