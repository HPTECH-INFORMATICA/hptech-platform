"""harden appointments contract

Revision ID: e1c4a7b92d30
Revises: d8f3b1c6a920
Create Date: 2026-09-13
"""

from typing import Sequence, Union

from alembic import op


revision: str = "e1c4a7b92d30"
down_revision: Union[str, Sequence[str], None] = "d8f3b1c6a920"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CS-A02 was closed because Production had no Appointment rows. Keep the
    # table locked until this transaction commits so a concurrent writer cannot
    # invalidate that prerequisite between the check and the hardening below.
    op.execute("LOCK TABLE appointments IN ACCESS EXCLUSIVE MODE")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM appointments LIMIT 1) THEN
                RAISE EXCEPTION
                    'CS-A03.1 requires appointments to be empty; reopen CS-A02';
            END IF;
        END $$
        """
    )

    op.drop_constraint(
        "appointments_lead_id_fkey",
        "appointments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "appointments_professional_id_fkey",
        "appointments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "appointments_service_id_fkey",
        "appointments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "transactions_appointment_id_fkey",
        "transactions",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "fk_appointments_company_lead",
        "appointments",
        "leads",
        ["company_id", "lead_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_appointments_company_legacy_professional",
        "appointments",
        "users",
        ["company_id", "professional_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_appointments_company_patient",
        "appointments",
        "patients",
        ["company_id", "patient_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_appointments_company_clinical_professional",
        "appointments",
        "professionals",
        ["company_id", "clinical_professional_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_appointments_company_service",
        "appointments",
        "services",
        ["company_id", "service_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_transactions_company_appointment",
        "transactions",
        "appointments",
        ["company_id", "appointment_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )

    for column_name in (
        "patient_id",
        "clinical_professional_id",
        "service_id",
        "service_name_snapshot",
        "service_duration_minutes_snapshot",
        "service_price_snapshot",
    ):
        op.alter_column("appointments", column_name, nullable=False)

    op.create_check_constraint(
        "ck_appointments_ends_after_starts",
        "appointments",
        "ends_at > starts_at",
    )
    op.create_check_constraint(
        "ck_appointments_service_duration_positive",
        "appointments",
        "service_duration_minutes_snapshot > 0",
    )
    op.create_check_constraint(
        "ck_appointments_service_price_nonnegative",
        "appointments",
        "service_price_snapshot >= 0",
    )
    op.create_check_constraint(
        "ck_appointments_status_lifecycle",
        "appointments",
        "status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', "
        "'COMPLETED', 'CANCELED', 'NO_SHOW')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_appointments_status_lifecycle",
        "appointments",
        type_="check",
    )
    op.drop_constraint(
        "ck_appointments_service_price_nonnegative",
        "appointments",
        type_="check",
    )
    op.drop_constraint(
        "ck_appointments_service_duration_positive",
        "appointments",
        type_="check",
    )
    op.drop_constraint(
        "ck_appointments_ends_after_starts",
        "appointments",
        type_="check",
    )

    for column_name in (
        "service_price_snapshot",
        "service_duration_minutes_snapshot",
        "service_name_snapshot",
        "service_id",
        "clinical_professional_id",
        "patient_id",
    ):
        op.alter_column("appointments", column_name, nullable=True)

    op.drop_constraint(
        "fk_transactions_company_appointment",
        "transactions",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_appointments_company_service",
        "appointments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_appointments_company_clinical_professional",
        "appointments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_appointments_company_patient",
        "appointments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_appointments_company_legacy_professional",
        "appointments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_appointments_company_lead",
        "appointments",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "transactions_appointment_id_fkey",
        "transactions",
        "appointments",
        ["appointment_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "appointments_service_id_fkey",
        "appointments",
        "services",
        ["service_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "appointments_professional_id_fkey",
        "appointments",
        "users",
        ["professional_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "appointments_lead_id_fkey",
        "appointments",
        "leads",
        ["lead_id"],
        ["id"],
        ondelete="SET NULL",
    )
