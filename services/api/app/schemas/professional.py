import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def normalize_spaces(value: str) -> str:
    return " ".join(value.split())


class ProfessionalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=1, max_length=150)
    user_id: uuid.UUID | None = None

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = normalize_spaces(value)
            if not normalized:
                raise ValueError("O nome de exibição não pode ficar vazio.")
            return normalized
        return value


class ProfessionalUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=150)
    user_id: uuid.UUID | None = None

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = normalize_spaces(value)
            if not normalized:
                raise ValueError("O nome de exibição não pode ficar vazio.")
            return normalized
        return value

    @model_validator(mode="after")
    def validate_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        if "display_name" in self.model_fields_set and self.display_name is None:
            raise ValueError("O campo display_name não aceita valor nulo.")
        return self


class ProfessionalStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool


class ProfessionalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    display_name: str
    user_id: uuid.UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProfessionalListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ProfessionalResponse]
    total: int
    page: int
    page_size: int
