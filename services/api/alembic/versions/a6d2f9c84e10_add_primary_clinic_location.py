"""add primary clinic location

Revision ID: a6d2f9c84e10
Revises: e9c1f2a3b4d5
Create Date: 2026-10-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a6d2f9c84e10"
down_revision: Union[str, Sequence[str], None] = "e9c1f2a3b4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("primary_unit_name", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("address_line", sa.String(length=240), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("address_complement", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("address_district", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("address_city", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("address_state", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("address_postal_code", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("companies", "address_postal_code")
    op.drop_column("companies", "address_state")
    op.drop_column("companies", "address_city")
    op.drop_column("companies", "address_district")
    op.drop_column("companies", "address_complement")
    op.drop_column("companies", "address_line")
    op.drop_column("companies", "primary_unit_name")
