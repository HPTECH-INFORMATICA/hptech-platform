import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Patient(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "patients"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "id",
            name="uq_patients_company_id_id",
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    document: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    company = relationship("Company", back_populates="patients")
    leads = relationship(
        "Lead",
        back_populates="patient",
        foreign_keys="Lead.patient_id",
    )
    appointments = relationship(
        "Appointment",
        back_populates="patient",
        primaryjoin=(
            "and_(Patient.company_id == Appointment.company_id, "
            "Patient.id == foreign(Appointment.patient_id))"
        ),
    )
