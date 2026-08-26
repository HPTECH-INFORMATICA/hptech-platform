"""create service categories

Revision ID: b8c4e7a19f02
Revises: e7b94c1d2a63
Create Date: 2026-08-26 08:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c4e7a19f02"
down_revision: Union[str, Sequence[str], None] = "e7b94c1d2a63"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "service_categories",
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_service_categories_company_id", "service_categories", ["company_id"])
    op.create_index("ix_service_categories_is_active", "service_categories", ["is_active"])
    op.create_index(
        "uq_service_categories_company_normalized_name",
        "service_categories",
        ["company_id", sa.text("lower(regexp_replace(btrim(name), '\\s+', ' ', 'g'))")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.add_column("services", sa.Column("category_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_services_category_id_service_categories",
        "services",
        "service_categories",
        ["category_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_services_category_id", "services", ["category_id"])

    op.execute(
        """
        INSERT INTO service_categories (
            id, company_id, name, description, is_active,
            created_at, updated_at, deleted_at
        )
        SELECT
            gen_random_uuid(),
            company_id,
            min(regexp_replace(btrim(category), '\\s+', ' ', 'g')),
            NULL,
            bool_or(deleted_at IS NULL),
            min(created_at),
            max(updated_at),
            NULL
        FROM services
        WHERE category IS NOT NULL AND btrim(category) <> ''
        GROUP BY company_id, lower(regexp_replace(btrim(category), '\\s+', ' ', 'g'))
        """
    )
    op.execute(
        """
        UPDATE services AS service
        SET category_id = category.id
        FROM service_categories AS category
        WHERE category.company_id = service.company_id
          AND lower(regexp_replace(btrim(category.name), '\\s+', ' ', 'g')) =
              lower(regexp_replace(btrim(service.category), '\\s+', ' ', 'g'))
        """
    )
    op.drop_index("ix_services_category", table_name="services")
    op.drop_column("services", "category")
    op.alter_column("service_categories", "is_active", server_default=None)


def downgrade() -> None:
    op.add_column("services", sa.Column("category", sa.String(length=80), nullable=True))
    op.execute(
        """
        UPDATE services AS service
        SET category = category.name
        FROM service_categories AS category
        WHERE service.category_id = category.id
        """
    )
    op.create_index("ix_services_category", "services", ["category"])
    op.drop_index("ix_services_category_id", table_name="services")
    op.drop_constraint("fk_services_category_id_service_categories", "services", type_="foreignkey")
    op.drop_column("services", "category_id")
    op.drop_index("uq_service_categories_company_normalized_name", table_name="service_categories")
    op.drop_index("ix_service_categories_is_active", table_name="service_categories")
    op.drop_index("ix_service_categories_company_id", table_name="service_categories")
    op.drop_table("service_categories")
