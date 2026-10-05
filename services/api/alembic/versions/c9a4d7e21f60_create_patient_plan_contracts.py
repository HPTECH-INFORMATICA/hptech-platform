"""create patient plan contracts and immutable session ledger

Revision ID: c9a4d7e21f60
Revises: b7e3c1a94f20
Create Date: 2026-10-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c9a4d7e21f60"
down_revision: Union[str, Sequence[str], None] = "b7e3c1a94f20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patient_plan_contracts",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("patient_id", sa.UUID(), nullable=False),
        sa.Column("treatment_plan_id", sa.UUID(), nullable=False),
        sa.Column("plan_name_snapshot", sa.String(150), nullable=False),
        sa.Column("plan_description_snapshot", sa.Text(), nullable=True),
        sa.Column("price_snapshot", sa.Numeric(12, 2), nullable=False),
        sa.Column("validity_days_snapshot", sa.Integer(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("expires_on", sa.Date(), nullable=False),
        sa.Column("payment_due_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("contracted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('ACTIVE', 'CANCELED', 'EXPIRED', 'COMPLETED')", name="ck_patient_plan_contracts_status"),
        sa.CheckConstraint("price_snapshot >= 0", name="ck_patient_plan_contracts_price_nonnegative"),
        sa.CheckConstraint("validity_days_snapshot > 0", name="ck_patient_plan_contracts_validity_positive"),
        sa.CheckConstraint("expires_on >= starts_on", name="ck_patient_plan_contracts_dates"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id", "patient_id"], ["patients.company_id", "patients.id"], name="fk_patient_plan_contracts_company_patient", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["company_id", "treatment_plan_id"], ["treatment_plans.company_id", "treatment_plans.id"], name="fk_patient_plan_contracts_company_plan", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "id", name="uq_patient_plan_contracts_company_id_id"),
    )
    for column in ("company_id", "patient_id", "treatment_plan_id", "status"):
        op.create_index(f"ix_patient_plan_contracts_{column}", "patient_plan_contracts", [column])

    op.create_table(
        "patient_plan_contract_items",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("contract_id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=False),
        sa.Column("service_name_snapshot", sa.String(150), nullable=False),
        sa.Column("paid_sessions_snapshot", sa.Integer(), nullable=False),
        sa.Column("complimentary_sessions_snapshot", sa.Integer(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("paid_sessions_snapshot > 0", name="ck_patient_plan_contract_items_paid_positive"),
        sa.CheckConstraint("complimentary_sessions_snapshot >= 0", name="ck_patient_plan_contract_items_courtesy_nonnegative"),
        sa.ForeignKeyConstraint(["company_id", "contract_id"], ["patient_plan_contracts.company_id", "patient_plan_contracts.id"], name="fk_patient_plan_contract_items_company_contract", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id", "service_id"], ["services.company_id", "services.id"], name="fk_patient_plan_contract_items_company_service", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "id", name="uq_patient_plan_contract_items_company_id_id"),
        sa.UniqueConstraint("company_id", "contract_id", "service_id", name="uq_patient_plan_contract_items_service"),
    )
    for column in ("company_id", "contract_id", "service_id"):
        op.create_index(f"ix_patient_plan_contract_items_{column}", "patient_plan_contract_items", [column])

    op.create_table(
        "session_ledger_entries",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("contract_id", sa.UUID(), nullable=False),
        sa.Column("contract_item_id", sa.UUID(), nullable=False),
        sa.Column("event_type", sa.String(20), nullable=False),
        sa.Column("bucket", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.UUID(), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.CheckConstraint("event_type IN ('CREDIT', 'RESERVE', 'RELEASE', 'CONSUME', 'RESTORE', 'EXPIRE')", name="ck_session_ledger_event_type"),
        sa.CheckConstraint("bucket IN ('PAID', 'COURTESY')", name="ck_session_ledger_bucket"),
        sa.CheckConstraint("quantity > 0", name="ck_session_ledger_quantity_positive"),
        sa.ForeignKeyConstraint(["company_id", "contract_id"], ["patient_plan_contracts.company_id", "patient_plan_contracts.id"], name="fk_session_ledger_company_contract", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["company_id", "contract_item_id"], ["patient_plan_contract_items.company_id", "patient_plan_contract_items.id"], name="fk_session_ledger_company_contract_item", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("company_id", "contract_id", "contract_item_id", "event_type", "occurred_at"):
        op.create_index(f"ix_session_ledger_entries_{column}", "session_ledger_entries", [column])
    op.execute("""
        CREATE FUNCTION prevent_session_ledger_mutation() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'session ledger entries are immutable'; END;
        $$ LANGUAGE plpgsql
    """)
    op.execute("""
        CREATE TRIGGER trg_session_ledger_immutable
        BEFORE UPDATE OR DELETE ON session_ledger_entries
        FOR EACH ROW EXECUTE FUNCTION prevent_session_ledger_mutation()
    """)

    op.add_column("transactions", sa.Column("patient_plan_contract_id", sa.UUID(), nullable=True))
    op.create_index("ix_transactions_patient_plan_contract_id", "transactions", ["patient_plan_contract_id"])
    op.create_foreign_key("fk_transactions_company_patient_plan_contract", "transactions", "patient_plan_contracts", ["company_id", "patient_plan_contract_id"], ["company_id", "id"], ondelete="RESTRICT")
    op.create_index("uq_transactions_active_income_patient_plan_contract", "transactions", ["company_id", "patient_plan_contract_id"], unique=True, postgresql_where=sa.text("patient_plan_contract_id IS NOT NULL AND transaction_type = 'INCOME' AND deleted_at IS NULL"))


def downgrade() -> None:
    op.drop_index("uq_transactions_active_income_patient_plan_contract", table_name="transactions")
    op.drop_constraint("fk_transactions_company_patient_plan_contract", "transactions", type_="foreignkey")
    op.drop_index("ix_transactions_patient_plan_contract_id", table_name="transactions")
    op.drop_column("transactions", "patient_plan_contract_id")
    op.execute("DROP TRIGGER trg_session_ledger_immutable ON session_ledger_entries")
    op.execute("DROP FUNCTION prevent_session_ledger_mutation()")
    op.drop_table("session_ledger_entries")
    op.drop_table("patient_plan_contract_items")
    op.drop_table("patient_plan_contracts")
