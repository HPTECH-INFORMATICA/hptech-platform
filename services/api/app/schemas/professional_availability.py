import uuid
from datetime import date, datetime, time
from enum import StrEnum
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AvailabilityExceptionKind(StrEnum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"


class WeeklyInterval(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_order(self) -> Self:
        if self.start_time.utcoffset() is not None or self.end_time.utcoffset() is not None:
            raise ValueError("Os horários devem ser civis locais, sem timezone.")
        if self.start_time >= self.end_time:
            raise ValueError("O horário inicial deve ser anterior ao horário final.")
        return self


class WeeklyAvailabilityUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intervals: list[WeeklyInterval]


class WeeklyAvailabilityResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    professional_id: uuid.UUID
    timezone: str
    intervals: list[WeeklyInterval]


class AvailabilityExceptionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    local_date: date
    kind: AvailabilityExceptionKind
    start_time: time | None = None
    end_time: time | None = None

    @model_validator(mode="after")
    def validate_times(self) -> Self:
        _validate_exception_times(self.kind, self.start_time, self.end_time)
        return self


class AvailabilityExceptionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    local_date: date | None = None
    kind: AvailabilityExceptionKind | None = None
    start_time: time | None = None
    end_time: time | None = None

    @model_validator(mode="after")
    def validate_patch(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        if "local_date" in self.model_fields_set and self.local_date is None:
            raise ValueError("O campo local_date não aceita valor nulo.")
        if "kind" in self.model_fields_set and self.kind is None:
            raise ValueError("O campo kind não aceita valor nulo.")
        return self


class AvailabilityExceptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    professional_id: uuid.UUID
    local_date: date
    kind: AvailabilityExceptionKind
    start_time: time | None
    end_time: time | None
    created_at: datetime
    updated_at: datetime


class AvailabilityExceptionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AvailabilityExceptionResponse]
    total: int
    page: int
    page_size: int
    timezone: str


def _validate_exception_times(
    kind: AvailabilityExceptionKind,
    start_time: time | None,
    end_time: time | None,
) -> None:
    if (start_time is None) != (end_time is None):
        raise ValueError("Informe os horários inicial e final juntos.")
    if kind is AvailabilityExceptionKind.AVAILABLE and start_time is None:
        raise ValueError("Disponibilidade excepcional exige horários.")
    if (
        start_time is not None
        and end_time is not None
        and (start_time.utcoffset() is not None or end_time.utcoffset() is not None)
    ):
        raise ValueError("Os horários devem ser civis locais, sem timezone.")
    if start_time is not None and end_time is not None and start_time >= end_time:
        raise ValueError("O horário inicial deve ser anterior ao horário final.")
