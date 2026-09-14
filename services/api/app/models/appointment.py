import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
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


class Appointment(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    SoftDeleteMixin,
    Base,
):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "id",
            name="uq_appointments_company_id_id",
        ),
        ForeignKeyConstraint(
            ["company_id", "lead_id"],
            ["leads.company_id", "leads.id"],
            name="fk_appointments_company_lead",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "professional_id"],
            ["users.company_id", "users.id"],
            name="fk_appointments_company_legacy_professional",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "patient_id"],
            ["patients.company_id", "patients.id"],
            name="fk_appointments_company_patient",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "clinical_professional_id"],
            ["professionals.company_id", "professionals.id"],
            name="fk_appointments_company_clinical_professional",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["company_id", "service_id"],
            ["services.company_id", "services.id"],
            name="fk_appointments_company_service",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "ends_at > starts_at",
            name="ck_appointments_ends_after_starts",
        ),
        CheckConstraint(
            "service_duration_minutes_snapshot > 0",
            name="ck_appointments_service_duration_positive",
        ),
        CheckConstraint(
            "service_price_snapshot >= 0",
            name="ck_appointments_service_price_nonnegative",
        ),
        CheckConstraint(
            "status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', "
            "'COMPLETED', 'CANCELED', 'NO_SHOW')",
            name="ck_appointments_status_lifecycle",
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

    # Legacy reference to users.id. It remains authoritative until the
    # reconciliation and contract phases migrate the clinical relationship.
    professional_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    # Required clinical contract fields. Their composite foreign keys are
    # declared in __table_args__ so every relationship remains tenant-safe.
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    clinical_professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    service_name_snapshot: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    service_duration_minutes_snapshot: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    service_price_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    ends_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="SCHEDULED",
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    company = relationship(
        "Company",
        back_populates="appointments",
    )

    lead = relationship(
        "Lead",
        back_populates="appointments",
        primaryjoin=(
            "and_(Appointment.company_id == Lead.company_id, "
            "foreign(Appointment.lead_id) == Lead.id)"
        ),
    )

    professional = relationship(
        "User",
        back_populates="appointments",
        primaryjoin=(
            "and_(Appointment.company_id == User.company_id, "
            "foreign(Appointment.professional_id) == User.id)"
        ),
    )

    patient = relationship(
        "Patient",
        back_populates="appointments",
        primaryjoin=(
            "and_(Appointment.company_id == Patient.company_id, "
            "foreign(Appointment.patient_id) == Patient.id)"
        ),
    )

    clinical_professional = relationship(
        "Professional",
        back_populates="appointments",
        primaryjoin=(
            "and_(Appointment.company_id == Professional.company_id, "
            "foreign(Appointment.clinical_professional_id) == Professional.id)"
        ),
    )

    service = relationship(
        "Service",
        back_populates="appointments",
        primaryjoin=(
            "and_(Appointment.company_id == Service.company_id, "
            "foreign(Appointment.service_id) == Service.id)"
        ),
    )

    transactions = relationship(
        "Transaction",
        back_populates="appointment",
        primaryjoin=(
            "and_(Appointment.company_id == Transaction.company_id, "
            "Appointment.id == foreign(Transaction.appointment_id))"
        ),
    )
