"""add company timezone

Revision ID: a4c7e2f91b60
Revises: f2a6c9e41d73
Create Date: 2026-08-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a4c7e2f91b60"
down_revision: Union[str, Sequence[str], None] = "f2a6c9e41d73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("timezone", sa.String(length=64), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE companies "
            "SET timezone = 'America/Sao_Paulo' "
            "WHERE timezone IS NULL"
        )
    )
    remaining_nulls = op.get_bind().execute(
        sa.text("SELECT count(1) FROM companies WHERE timezone IS NULL")
    ).scalar_one()
    if remaining_nulls:
        raise RuntimeError("Company timezone backfill incompleto.")
    op.alter_column(
        "companies",
        "timezone",
        existing_type=sa.String(length=64),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("companies", "timezone")
