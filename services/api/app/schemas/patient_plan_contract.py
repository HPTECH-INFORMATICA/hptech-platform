import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ContractStatus(StrEnum):
    ACTIVE = "ACTIVE"
    CANCELED = "CANCELED"
    EXPIRED = "EXPIRED"
    COMPLETED = "COMPLETED"


class PatientPlanContractCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    patient_id: uuid.UUID
    treatment_plan_id: uuid.UUID
    starts_on: date
    payment_due_date: date
    paid_date: date | None = None
    payment_method: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_payment(self):
        if (self.paid_date is None) != (self.payment_method is None):
            raise ValueError("Data e forma de pagamento devem ser informadas juntas.")
        if self.payment_method is not None:
            self.payment_method = self.payment_method.strip() or None
            if self.payment_method is None:
                raise ValueError("Informe a forma de pagamento.")
        return self


class ContractItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    service_id: uuid.UUID
    service_name_snapshot: str
    paid_sessions_snapshot: int
    complimentary_sessions_snapshot: int
    paid_available: int
    complimentary_available: int


class PatientPlanContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    patient_id: uuid.UUID
    treatment_plan_id: uuid.UUID
    plan_name_snapshot: str
    plan_description_snapshot: str | None
    price_snapshot: Decimal
    validity_days_snapshot: int
    starts_on: date
    expires_on: date
    payment_due_date: date
    status: ContractStatus
    financial_transaction_id: uuid.UUID | None
    financial_status: str
    items: list[ContractItemResponse]
    contracted_at: datetime


class PatientPlanContractListResponse(BaseModel):
    items: list[PatientPlanContractResponse]
    total: int
    page: int
    page_size: int
