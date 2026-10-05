"""link plan session reservations to appointments

Revision ID: d1f6a8c42b70
Revises: c9a4d7e21f60
Create Date: 2026-10-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1f6a8c42b70"
down_revision: Union[str, Sequence[str], None] = "c9a4d7e21f60"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "appointments",
        sa.Column("patient_plan_contract_item_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        "ix_appointments_patient_plan_contract_item_id",
        "appointments",
        ["patient_plan_contract_item_id"],
    )
    op.create_foreign_key(
        "fk_appointments_company_patient_plan_contract_item",
        "appointments",
        "patient_plan_contract_items",
        ["company_id", "patient_plan_contract_item_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )

    op.add_column(
        "session_ledger_entries",
        sa.Column("appointment_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        "ix_session_ledger_entries_appointment_id",
        "session_ledger_entries",
        ["appointment_id"],
    )
    op.create_foreign_key(
        "fk_session_ledger_company_appointment",
        "session_ledger_entries",
        "appointments",
        ["company_id", "appointment_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "uq_session_ledger_appointment_reserve",
        "session_ledger_entries",
        ["company_id", "appointment_id"],
        unique=True,
        postgresql_where=sa.text(
            "appointment_id IS NOT NULL AND event_type = 'RESERVE'"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_session_ledger_appointment_reserve",
        table_name="session_ledger_entries",
    )
    op.drop_constraint(
        "fk_session_ledger_company_appointment",
        "session_ledger_entries",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_session_ledger_entries_appointment_id",
        table_name="session_ledger_entries",
    )
    op.drop_column("session_ledger_entries", "appointment_id")

    op.drop_constraint(
        "fk_appointments_company_patient_plan_contract_item",
        "appointments",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_appointments_patient_plan_contract_item_id",
        table_name="appointments",
    )
    op.drop_column("appointments", "patient_plan_contract_item_id")
