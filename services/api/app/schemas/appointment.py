import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Self

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.schemas.service import SERVICE_MAX_DURATION_MINUTES


APPOINTMENT_NOTES_MAX_LENGTH = 4000


class AppointmentStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"
    NO_SHOW = "NO_SHOW"


class AppointmentCivilDateTime(BaseModel):
    """A company-local wall time plus explicit DST disambiguation."""

    model_config = ConfigDict(extra="forbid")

    local_datetime: datetime
    utc_offset_minutes: int | None = Field(default=None, ge=-840, le=840)

    @field_validator("local_datetime")
    @classmethod
    def require_civil_datetime(cls, value: datetime) -> datetime:
        if value.utcoffset() is not None:
            raise ValueError("Informe data e hora civil sem timezone ou offset.")
        return value


class AppointmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patient_id: uuid.UUID
    professional_id: uuid.UUID
    service_id: uuid.UUID
    lead_id: uuid.UUID | None = None
    starts_at: AppointmentCivilDateTime
    notes: str | None = Field(
        default=None,
        max_length=APPOINTMENT_NOTES_MAX_LENGTH,
    )

    @field_validator("notes", mode="before")
    @classmethod
    def normalize_notes(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value


class AppointmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patient_id: uuid.UUID | None = None
    professional_id: uuid.UUID | None = None
    service_id: uuid.UUID | None = None
    duration_minutes: int | None = Field(
        default=None,
        ge=1,
        le=SERVICE_MAX_DURATION_MINUTES,
    )
    notes: str | None = Field(
        default=None,
        max_length=APPOINTMENT_NOTES_MAX_LENGTH,
    )

    @field_validator("notes", mode="before")
    @classmethod
    def normalize_notes(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def validate_patch(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        for field_name in (
            "patient_id",
            "professional_id",
            "service_id",
            "duration_minutes",
        ):
            if (
                field_name in self.model_fields_set
                and getattr(self, field_name) is None
            ):
                raise ValueError(f"O campo {field_name} não aceita valor nulo.")
        return self


class AppointmentReschedule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    starts_at: AppointmentCivilDateTime
    duration_minutes: int | None = Field(
        default=None,
        ge=1,
        le=SERVICE_MAX_DURATION_MINUTES,
    )


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    patient_id: uuid.UUID
    professional_id: uuid.UUID = Field(
        validation_alias=AliasChoices(
            "clinical_professional_id",
            "professional_id",
        )
    )
    service_id: uuid.UUID
    lead_id: uuid.UUID | None
    service_name_snapshot: str
    service_duration_minutes_snapshot: int
    service_price_snapshot: Decimal
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime


class AppointmentListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AppointmentResponse]
    total: int
    page: int
    page_size: int
