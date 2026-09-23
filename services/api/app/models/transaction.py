import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import (
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class Transaction(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    SoftDeleteMixin,
    Base,
):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "id",
            name="uq_transactions_company_id_id",
        ),
        ForeignKeyConstraint(
            ["company_id", "lead_id"],
            ["leads.company_id", "leads.id"],
            name="fk_transactions_company_lead",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "appointment_id"],
            ["appointments.company_id", "appointments.id"],
            name="fk_transactions_company_appointment",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "transaction_type IN ('INCOME', 'EXPENSE')",
            name="ck_transactions_type",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'PAID', 'CANCELED')",
            name="ck_transactions_status",
        ),
        CheckConstraint(
            "amount > 0",
            name="ck_transactions_amount_positive",
        ),
        CheckConstraint(
            "(status = 'PAID' AND paid_date IS NOT NULL) OR "
            "(status <> 'PAID' AND paid_date IS NULL)",
            name="ck_transactions_paid_date_matches_status",
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    transaction_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    category: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
        index=True,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    due_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    paid_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
        index=True,
    )

    payment_method: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    company = relationship(
        "Company",
        back_populates="transactions",
    )

    lead = relationship(
        "Lead",
        back_populates="transactions",
        primaryjoin=(
            "and_(Transaction.company_id == Lead.company_id, "
            "foreign(Transaction.lead_id) == Lead.id)"
        ),
    )

    appointment = relationship(
        "Appointment",
        back_populates="transactions",
        primaryjoin=(
            "and_(Transaction.company_id == Appointment.company_id, "
            "foreign(Transaction.appointment_id) == Appointment.id)"
        ),
    )
