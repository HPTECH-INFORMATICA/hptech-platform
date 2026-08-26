import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def normalize_category_name(value: object) -> object:
    if isinstance(value, str):
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("O nome não pode ficar vazio.")
        return normalized
    return value


def normalize_optional_text(value: object) -> object:
    if isinstance(value, str):
        return value.strip() or None
    return value


class ServiceCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ServiceCategoryReference(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    is_active: bool


class ServiceCategoryListResponse(BaseModel):
    items: list[ServiceCategoryResponse]
    total: int
    page: int
    page_size: int


class ServiceCategoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    description: str | None = None

    _normalize_name = field_validator("name", mode="before")(normalize_category_name)
    _normalize_description = field_validator("description", mode="before")(normalize_optional_text)


class ServiceCategoryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None

    _normalize_name = field_validator("name", mode="before")(normalize_category_name)
    _normalize_description = field_validator("description", mode="before")(normalize_optional_text)

    @model_validator(mode="after")
    def validate_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("O nome não aceita valor nulo.")
        return self


class ServiceCategoryStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool
