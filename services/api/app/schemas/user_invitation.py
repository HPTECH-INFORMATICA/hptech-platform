import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.identity import UserRole


class InvitationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr = Field(max_length=150)
    role: UserRole

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    expires_at: datetime
    created_at: datetime
    delivery_status: str
    state: str


class AcceptInvitationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=32, max_length=512)
    password: str = Field(min_length=1, max_length=72)


class AcceptInvitationResponse(BaseModel):
    message: str
