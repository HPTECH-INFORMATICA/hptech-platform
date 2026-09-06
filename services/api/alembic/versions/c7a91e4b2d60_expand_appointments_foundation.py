"""expand appointments foundation

Revision ID: c7a91e4b2d60
Revises: b6e4d2a91c73
Create Date: 2026-09-03
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7a91e4b2d60"
down_revision: Union[str, Sequence[str], None] = "b6e4d2a91c73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_services_company_id_id",
        "services",
        ["company_id", "id"],
    )
    op.create_unique_constraint(
        "uq_leads_company_id_id",
        "leads",
        ["company_id", "id"],
    )
    op.create_unique_constraint(
        "uq_appointments_company_id_id",
        "appointments",
        ["company_id", "id"],
    )

    op.add_column(
        "appointments",
        sa.Column("patient_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("clinical_professional_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("service_name_snapshot", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("service_duration_minutes_snapshot", sa.Integer(), nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("service_price_snapshot", sa.Numeric(12, 2), nullable=True),
    )

    op.create_index(
        "ix_appointments_patient_id",
        "appointments",
        ["patient_id"],
    )
    op.create_index(
        "ix_appointments_clinical_professional_id",
        "appointments",
        ["clinical_professional_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_appointments_clinical_professional_id",
        table_name="appointments",
    )
    op.drop_index(
        "ix_appointments_patient_id",
        table_name="appointments",
    )

    op.drop_column("appointments", "service_price_snapshot")
    op.drop_column("appointments", "service_duration_minutes_snapshot")
    op.drop_column("appointments", "service_name_snapshot")
    op.drop_column("appointments", "clinical_professional_id")
    op.drop_column("appointments", "patient_id")

    op.drop_constraint(
        "uq_appointments_company_id_id",
        "appointments",
        type_="unique",
    )
    op.drop_constraint(
        "uq_leads_company_id_id",
        "leads",
        type_="unique",
    )
    op.drop_constraint(
        "uq_services_company_id_id",
        "services",
        type_="unique",
    )
