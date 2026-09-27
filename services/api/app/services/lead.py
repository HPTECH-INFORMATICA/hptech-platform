from __future__ import annotations
import uuid

from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.repositories.audit_log import AuditLogRepository
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
        company_id: uuid.UUID,
        data: LeadCreate,
        user_id: uuid.UUID | None,
    ) -> Lead:
        lead = LeadRepository.create(db, company_id, data)
        LeadHistoryRepository.create(
            db,
            company_id,
            lead.id,
            user_id,
            LeadHistoryCreate(
                company_id=company_id,
                lead_id=lead.id,
                user_id=user_id,
                action="LEAD_CREATED",
                description="Lead criado",
            ),
        )
        AuditLogRepository.add(
            db,
            company_id=company_id,
            actor_user_id=user_id,
            target_type="LEAD",
            target_id=lead.id,
            action="LEAD_CREATED",
            details={"state": "ACTIVE"},
        )
        return lead

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
        user_id: uuid.UUID,
    ) -> tuple[Lead, bool]:
        requested = data.model_dump(exclude_unset=True)
        changed_fields = [
            field for field, value in requested.items() if getattr(lead, field) != value
        ]
        if not changed_fields:
            return lead, False

        changed_data = LeadUpdate.model_validate(
            {field: requested[field] for field in changed_fields}
        )
        lead = LeadRepository.update(db, lead, changed_data)
        LeadHistoryRepository.create(
            db,
            lead.company_id,
            lead.id,
            user_id,
            LeadHistoryCreate(
                company_id=lead.company_id,
                lead_id=lead.id,
                user_id=user_id,
                action="LEAD_UPDATED",
                description=f"Campos alterados: {', '.join(sorted(changed_fields))}",
            ),
        )
        AuditLogRepository.add(
            db,
            company_id=lead.company_id,
            actor_user_id=user_id,
            target_type="LEAD",
            target_id=lead.id,
            action="LEAD_UPDATED",
            details={"fields": sorted(changed_fields)},
        )
        return lead, True

    @staticmethod
    def update_pipeline(
        db: Session,
        lead: Lead,
        data: LeadPipelineUpdate,
        user_id: uuid.UUID,
    ) -> Lead:
        previous_status = lead.pipeline_status

        lead.pipeline_status = data.pipeline_status

        db.flush()
        db.refresh(lead)

        history_data = LeadHistoryCreate(
            company_id=lead.company_id,
            lead_id=lead.id,
            user_id=user_id,
            action="PIPELINE_STATUS_CHANGED",
            previous_value=previous_status,
            new_value=data.pipeline_status,
            description="Estágio do funil alterado",
        )

        LeadHistoryRepository.create(
            db,
            lead.company_id,
            lead.id,
            user_id,
            history_data,
        )
        AuditLogRepository.add(
            db,
            company_id=lead.company_id,
            actor_user_id=user_id,
            target_type="LEAD",
            target_id=lead.id,
            action="LEAD_PIPELINE_CHANGED",
            details={"from": previous_status, "to": data.pipeline_status},
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
        user_id: uuid.UUID,
    ) -> None:
        LeadRepository.soft_delete(
            db,
            lead,
        )
        LeadHistoryRepository.create(
            db,
            lead.company_id,
            lead.id,
            user_id,
            LeadHistoryCreate(
                company_id=lead.company_id,
                lead_id=lead.id,
                user_id=user_id,
                action="LEAD_SOFT_DELETED",
                description="Lead removido da operação",
            ),
        )
        AuditLogRepository.add(
            db,
            company_id=lead.company_id,
            actor_user_id=user_id,
            target_type="LEAD",
            target_id=lead.id,
            action="LEAD_SOFT_DELETED",
            details={"state": "DELETED"},
        )
