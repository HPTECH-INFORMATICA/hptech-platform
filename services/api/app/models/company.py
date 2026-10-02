from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.core.identity import CompanyStatus, normalize_company_status
from app.core.timezones import normalize_iana_timezone
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

    primary_unit_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    address_line: Mapped[str | None] = mapped_column(
        String(240),
        nullable=True,
    )

    address_complement: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    address_district: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    address_city: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    address_state: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )

    address_postal_code: Mapped[str | None] = mapped_column(
        String(20),
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
        default=CompanyStatus.TRIAL.value,
    )

    timezone: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    @validates("status")
    def validate_status(
        self,
        _key: str,
        value: str | CompanyStatus,
    ) -> str:
        return normalize_company_status(value)

    @validates("timezone")
    def validate_timezone(self, _key: str, value: object) -> str:
        return normalize_iana_timezone(value)

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

    service_categories = relationship(
        "ServiceCategory",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    patients = relationship(
        "Patient",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    professionals = relationship(
        "Professional",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
        overlaps="professional,user",
    )

    landing_pages = relationship(
        "LandingPage",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
