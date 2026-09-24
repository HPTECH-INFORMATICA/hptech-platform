"""create landing pages

Revision ID: c4e8a1d52f90
Revises: b3f9c2d71a40
Create Date: 2026-09-24

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c4e8a1d52f90"
down_revision: Union[str, Sequence[str], None] = "b3f9c2d71a40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "landing_pages",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column(
            "status",
            sa.String(length=30),
            server_default=sa.text("'DRAFT'"),
            nullable=False,
        ),
        sa.Column(
            "template",
            sa.String(length=40),
            server_default=sa.text("'BLANK'"),
            nullable=False,
        ),
        sa.Column(
            "content",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text(
                "'{\"version\": 1, \"blocks\": []}'::jsonb"
            ),
            nullable=False,
        ),
        sa.Column(
            "seo",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{\"no_index\": false}'::jsonb"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')",
            name="ck_landing_pages_status",
        ),
        sa.CheckConstraint(
            "template IN ('BLANK', 'LEAD_CAPTURE', 'SERVICE_PROMOTION')",
            name="ck_landing_pages_template",
        ),
        sa.CheckConstraint(
            "slug = lower(slug) "
            "AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'",
            name="ck_landing_pages_slug_format",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(content) = 'object' "
            "AND content ->> 'version' = '1' "
            "AND jsonb_typeof(content -> 'blocks') = 'array'",
            name="ck_landing_pages_content_shape",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(seo) = 'object'",
            name="ck_landing_pages_seo_shape",
        ),
        sa.CheckConstraint(
            "status <> 'PUBLISHED' OR published_at IS NOT NULL",
            name="ck_landing_pages_published_at",
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "id",
            name="uq_landing_pages_company_id_id",
        ),
    )
    op.create_index(
        op.f("ix_landing_pages_company_id"),
        "landing_pages",
        ["company_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_landing_pages_slug"),
        "landing_pages",
        ["slug"],
        unique=False,
    )
    op.create_index(
        op.f("ix_landing_pages_status"),
        "landing_pages",
        ["status"],
        unique=False,
    )
    op.create_index(
        "uq_landing_pages_active_company_slug",
        "landing_pages",
        ["company_id", "slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_landing_pages_active_company_slug",
        table_name="landing_pages",
    )
    op.drop_index(
        op.f("ix_landing_pages_status"),
        table_name="landing_pages",
    )
    op.drop_index(
        op.f("ix_landing_pages_slug"),
        table_name="landing_pages",
    )
    op.drop_index(
        op.f("ix_landing_pages_company_id"),
        table_name="landing_pages",
    )
    op.drop_table("landing_pages")
