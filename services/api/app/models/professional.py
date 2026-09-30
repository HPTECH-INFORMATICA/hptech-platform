import uuid
from datetime import date

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Professional(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "professionals"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "id",
            name="uq_professionals_company_id_id",
        ),
        UniqueConstraint(
            "company_id",
            "user_id",
            name="uq_professionals_company_id_user_id",
        ),
        ForeignKeyConstraint(
            ["company_id", "user_id"],
            ["users.company_id", "users.id"],
            name="fk_professionals_company_user",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "cpf IS NULL OR cpf ~ '^[0-9]{11}$'",
            name="ck_professionals_cpf_digits",
        ),
        Index(
            "uq_professionals_company_cpf_active",
            "company_id",
            "cpf",
            unique=True,
            postgresql_where=text("deleted_at IS NULL AND cpf IS NOT NULL"),
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    display_name: Mapped[str] = mapped_column(String(150), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    social_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(11), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(30), nullable=True)
    profession: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    administrative_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
        index=True,
    )

    company = relationship(
        "Company",
        back_populates="professionals",
        overlaps="professional,user",
    )
    user = relationship(
        "User",
        back_populates="professional",
        overlaps="company,professionals",
    )
    appointments = relationship(
        "Appointment",
        back_populates="clinical_professional",
        primaryjoin=(
            "and_(Professional.company_id == Appointment.company_id, "
            "Professional.id == foreign(Appointment.clinical_professional_id))"
        ),
    )
