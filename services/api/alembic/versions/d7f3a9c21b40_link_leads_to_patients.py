"""link leads to patients

Revision ID: d7f3a9c21b40
Revises: c61f4a2d9e73
Create Date: 2026-08-26 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7f3a9c21b40"
down_revision: Union[str, Sequence[str], None] = "c61f4a2d9e73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_patients_company_id_id",
        "patients",
        ["company_id", "id"],
    )
    op.add_column("leads", sa.Column("patient_id", sa.UUID(), nullable=True))
    op.create_index("ix_leads_patient_id", "leads", ["patient_id"])
    op.create_foreign_key(
        "fk_leads_company_patient",
        "leads",
        "patients",
        ["company_id", "patient_id"],
        ["company_id", "id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_leads_company_patient", "leads", type_="foreignkey")
    op.drop_index("ix_leads_patient_id", table_name="leads")
    op.drop_column("leads", "patient_id")
    op.drop_constraint(
        "uq_patients_company_id_id",
        "patients",
        type_="unique",
    )
