"""create patients table

Revision ID: c61f4a2d9e73
Revises: b8c4e7a19f02
Create Date: 2026-08-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c61f4a2d9e73"
down_revision: Union[str, Sequence[str], None] = "b8c4e7a19f02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("whatsapp", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=150), nullable=True),
        sa.Column("document", sa.String(length=60), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_patients_company_id", "patients", ["company_id"])
    op.create_index("ix_patients_document", "patients", ["document"])
    op.create_index("ix_patients_is_active", "patients", ["is_active"])
    op.alter_column("patients", "is_active", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_patients_is_active", table_name="patients")
    op.drop_index("ix_patients_document", table_name="patients")
    op.drop_index("ix_patients_company_id", table_name="patients")
    op.drop_table("patients")
