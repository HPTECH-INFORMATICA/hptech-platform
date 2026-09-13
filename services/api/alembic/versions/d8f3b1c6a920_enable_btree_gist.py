"""enable btree_gist

Revision ID: d8f3b1c6a920
Revises: c7a91e4b2d60
Create Date: 2026-09-11
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d8f3b1c6a920"
down_revision: Union[str, Sequence[str], None] = "c7a91e4b2d60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")


def downgrade() -> None:
    # Extensions can be shared infrastructure. Removing btree_gist
    # automatically could break database objects outside this migration.
    pass
