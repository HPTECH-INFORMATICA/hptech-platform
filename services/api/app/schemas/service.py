import uuid
from datetime import datetime
from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.service_category import ServiceCategoryReference


SERVICE_MAX_DURATION_MINUTES = 1440


class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    duration_minutes: int
    price: Decimal
    category: ServiceCategoryReference | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ServiceListResponse(BaseModel):
    items: list[ServiceResponse]
    total: int
    page: int
    page_size: int


class ServiceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    duration_minutes: int = Field(
        ge=1,
        le=SERVICE_MAX_DURATION_MINUTES,
    )
    price: Decimal = Field(
        ge=Decimal("0"),
        max_digits=12,
        decimal_places=2,
    )
    category_id: uuid.UUID | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                raise ValueError("O nome não pode ficar vazio.")
            return normalized
        return value

    @field_validator("description", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value


class ServiceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    duration_minutes: int | None = Field(
        default=None,
        ge=1,
        le=SERVICE_MAX_DURATION_MINUTES,
    )
    price: Decimal | None = Field(
        default=None,
        ge=Decimal("0"),
        max_digits=12,
        decimal_places=2,
    )
    category_id: uuid.UUID | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                raise ValueError("O nome não pode ficar vazio.")
            return normalized
        return value

    @field_validator("description", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def validate_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        for field in ("name", "duration_minutes", "price"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"O campo {field} não aceita valor nulo.")
        return self


class ServiceStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool
