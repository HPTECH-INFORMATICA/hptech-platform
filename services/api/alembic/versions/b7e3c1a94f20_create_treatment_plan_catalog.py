"""create treatment plan catalog

Revision ID: b7e3c1a94f20
Revises: a6d2f9c84e10
Create Date: 2026-10-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7e3c1a94f20"
down_revision: Union[str, Sequence[str], None] = "a6d2f9c84e10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "treatment_plans",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("validity_days", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("price >= 0", name="ck_treatment_plans_price_nonnegative"),
        sa.CheckConstraint("validity_days > 0", name="ck_treatment_plans_validity_positive"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "id", name="uq_treatment_plans_company_id_id"),
    )
    op.create_index("ix_treatment_plans_company_id", "treatment_plans", ["company_id"])
    op.create_index("ix_treatment_plans_is_active", "treatment_plans", ["is_active"])
    op.create_table(
        "treatment_plan_items",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("plan_id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=False),
        sa.Column("paid_sessions", sa.Integer(), nullable=False),
        sa.Column("complimentary_sessions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("paid_sessions > 0", name="ck_treatment_plan_items_paid_positive"),
        sa.CheckConstraint("complimentary_sessions >= 0", name="ck_treatment_plan_items_complimentary_nonnegative"),
        sa.ForeignKeyConstraint(["company_id", "plan_id"], ["treatment_plans.company_id", "treatment_plans.id"], name="fk_treatment_plan_items_company_plan", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id", "service_id"], ["services.company_id", "services.id"], name="fk_treatment_plan_items_company_service", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "plan_id", "service_id", name="uq_treatment_plan_items_service"),
    )
    op.create_index("ix_treatment_plan_items_company_id", "treatment_plan_items", ["company_id"])
    op.create_index("ix_treatment_plan_items_plan_id", "treatment_plan_items", ["plan_id"])
    op.create_index("ix_treatment_plan_items_service_id", "treatment_plan_items", ["service_id"])


def downgrade() -> None:
    op.drop_table("treatment_plan_items")
    op.drop_table("treatment_plans")
