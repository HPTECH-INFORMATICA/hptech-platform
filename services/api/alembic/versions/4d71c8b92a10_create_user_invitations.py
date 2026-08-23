"""create user invitations

Revision ID: 4d71c8b92a10
Revises: a91c0f4e2b7d
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "4d71c8b92a10"
down_revision: Union[str, Sequence[str], None] = "a91c0f4e2b7d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_invitations",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invited_by_user_id", sa.UUID(), nullable=True),
        sa.Column("delivery_status", sa.String(30), nullable=False, server_default="PENDING"),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    for column in ("company_id", "email", "token_hash", "expires_at", "invited_by_user_id", "delivery_status"):
        op.create_index(f"ix_user_invitations_{column}", "user_invitations", [column])


def downgrade() -> None:
    op.drop_table("user_invitations")
