import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditActorResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    action: str
    actor: AuditActorResponse | None
    target_type: str
    target_id: uuid.UUID | None
    metadata: dict[str, Any]
    occurred_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
