import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TransactionType(StrEnum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class TransactionStatus(StrEnum):
    PENDING = "PENDING"
    PAID = "PAID"
    CANCELED = "CANCELED"


def _normalize_optional_text(value: object) -> object:
    if isinstance(value, str):
        return value.strip() or None
    return value


class FinancialTransactionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_type: TransactionType
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    due_date: date
    category: str | None = Field(default=None, max_length=80)
    lead_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None
    notes: str | None = None

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
        return value

    @field_validator("category", "notes", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_text(value)


class FinancialTransactionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )
    due_date: date | None = None
    category: str | None = Field(default=None, max_length=80)
    notes: str | None = None

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("category", "notes", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_text(value)

    @model_validator(mode="after")
    def validate_patch(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        for field_name in ("description", "amount", "due_date"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"O campo {field_name} não aceita valor nulo.")
        return self


class FinancialTransactionPayment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paid_date: date
    payment_method: str = Field(min_length=1, max_length=50)

    @field_validator("payment_method", mode="before")
    @classmethod
    def normalize_payment_method(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class FinancialTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    lead_id: uuid.UUID | None
    appointment_id: uuid.UUID | None
    description: str
    transaction_type: TransactionType
    category: str | None
    amount: Decimal
    due_date: date
    paid_date: date | None
    status: TransactionStatus
    payment_method: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class FinancialTransactionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[FinancialTransactionResponse]
    total: int
    page: int
    page_size: int
