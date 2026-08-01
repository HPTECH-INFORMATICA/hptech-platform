from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import (
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class Company(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    SoftDeleteMixin,
    Base,
):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    legal_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    document: Mapped[str | None] = mapped_column(
        String(30),
        unique=True,
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="TRIAL",
    )

    users = relationship(
        "User",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    leads = relationship(
        "Lead",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    appointments = relationship(
        "Appointment",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    transactions = relationship(
        "Transaction",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    services = relationship(
        "Service",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    tags = relationship(
        "Tag",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    lead_history = relationship(
        "LeadHistory",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )