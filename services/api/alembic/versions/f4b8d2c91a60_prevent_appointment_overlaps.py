"""prevent appointment overlaps

Revision ID: f4b8d2c91a60
Revises: e1c4a7b92d30
Create Date: 2026-09-14
"""

from typing import Sequence, Union

from alembic import op


revision: str = "f4b8d2c91a60"
down_revision: Union[str, Sequence[str], None] = "e1c4a7b92d30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE appointments
        ADD CONSTRAINT ex_appointments_professional_schedule_overlap
        EXCLUDE USING gist (
            company_id WITH =,
            clinical_professional_id WITH =,
            tstzrange(starts_at, ends_at, '[)') WITH &&
        )
        WHERE (
            status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
            AND deleted_at IS NULL
        )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE appointments
        DROP CONSTRAINT ex_appointments_professional_schedule_overlap
        """
    )
