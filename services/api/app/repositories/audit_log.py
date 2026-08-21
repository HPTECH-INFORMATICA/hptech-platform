import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditLogRepository:
    @staticmethod
    def add(
        db: Session,
        *,
        company_id: uuid.UUID,
        actor_user_id: uuid.UUID | None,
        target_type: str,
        target_id: uuid.UUID | None,
        action: str,
        details: dict[str, Any] | None = None,
    ) -> AuditLog:
        event = AuditLog(
            company_id=company_id,
            actor_user_id=actor_user_id,
            target_type=target_type,
            target_id=target_id,
            action=action,
            details=details or {},
        )
        db.add(event)
        return event
