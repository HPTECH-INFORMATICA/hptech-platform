import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.repositories.audit_log import AuditLogRepository
from app.schemas.audit_log import (
    AuditActorResponse,
    AuditLogListResponse,
    AuditLogResponse,
)


SAFE_METADATA_KEYS: dict[str, frozenset[str]] = {
    "USER_UPDATED": frozenset({"fields"}),
    "USER_ROLE_CHANGED": frozenset({"from", "to"}),
    "USER_BLOCKED": frozenset({"from", "to"}),
    "USER_REACTIVATED": frozenset({"from", "to"}),
    "USER_SOFT_DELETED": frozenset({"is_active"}),
    "USER_INVITED": frozenset({"role", "delivery"}),
    "USER_INVITATION_DELIVERY_FAILED": frozenset({"state"}),
    "USER_INVITATION_REVOKED": frozenset({"state"}),
    "USER_INVITATION_ACCEPTED": frozenset({"user_id", "role"}),
    "PASSWORD_CHANGED": frozenset(),
    "PASSWORD_RESET_REQUESTED": frozenset(),
    "PASSWORD_RESET_COMPLETED": frozenset(),
    "ROLE_PERMISSIONS_CHANGED": frozenset({"role", "enabled", "revoked"}),
    "ROLE_PERMISSIONS_RESET": frozenset({"role"}),
}


def sanitize_audit_metadata(action: str, details: dict[str, Any]) -> dict[str, Any]:
    allowed = SAFE_METADATA_KEYS.get(action, frozenset())
    return {key: details[key] for key in allowed if key in details}


class AuditLogService:
    @staticmethod
    def list_logs(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        page: int,
        page_size: int,
        search: str | None,
        action: str | None,
        actor_user_id: uuid.UUID | None,
        target_type: str | None,
        target_id: uuid.UUID | None,
        occurred_from: datetime | None,
        occurred_to: datetime | None,
    ) -> AuditLogListResponse:
        rows, total = AuditLogRepository.list_by_company(
            db,
            identity.company.id,
            page=page,
            page_size=page_size,
            search=search,
            action=action,
            actor_user_id=actor_user_id,
            target_type=target_type,
            target_id=target_id,
            occurred_from=occurred_from,
            occurred_to=occurred_to,
        )
        return AuditLogListResponse(
            items=[
                AuditLogResponse(
                    id=event.id,
                    action=event.action,
                    actor=AuditActorResponse(
                        id=actor.id,
                        name=actor.name,
                        email=actor.email,
                        role=actor.role,
                    ) if actor else None,
                    target_type=event.target_type,
                    target_id=event.target_id,
                    metadata=sanitize_audit_metadata(event.action, event.details),
                    occurred_at=event.occurred_at,
                )
                for event, actor in rows
            ],
            total=total,
            page=page,
            page_size=page_size,
        )
