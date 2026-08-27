"""create professionals

Revision ID: f2a6c9e41d73
Revises: d7f3a9c21b40
Create Date: 2026-08-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2a6c9e41d73"
down_revision: Union[str, Sequence[str], None] = "d7f3a9c21b40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_users_company_id_id",
        "users",
        ["company_id", "id"],
    )
    op.create_table(
        "professionals",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("display_name", sa.String(length=150), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
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
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "user_id"],
            ["users.company_id", "users.id"],
            name="fk_professionals_company_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "id",
            name="uq_professionals_company_id_id",
        ),
        sa.UniqueConstraint(
            "company_id",
            "user_id",
            name="uq_professionals_company_id_user_id",
        ),
    )
    op.create_index(
        "ix_professionals_company_id",
        "professionals",
        ["company_id"],
    )
    op.create_index(
        "ix_professionals_user_id",
        "professionals",
        ["user_id"],
    )
    op.create_index(
        "ix_professionals_is_active",
        "professionals",
        ["is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_professionals_is_active", table_name="professionals")
    op.drop_index("ix_professionals_user_id", table_name="professionals")
    op.drop_index("ix_professionals_company_id", table_name="professionals")
    op.drop_table("professionals")
    op.drop_constraint("uq_users_company_id_id", "users", type_="unique")
