import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TreatmentPlanItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    service_id: uuid.UUID
    paid_sessions: int = Field(ge=1, le=1000)
    complimentary_sessions: int = Field(default=0, ge=0, le=1000)


class TreatmentPlanItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    service_id: uuid.UUID
    service_name: str
    paid_sessions: int
    complimentary_sessions: int


class TreatmentPlanCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    price: Decimal = Field(ge=Decimal("0"), max_digits=12, decimal_places=2)
    validity_days: int = Field(ge=1, le=3650)
    items: list[TreatmentPlanItemInput] = Field(min_length=1, max_length=50)

    @field_validator("name", "description", mode="before")
    @classmethod
    def normalize_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def unique_services(self):
        service_ids = [item.service_id for item in self.items]
        if len(service_ids) != len(set(service_ids)):
            raise ValueError("Um serviço não pode aparecer duas vezes no mesmo plano.")
        return self


class TreatmentPlanUpdate(TreatmentPlanCreate):
    pass


class TreatmentPlanStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_active: bool


class TreatmentPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None
    price: Decimal
    validity_days: int
    is_active: bool
    items: list[TreatmentPlanItemResponse]
    created_at: datetime
    updated_at: datetime


class TreatmentPlanListResponse(BaseModel):
    items: list[TreatmentPlanResponse]
    total: int
    page: int
    page_size: int
