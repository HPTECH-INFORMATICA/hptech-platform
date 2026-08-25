import uuid
from datetime import datetime
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.core.identity import CompanyStatus


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    legal_name: str | None
    document: str | None
    email: EmailStr | None
    phone: str | None
    slug: str
    status: CompanyStatus
    created_at: datetime
    updated_at: datetime


class CompanyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=150)
    legal_name: str | None = Field(default=None, max_length=200)
    document: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_required_text(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                raise ValueError("O nome não pode ficar vazio.")
            return normalized
        return value

    @field_validator("legal_name", "document", "phone", mode="before")
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

    @model_validator(mode="after")
    def require_change(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("O nome não pode ficar vazio.")
        return self
