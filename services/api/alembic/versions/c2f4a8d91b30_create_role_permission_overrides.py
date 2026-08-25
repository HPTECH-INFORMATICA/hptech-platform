"""create role permission overrides

Revision ID: c2f4a8d91b30
Revises: 7e918a6c3f20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2f4a8d91b30"
down_revision: Union[str, Sequence[str], None] = "7e918a6c3f20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "role_permission_overrides",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("allowed", sa.Boolean(), nullable=False),
        sa.Column("updated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "role", "module", "action", name="uq_role_permission_override_scope"),
    )
    op.create_index("ix_role_permission_overrides_company_id", "role_permission_overrides", ["company_id"])
    op.create_index("ix_role_permission_overrides_updated_by_user_id", "role_permission_overrides", ["updated_by_user_id"])
    op.create_index("ix_role_permission_overrides_company_role", "role_permission_overrides", ["company_id", "role"])


def downgrade() -> None:
    op.drop_index("ix_role_permission_overrides_company_role", table_name="role_permission_overrides")
    op.drop_index("ix_role_permission_overrides_updated_by_user_id", table_name="role_permission_overrides")
    op.drop_index("ix_role_permission_overrides_company_id", table_name="role_permission_overrides")
    op.drop_table("role_permission_overrides")
