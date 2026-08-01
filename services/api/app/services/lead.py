from __future__ import annotations
import uuid

from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.repositories.lead import LeadRepository
from app.repositories.lead_history import LeadHistoryRepository
from app.schemas.lead import (
    LeadCreate,
    LeadPipelineUpdate,
    LeadUpdate,
)
from app.schemas.lead_history import LeadHistoryCreate


class LeadService:
    @staticmethod
    def create(
        db: Session,
        data: LeadCreate,
    ) -> Lead:
        return LeadRepository.create(db, data)

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        lead_id: uuid.UUID,
    ) -> Lead | None:
        return LeadRepository.get_by_id(
            db,
            company_id,
            lead_id,
        )

    @staticmethod
    def list(
        db: Session,
        company_id: uuid.UUID,
    ) -> list[Lead]:
        return LeadRepository.list(
            db,
            company_id,
        )

    @staticmethod
    def update(
        db: Session,
        lead: Lead,
        data: LeadUpdate,
    ) -> Lead:
        return LeadRepository.update(
            db,
            lead,
            data,
        )

    @staticmethod
    def update_pipeline(
        db: Session,
        lead: Lead,
        data: LeadPipelineUpdate,
    ) -> Lead:
        previous_status = lead.pipeline_status

        lead.pipeline_status = data.pipeline_status

        db.flush()
        db.refresh(lead)

        history_data = LeadHistoryCreate(
            company_id=lead.company_id,
            lead_id=lead.id,
            user_id=data.user_id,
            action="PIPELINE_STATUS_CHANGED",
            previous_value=previous_status,
            new_value=data.pipeline_status,
            description="Estágio do funil alterado",
        )

        LeadHistoryRepository.create(
            db,
            history_data,
        )

        return lead

    @staticmethod
    def get_kanban(
        db: Session,
        company_id: uuid.UUID,
    ) -> dict[str, list[Lead]]:
        leads = LeadRepository.list(
            db,
            company_id,
        )

        kanban: dict[str, list[Lead]] = {
            "NEW": [],
            "CONTACTED": [],
            "QUALIFIED": [],
            "PROPOSAL": [],
            "WON": [],
            "LOST": [],
        }

        for lead in leads:
            if lead.pipeline_status in kanban:
                kanban[lead.pipeline_status].append(lead)

        return kanban

    @staticmethod
    def delete(
        db: Session,
        lead: Lead,
    ) -> None:
        LeadRepository.delete(
            db,
            lead,
        )