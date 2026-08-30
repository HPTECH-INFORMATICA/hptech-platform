import uuid
from datetime import date, time

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ProfessionalWeeklyAvailability(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "professional_weekly_availability"
    __table_args__ = (
        CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_professional_weekly_weekday"),
        CheckConstraint("start_time < end_time", name="ck_professional_weekly_time_order"),
        ForeignKeyConstraint(
            ["company_id", "professional_id"],
            ["professionals.company_id", "professionals.id"],
            name="fk_professional_weekly_company_professional",
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "company_id", "professional_id", "weekday", "start_time", "end_time",
            name="uq_professional_weekly_exact_interval",
        ),
        Index(
            "ix_professional_weekly_company_professional_weekday",
            "company_id",
            "professional_id",
            "weekday",
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    professional_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time(timezone=False), nullable=False)
    end_time: Mapped[time] = mapped_column(Time(timezone=False), nullable=False)


class ProfessionalAvailabilityException(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "professional_availability_exceptions"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('AVAILABLE', 'UNAVAILABLE')",
            name="ck_professional_exception_kind",
        ),
        CheckConstraint(
            "(start_time IS NULL AND end_time IS NULL) OR "
            "(start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)",
            name="ck_professional_exception_time_pair",
        ),
        CheckConstraint(
            "kind = 'UNAVAILABLE' OR (start_time IS NOT NULL AND end_time IS NOT NULL)",
            name="ck_professional_exception_available_timed",
        ),
        ForeignKeyConstraint(
            ["company_id", "professional_id"],
            ["professionals.company_id", "professionals.id"],
            name="fk_professional_exception_company_professional",
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "company_id", "professional_id", "local_date", "kind", "start_time", "end_time",
            name="uq_professional_exception_exact_interval",
            postgresql_nulls_not_distinct=True,
        ),
        Index(
            "ix_professional_exception_company_professional_date",
            "company_id",
            "professional_id",
            "local_date",
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    professional_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    local_date: Mapped[date] = mapped_column(Date, nullable=False)
    kind: Mapped[str] = mapped_column(String(11), nullable=False)
    start_time: Mapped[time | None] = mapped_column(Time(timezone=False), nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time(timezone=False), nullable=True)
