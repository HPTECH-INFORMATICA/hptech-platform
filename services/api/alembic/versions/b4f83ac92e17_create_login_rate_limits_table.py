"""create login rate limits table

Revision ID: b4f83ac92e17
Revises: 3dd650dd94f9
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4f83ac92e17"
down_revision: Union[str, Sequence[str], None] = "3dd650dd94f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "login_rate_limits",
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key_hash"),
    )


def downgrade() -> None:
    op.drop_table("login_rate_limits")
