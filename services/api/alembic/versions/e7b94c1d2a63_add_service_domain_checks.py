"""add service domain checks

Revision ID: e7b94c1d2a63
Revises: c2f4a8d91b30
Create Date: 2026-08-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "e7b94c1d2a63"
down_revision: Union[str, Sequence[str], None] = "c2f4a8d91b30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_services_duration_minutes_positive",
        "services",
        "duration_minutes > 0",
    )
    op.create_check_constraint(
        "ck_services_price_nonnegative",
        "services",
        "price >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_services_price_nonnegative",
        "services",
        type_="check",
    )
    op.drop_constraint(
        "ck_services_duration_minutes_positive",
        "services",
        type_="check",
    )
