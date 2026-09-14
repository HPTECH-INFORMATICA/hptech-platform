import uuid
from datetime import date

from sqlalchemy import (
    Date,
    ForeignKey,
    ForeignKeyConstraint,
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


class Lead(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    SoftDeleteMixin,
    Base,
):
    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "id",
            name="uq_leads_company_id_id",
        ),
        ForeignKeyConstraint(
            ["company_id", "patient_id"],
            ["patients.company_id", "patients.id"],
            ondelete="RESTRICT",
            name="fk_leads_company_patient",
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
        index=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    whatsapp: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    birth_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    source: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
        index=True,
    )

    interest: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    pipeline_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="NEW",
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    company = relationship(
        "Company",
        back_populates="leads",
    )

    patient = relationship(
        "Patient",
        back_populates="leads",
        foreign_keys=[patient_id],
    )

    appointments = relationship(
        "Appointment",
        back_populates="lead",
        primaryjoin=(
            "and_(Lead.company_id == Appointment.company_id, "
            "Lead.id == foreign(Appointment.lead_id))"
        ),
    )

    transactions = relationship(
        "Transaction",
        back_populates="lead",
    )

    lead_tags = relationship(
        "LeadTag",
        back_populates="lead",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    history = relationship(
        "LeadHistory",
        back_populates="lead",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="LeadHistory.created_at.desc()",
    )
