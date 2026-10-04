import uuid
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
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


class Service(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    SoftDeleteMixin,
    Base,
):
    __tablename__ = "services"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "id",
            name="uq_services_company_id_id",
        ),
        CheckConstraint(
            "duration_minutes > 0",
            name="ck_services_duration_minutes_positive",
        ),
        CheckConstraint("price >= 0", name="ck_services_price_nonnegative"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=60,
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_categories.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    company = relationship(
        "Company",
        back_populates="services",
    )

    appointments = relationship(
        "Appointment",
        back_populates="service",
        primaryjoin=(
            "and_(Service.company_id == Appointment.company_id, "
            "Service.id == foreign(Appointment.service_id))"
        ),
    )

    category = relationship(
        "ServiceCategory",
        back_populates="services",
    )

    treatment_plan_items = relationship(
        "TreatmentPlanItem",
        back_populates="service",
        overlaps="items,plan",
    )
