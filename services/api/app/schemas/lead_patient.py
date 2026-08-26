import uuid

from pydantic import BaseModel, ConfigDict


class LeadPatientCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LeadPatientLinkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LeadPatientSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    name: str
    is_active: bool


class LeadPatientLinkResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    linked: bool
    patient: LeadPatientSummary | None = None
