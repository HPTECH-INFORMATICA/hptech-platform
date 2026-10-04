import uuid
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, ForeignKeyConstraint, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class TreatmentPlan(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "treatment_plans"
    __table_args__ = (
        UniqueConstraint("company_id", "id", name="uq_treatment_plans_company_id_id"),
        CheckConstraint("price >= 0", name="ck_treatment_plans_price_nonnegative"),
        CheckConstraint("validity_days > 0", name="ck_treatment_plans_validity_positive"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    validity_days: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    company = relationship("Company", back_populates="treatment_plans")
    items = relationship("TreatmentPlanItem", back_populates="plan", cascade="all, delete-orphan", order_by="TreatmentPlanItem.created_at", overlaps="service,treatment_plan_items")


class TreatmentPlanItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "treatment_plan_items"
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "plan_id"], ["treatment_plans.company_id", "treatment_plans.id"], name="fk_treatment_plan_items_company_plan", ondelete="CASCADE"),
        ForeignKeyConstraint(["company_id", "service_id"], ["services.company_id", "services.id"], name="fk_treatment_plan_items_company_service", ondelete="RESTRICT"),
        UniqueConstraint("company_id", "plan_id", "service_id", name="uq_treatment_plan_items_service"),
        CheckConstraint("paid_sessions > 0", name="ck_treatment_plan_items_paid_positive"),
        CheckConstraint("complimentary_sessions >= 0", name="ck_treatment_plan_items_complimentary_nonnegative"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    paid_sessions: Mapped[int] = mapped_column(Integer, nullable=False)
    complimentary_sessions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    plan = relationship("TreatmentPlan", back_populates="items", overlaps="service,treatment_plan_items")
    service = relationship("Service", back_populates="treatment_plan_items", overlaps="items,plan")

    @property
    def service_name(self) -> str:
        return self.service.name
