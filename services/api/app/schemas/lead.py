import uuid
from datetime import date
from enum import StrEnum
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class LeadPipelineStatus(StrEnum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    PROPOSAL = "PROPOSAL"
    WON = "WON"
    LOST = "LOST"

class LeadBase(BaseModel):
    name: str = Field(max_length=150)
    email: EmailStr | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    whatsapp: str | None = Field(default=None, max_length=30)
    birth_date: date | None = None
    source: str | None = Field(default=None, max_length=80)
    interest: str | None = Field(default=None, max_length=255)
    pipeline_status: LeadPipelineStatus = LeadPipelineStatus.NEW
    notes: str | None = None


class LeadCreate(LeadBase):
    model_config = ConfigDict(extra="forbid")


class LeadUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, max_length=150)
    email: EmailStr | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    whatsapp: str | None = Field(default=None, max_length=30)
    birth_date: date | None = None
    source: str | None = Field(default=None, max_length=80)
    interest: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID

class LeadPipelineUpdate(BaseModel):
    pipeline_status: LeadPipelineStatus
    user_id: uuid.UUID | None = None

class LeadKanbanResponse(BaseModel):
    NEW: list[LeadResponse]
    CONTACTED: list[LeadResponse]
    QUALIFIED: list[LeadResponse]
    PROPOSAL: list[LeadResponse]
    WON: list[LeadResponse]
    LOST: list[LeadResponse]
