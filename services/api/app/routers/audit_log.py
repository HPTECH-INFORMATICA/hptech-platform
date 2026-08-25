import uuid
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.audit_log import AuditLogListResponse
from app.services.audit_log import AuditLogService


router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])
require_audit_view = require_permission(PermissionModule.AUDIT, PermissionAction.VIEW)


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    identity: Annotated[AuthenticatedIdentity, Depends(require_audit_view)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(min_length=1, max_length=150)] = None,
    action: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
    actor_user_id: uuid.UUID | None = None,
    target_type: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    target_id: uuid.UUID | None = None,
    occurred_from: Annotated[datetime | None, Query(alias="from")] = None,
    occurred_to: Annotated[datetime | None, Query(alias="to")] = None,
) -> AuditLogListResponse:
    for boundary in (occurred_from, occurred_to):
        if boundary is not None and boundary.utcoffset() is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "Datas devem incluir fuso horário.",
            )
    if occurred_from and occurred_to:
        if occurred_from > occurred_to:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Período inválido.")
        if occurred_to - occurred_from > timedelta(days=366):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Período máximo de 366 dias.")
    return AuditLogService.list_logs(
        db, identity, page=page, page_size=page_size, search=search,
        action=action, actor_user_id=actor_user_id, target_type=target_type,
        target_id=target_id, occurred_from=occurred_from, occurred_to=occurred_to,
    )
