"""expand professional profile

Revision ID: e9c1f2a3b4d5
Revises: d5f1a8c73b20
Create Date: 2026-09-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e9c1f2a3b4d5"
down_revision: Union[str, Sequence[str], None] = "d5f1a8c73b20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "professionals",
        sa.Column("full_name", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("social_name", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("cpf", sa.String(length=11), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("birth_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("email", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("phone", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("whatsapp", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("profession", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("category", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "professionals",
        sa.Column("administrative_notes", sa.Text(), nullable=True),
    )

    op.execute(
        sa.text(
            "UPDATE professionals SET full_name = display_name "
            "WHERE full_name IS NULL"
        )
    )
    op.alter_column("professionals", "full_name", nullable=False)
    op.create_check_constraint(
        "ck_professionals_cpf_digits",
        "professionals",
        "cpf IS NULL OR cpf ~ '^[0-9]{11}$'",
    )
    op.create_index(
        "uq_professionals_company_cpf_active",
        "professionals",
        ["company_id", "cpf"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND cpf IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_professionals_company_cpf_active",
        table_name="professionals",
    )
    op.drop_constraint(
        "ck_professionals_cpf_digits",
        "professionals",
        type_="check",
    )
    op.drop_column("professionals", "administrative_notes")
    op.drop_column("professionals", "category")
    op.drop_column("professionals", "profession")
    op.drop_column("professionals", "whatsapp")
    op.drop_column("professionals", "phone")
    op.drop_column("professionals", "email")
    op.drop_column("professionals", "birth_date")
    op.drop_column("professionals", "cpf")
    op.drop_column("professionals", "social_name")
    op.drop_column("professionals", "full_name")
