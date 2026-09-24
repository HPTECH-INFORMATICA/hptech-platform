from sqlalchemy import CheckConstraint, Index, UniqueConstraint, inspect

from app.db import base as _models  # noqa: F401
from app.models.company import Company
from app.models.landing_page import LandingPage


def test_landing_page_is_registered_in_metadata() -> None:
    assert "landing_pages" in LandingPage.metadata.tables


def test_landing_page_has_tenant_identity_and_cascade() -> None:
    unique_constraints = {
        constraint.name: tuple(constraint.columns.keys())
        for constraint in LandingPage.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert unique_constraints["uq_landing_pages_company_id_id"] == (
        "company_id",
        "id",
    )

    company_foreign_key = next(
        iter(LandingPage.__table__.foreign_key_constraints)
    )
    assert tuple(company_foreign_key.column_keys) == ("company_id",)
    assert company_foreign_key.ondelete == "CASCADE"


def test_landing_page_database_contract_is_registered() -> None:
    checks = {
        constraint.name: str(constraint.sqltext)
        for constraint in LandingPage.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    }

    assert set(checks) == {
        "ck_landing_pages_status",
        "ck_landing_pages_template",
        "ck_landing_pages_slug_format",
        "ck_landing_pages_content_shape",
        "ck_landing_pages_seo_shape",
        "ck_landing_pages_published_at",
    }
    assert "PUBLISHED" in checks["ck_landing_pages_status"]
    assert "LEAD_CAPTURE" in checks["ck_landing_pages_template"]
    assert "jsonb_typeof(content)" in checks["ck_landing_pages_content_shape"]
    assert "published_at IS NOT NULL" in checks["ck_landing_pages_published_at"]


def test_active_slug_is_unique_per_company() -> None:
    indexes = {
        index.name: index
        for index in LandingPage.__table__.indexes
        if isinstance(index, Index)
    }
    index = indexes["uq_landing_pages_active_company_slug"]

    assert index.unique is True
    assert tuple(index.columns.keys()) == ("company_id", "slug")
    assert str(index.dialect_options["postgresql"]["where"]) == (
        "deleted_at IS NULL"
    )


def test_company_relationship_is_bidirectional() -> None:
    landing_join = str(inspect(LandingPage).relationships["company"].primaryjoin)
    company_join = str(inspect(Company).relationships["landing_pages"].primaryjoin)

    assert "landing_pages.company_id" in landing_join
    assert "companies.id" in landing_join
    assert "landing_pages.company_id" in company_join
    assert "companies.id" in company_join
