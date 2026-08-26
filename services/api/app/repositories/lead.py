import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadRepository:
    @staticmethod
    def _operational_filters(
        company_id: uuid.UUID,
    ) -> tuple[ColumnElement[bool], ColumnElement[bool]]:
        return (
            Lead.company_id == company_id,
            Lead.deleted_at.is_(None),
        )

    @staticmethod
    def create(
        db: Session,
        company_id: uuid.UUID,
        data: LeadCreate,
    ) -> Lead:
        lead = Lead(
            company_id=company_id,
            **data.model_dump(),
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
                *LeadRepository._operational_filters(company_id),
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
                *LeadRepository._operational_filters(company_id),
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
    def soft_delete(
        db: Session,
        lead: Lead,
    ) -> None:
        lead.deleted_at = datetime.now(timezone.utc)
        db.flush()
        db.refresh(lead)
