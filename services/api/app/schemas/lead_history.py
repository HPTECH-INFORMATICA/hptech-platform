import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LeadHistoryBase(BaseModel):
    action: str
    previous_value: str | None = None
    new_value: str | None = None
    description: str | None = None


class LeadHistoryCreate(LeadHistoryBase):
    company_id: uuid.UUID
    lead_id: uuid.UUID
    user_id: uuid.UUID | None = None


class LeadHistoryResponse(LeadHistoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    lead_id: uuid.UUID
    user_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime