"""create landing page submission limits

Revision ID: d5f1a8c73b20
Revises: c4e8a1d52f90
Create Date: 2026-09-25

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5f1a8c73b20"
down_revision: Union[str, Sequence[str], None] = "c4e8a1d52f90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "landing_page_submission_limits",
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column(
            "window_started_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.CheckConstraint(
            "attempts >= 1",
            name="ck_landing_page_submission_limits_attempts_positive",
        ),
        sa.PrimaryKeyConstraint("key_hash"),
    )
    op.create_index(
        "ix_landing_page_submission_limits_window_started_at",
        "landing_page_submission_limits",
        ["window_started_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_landing_page_submission_limits_window_started_at",
        table_name="landing_page_submission_limits",
    )
    op.drop_table("landing_page_submission_limits")
