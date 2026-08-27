import uuid
from datetime import date
from enum import StrEnum
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


def normalize_spaces(value: str) -> str:
    return " ".join(value.split())


def normalize_optional_text(value: Any, *, empty_as_none: bool) -> Any:
    if not isinstance(value, str):
        return value
    normalized = value.strip()
    return None if empty_as_none and not normalized else normalized


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

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        normalized = normalize_spaces(value)
        if not normalized:
            raise ValueError("Nome do lead não pode ficar vazio.")
        return normalized

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        normalized = normalize_optional_text(value, empty_as_none=True)
        return normalized.lower() if isinstance(normalized, str) else normalized

    @field_validator("phone", "whatsapp", mode="before")
    @classmethod
    def normalize_contact(cls, value: Any) -> Any:
        return normalize_optional_text(value, empty_as_none=False)

    @field_validator("source", "interest", "notes", mode="before")
    @classmethod
    def normalize_nullable_text(cls, value: Any) -> Any:
        return normalize_optional_text(value, empty_as_none=True)


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

    @model_validator(mode="before")
    @classmethod
    def reject_empty_update(cls, value: Any) -> Any:
        if isinstance(value, dict) and not value:
            raise ValueError("Informe ao menos um campo para atualizar.")
        return value

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Nome do lead não pode ser nulo.")
        if not isinstance(value, str):
            return value
        normalized = normalize_spaces(value)
        if not normalized:
            raise ValueError("Nome do lead não pode ficar vazio.")
        return normalized

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        normalized = normalize_optional_text(value, empty_as_none=True)
        return normalized.lower() if isinstance(normalized, str) else normalized

    @field_validator("phone", "whatsapp", mode="before")
    @classmethod
    def normalize_contact(cls, value: Any) -> Any:
        return normalize_optional_text(value, empty_as_none=False)

    @field_validator("source", "interest", "notes", mode="before")
    @classmethod
    def normalize_nullable_text(cls, value: Any) -> Any:
        return normalize_optional_text(value, empty_as_none=True)


class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID

class LeadPipelineUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pipeline_status: LeadPipelineStatus

class LeadKanbanResponse(BaseModel):
    NEW: list[LeadResponse]
    CONTACTED: list[LeadResponse]
    QUALIFIED: list[LeadResponse]
    PROPOSAL: list[LeadResponse]
    WON: list[LeadResponse]
    LOST: list[LeadResponse]
