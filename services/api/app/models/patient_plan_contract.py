import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PatientPlanContract(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "patient_plan_contracts"
    __table_args__ = (
        UniqueConstraint("company_id", "id", name="uq_patient_plan_contracts_company_id_id"),
        ForeignKeyConstraint(["company_id", "patient_id"], ["patients.company_id", "patients.id"], name="fk_patient_plan_contracts_company_patient", ondelete="RESTRICT"),
        ForeignKeyConstraint(["company_id", "treatment_plan_id"], ["treatment_plans.company_id", "treatment_plans.id"], name="fk_patient_plan_contracts_company_plan", ondelete="RESTRICT"),
        CheckConstraint("status IN ('ACTIVE', 'CANCELED', 'EXPIRED', 'COMPLETED')", name="ck_patient_plan_contracts_status"),
        CheckConstraint("price_snapshot >= 0", name="ck_patient_plan_contracts_price_nonnegative"),
        CheckConstraint("validity_days_snapshot > 0", name="ck_patient_plan_contracts_validity_positive"),
        CheckConstraint("expires_on >= starts_on", name="ck_patient_plan_contracts_dates"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    treatment_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    plan_name_snapshot: Mapped[str] = mapped_column(String(150), nullable=False)
    plan_description_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    validity_days_snapshot: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    expires_on: Mapped[date] = mapped_column(Date, nullable=False)
    payment_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE", index=True)
    contracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    patient = relationship("Patient", back_populates="plan_contracts", overlaps="company,plan_contracts")
    treatment_plan = relationship("TreatmentPlan", overlaps="company,patient,plan_contracts,patient_plan_contracts")
    items = relationship("PatientPlanContractItem", back_populates="contract", cascade="all, delete-orphan", order_by="PatientPlanContractItem.created_at")
    ledger_entries = relationship("SessionLedgerEntry", back_populates="contract", cascade="all, delete-orphan", order_by="SessionLedgerEntry.occurred_at")
    transactions = relationship("Transaction", back_populates="patient_plan_contract", overlaps="company,transactions")


class PatientPlanContractItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "patient_plan_contract_items"
    __table_args__ = (
        UniqueConstraint("company_id", "id", name="uq_patient_plan_contract_items_company_id_id"),
        ForeignKeyConstraint(["company_id", "contract_id"], ["patient_plan_contracts.company_id", "patient_plan_contracts.id"], name="fk_patient_plan_contract_items_company_contract", ondelete="CASCADE"),
        ForeignKeyConstraint(["company_id", "service_id"], ["services.company_id", "services.id"], name="fk_patient_plan_contract_items_company_service", ondelete="RESTRICT"),
        UniqueConstraint("company_id", "contract_id", "service_id", name="uq_patient_plan_contract_items_service"),
        CheckConstraint("paid_sessions_snapshot > 0", name="ck_patient_plan_contract_items_paid_positive"),
        CheckConstraint("complimentary_sessions_snapshot >= 0", name="ck_patient_plan_contract_items_courtesy_nonnegative"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    service_name_snapshot: Mapped[str] = mapped_column(String(150), nullable=False)
    paid_sessions_snapshot: Mapped[int] = mapped_column(Integer, nullable=False)
    complimentary_sessions_snapshot: Mapped[int] = mapped_column(Integer, nullable=False)

    contract = relationship("PatientPlanContract", back_populates="items")
    ledger_entries = relationship("SessionLedgerEntry", back_populates="contract_item", overlaps="ledger_entries")
    appointments = relationship(
        "Appointment",
        back_populates="patient_plan_contract_item",
        overlaps="appointments,company",
    )


class SessionLedgerEntry(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "session_ledger_entries"
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "contract_id"], ["patient_plan_contracts.company_id", "patient_plan_contracts.id"], name="fk_session_ledger_company_contract", ondelete="RESTRICT"),
        ForeignKeyConstraint(["company_id", "contract_item_id"], ["patient_plan_contract_items.company_id", "patient_plan_contract_items.id"], name="fk_session_ledger_company_contract_item", ondelete="RESTRICT"),
        ForeignKeyConstraint(["company_id", "appointment_id"], ["appointments.company_id", "appointments.id"], name="fk_session_ledger_company_appointment", ondelete="RESTRICT"),
        CheckConstraint("event_type IN ('CREDIT', 'RESERVE', 'RELEASE', 'CONSUME', 'RESTORE', 'EXPIRE')", name="ck_session_ledger_event_type"),
        CheckConstraint("bucket IN ('PAID', 'COURTESY')", name="ck_session_ledger_bucket"),
        CheckConstraint("quantity > 0", name="ck_session_ledger_quantity_positive"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    contract_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    bucket: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    contract = relationship("PatientPlanContract", back_populates="ledger_entries", overlaps="contract_item,ledger_entries")
    contract_item = relationship("PatientPlanContractItem", back_populates="ledger_entries", overlaps="contract,ledger_entries")
    appointment = relationship(
        "Appointment",
        back_populates="session_ledger_entries",
        overlaps="contract,contract_item,ledger_entries",
    )
