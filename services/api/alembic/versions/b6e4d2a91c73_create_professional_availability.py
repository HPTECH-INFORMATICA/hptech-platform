"""create professional availability

Revision ID: b6e4d2a91c73
Revises: a4c7e2f91b60
Create Date: 2026-08-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b6e4d2a91c73"
down_revision: Union[str, Sequence[str], None] = "a4c7e2f91b60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "professional_weekly_availability",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("professional_id", sa.UUID(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(timezone=False), nullable=False),
        sa.Column("end_time", sa.Time(timezone=False), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_professional_weekly_weekday"),
        sa.CheckConstraint("start_time < end_time", name="ck_professional_weekly_time_order"),
        sa.ForeignKeyConstraint(
            ["company_id", "professional_id"], ["professionals.company_id", "professionals.id"],
            name="fk_professional_weekly_company_professional", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id", "professional_id", "weekday", "start_time", "end_time",
            name="uq_professional_weekly_exact_interval",
        ),
    )
    op.create_index(
        "ix_professional_weekly_company_professional_weekday",
        "professional_weekly_availability",
        ["company_id", "professional_id", "weekday"],
    )

    op.create_table(
        "professional_availability_exceptions",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("professional_id", sa.UUID(), nullable=False),
        sa.Column("local_date", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(length=11), nullable=False),
        sa.Column("start_time", sa.Time(timezone=False), nullable=True),
        sa.Column("end_time", sa.Time(timezone=False), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("kind IN ('AVAILABLE', 'UNAVAILABLE')", name="ck_professional_exception_kind"),
        sa.CheckConstraint(
            "(start_time IS NULL AND end_time IS NULL) OR "
            "(start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)",
            name="ck_professional_exception_time_pair",
        ),
        sa.CheckConstraint(
            "kind = 'UNAVAILABLE' OR (start_time IS NOT NULL AND end_time IS NOT NULL)",
            name="ck_professional_exception_available_timed",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "professional_id"], ["professionals.company_id", "professionals.id"],
            name="fk_professional_exception_company_professional", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id", "professional_id", "local_date", "kind", "start_time", "end_time",
            name="uq_professional_exception_exact_interval",
            postgresql_nulls_not_distinct=True,
        ),
    )
    op.create_index(
        "ix_professional_exception_company_professional_date",
        "professional_availability_exceptions",
        ["company_id", "professional_id", "local_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_professional_exception_company_professional_date", table_name="professional_availability_exceptions")
    op.drop_table("professional_availability_exceptions")
    op.drop_index("ix_professional_weekly_company_professional_weekday", table_name="professional_weekly_availability")
    op.drop_table("professional_weekly_availability")
