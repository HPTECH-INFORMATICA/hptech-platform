"""harden financial transactions

Revision ID: a2e7c1f94d30
Revises: f4b8d2c91a60
Create Date: 2026-09-23

"""

from typing import Sequence, Union

from alembic import op


revision: str = "a2e7c1f94d30"
down_revision: Union[str, Sequence[str], None] = "f4b8d2c91a60"
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
                WHERE transaction_type NOT IN ('INCOME', 'EXPENSE')
                   OR status NOT IN ('PENDING', 'PAID', 'CANCELED')
                   OR amount <= 0
                   OR (status = 'PAID' AND paid_date IS NULL)
                   OR (status <> 'PAID' AND paid_date IS NOT NULL)
            ) THEN
                RAISE EXCEPTION
                    'Financial migration blocked: incompatible transaction data';
            END IF;

            IF EXISTS (
                SELECT 1
                FROM transactions AS transaction
                WHERE transaction.lead_id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1
                      FROM leads AS lead
                      WHERE lead.company_id = transaction.company_id
                        AND lead.id = transaction.lead_id
                  )
            ) THEN
                RAISE EXCEPTION
                    'Financial migration blocked: cross-tenant lead reference';
            END IF;
        END
        $$;
        """
    )

    op.create_unique_constraint(
        "uq_transactions_company_id_id",
        "transactions",
        ["company_id", "id"],
    )
    op.drop_constraint(
        "transactions_lead_id_fkey",
        "transactions",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "fk_transactions_company_lead",
        "transactions",
        "leads",
        ["company_id", "lead_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_transactions_type",
        "transactions",
        "transaction_type IN ('INCOME', 'EXPENSE')",
    )
    op.create_check_constraint(
        "ck_transactions_status",
        "transactions",
        "status IN ('PENDING', 'PAID', 'CANCELED')",
    )
    op.create_check_constraint(
        "ck_transactions_amount_positive",
        "transactions",
        "amount > 0",
    )
    op.create_check_constraint(
        "ck_transactions_paid_date_matches_status",
        "transactions",
        "(status = 'PAID' AND paid_date IS NOT NULL) OR "
        "(status <> 'PAID' AND paid_date IS NULL)",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_transactions_paid_date_matches_status",
        "transactions",
        type_="check",
    )
    op.drop_constraint(
        "ck_transactions_amount_positive",
        "transactions",
        type_="check",
    )
    op.drop_constraint(
        "ck_transactions_status",
        "transactions",
        type_="check",
    )
    op.drop_constraint(
        "ck_transactions_type",
        "transactions",
        type_="check",
    )
    op.drop_constraint(
        "fk_transactions_company_lead",
        "transactions",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "transactions_lead_id_fkey",
        "transactions",
        "leads",
        ["lead_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.drop_constraint(
        "uq_transactions_company_id_id",
        "transactions",
        type_="unique",
    )
