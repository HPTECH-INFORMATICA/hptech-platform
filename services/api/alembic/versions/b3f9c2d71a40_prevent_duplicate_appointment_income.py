"""prevent duplicate appointment income

Revision ID: b3f9c2d71a40
Revises: a2e7c1f94d30
Create Date: 2026-09-23

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b3f9c2d71a40"
down_revision: Union[str, Sequence[str], None] = "a2e7c1f94d30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM transactions
                WHERE appointment_id IS NOT NULL
                  AND transaction_type = 'INCOME'
                  AND deleted_at IS NULL
                GROUP BY company_id, appointment_id
                HAVING COUNT(*) > 1
            ) THEN
                RAISE EXCEPTION
                    'Financial migration blocked: duplicate active appointment income';
            END IF;
        END
        $$;
        """
    )
    op.create_index(
        "uq_transactions_active_income_appointment",
        "transactions",
        ["company_id", "appointment_id"],
        unique=True,
        postgresql_where=sa.text(
            "appointment_id IS NOT NULL "
            "AND transaction_type = 'INCOME' "
            "AND deleted_at IS NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_transactions_active_income_appointment",
        table_name="transactions",
    )
