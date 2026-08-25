import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


class AuditLogRepository:
    @staticmethod
    def list_by_company(
        db: Session,
        company_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        action: str | None = None,
        actor_user_id: uuid.UUID | None = None,
        target_type: str | None = None,
        target_id: uuid.UUID | None = None,
        occurred_from: datetime | None = None,
        occurred_to: datetime | None = None,
    ) -> tuple[list[tuple[AuditLog, User | None]], int]:
        filters = [AuditLog.company_id == company_id]
        if action:
            filters.append(AuditLog.action == action)
        if actor_user_id:
            filters.append(AuditLog.actor_user_id == actor_user_id)
        if target_type:
            filters.append(AuditLog.target_type == target_type)
        if target_id:
            filters.append(AuditLog.target_id == target_id)
        if occurred_from:
            filters.append(AuditLog.occurred_at >= occurred_from)
        if occurred_to:
            filters.append(AuditLog.occurred_at <= occurred_to)
        if search:
            term = search.strip()
            filters.append(
                or_(
                    AuditLog.action.icontains(term, autoescape=True),
                    AuditLog.target_type.icontains(term, autoescape=True),
                    User.name.icontains(term, autoescape=True),
                    User.email.icontains(term, autoescape=True),
                )
            )

        total = db.scalar(
            select(func.count()).select_from(AuditLog).outerjoin(
                User,
                and_(
                    User.id == AuditLog.actor_user_id,
                    User.company_id == AuditLog.company_id,
                ),
            ).where(*filters)
        ) or 0
        statement = (
            select(AuditLog, User)
            .outerjoin(
                User,
                and_(
                    User.id == AuditLog.actor_user_id,
                    User.company_id == AuditLog.company_id,
                ),
            )
            .where(*filters)
            .order_by(AuditLog.occurred_at.desc(), AuditLog.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return [(row[0], row[1]) for row in db.execute(statement).all()], total

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
