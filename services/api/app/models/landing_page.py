import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class LandingPage(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "landing_pages"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "id",
            name="uq_landing_pages_company_id_id",
        ),
        CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')",
            name="ck_landing_pages_status",
        ),
        CheckConstraint(
            "template IN ('BLANK', 'LEAD_CAPTURE', 'SERVICE_PROMOTION')",
            name="ck_landing_pages_template",
        ),
        CheckConstraint(
            "slug = lower(slug) "
            "AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'",
            name="ck_landing_pages_slug_format",
        ),
        CheckConstraint(
            "jsonb_typeof(content) = 'object' "
            "AND content ->> 'version' = '1' "
            "AND jsonb_typeof(content -> 'blocks') = 'array'",
            name="ck_landing_pages_content_shape",
        ),
        CheckConstraint(
            "jsonb_typeof(seo) = 'object'",
            name="ck_landing_pages_seo_shape",
        ),
        CheckConstraint(
            "status <> 'PUBLISHED' OR published_at IS NOT NULL",
            name="ck_landing_pages_published_at",
        ),
        Index(
            "uq_landing_pages_active_company_slug",
            "company_id",
            "slug",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
        server_default=text("'DRAFT'"),
        index=True,
    )
    template: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="BLANK",
        server_default=text("'BLANK'"),
    )
    content: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {"version": 1, "blocks": []},
        server_default=text("'{\"version\": 1, \"blocks\": []}'::jsonb"),
    )
    seo: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {"no_index": False},
        server_default=text("'{\"no_index\": false}'::jsonb"),
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    company = relationship("Company", back_populates="landing_pages")
