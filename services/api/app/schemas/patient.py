import uuid
from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def normalize_spaces(value: str) -> str:
    return " ".join(value.split())


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    name: str
    phone: str | None
    whatsapp: str | None
    email: str | None
    document: str | None
    birth_date: date | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PatientListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PatientResponse]
    total: int
    page: int
    page_size: int


class PatientCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    whatsapp: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=150)
    document: str | None = Field(default=None, max_length=60)
    birth_date: date | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = normalize_spaces(value)
            if not normalized:
                raise ValueError("O nome não pode ficar vazio.")
            return normalized
        return value

    @field_validator("phone", "whatsapp", "document", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower() or None
        return value

    @field_validator("birth_date")
    @classmethod
    def reject_future_birth_date(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("A data de nascimento não pode estar no futuro.")
        return value


class PatientUpdate(PatientCreate):
    name: str | None = Field(default=None, min_length=1, max_length=150)

    @model_validator(mode="after")
    def validate_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("O campo name não aceita valor nulo.")
        return self


class PatientStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool
