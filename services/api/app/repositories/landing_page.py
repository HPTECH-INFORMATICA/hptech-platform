import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.landing_page import LandingPage
from app.schemas.landing_page import LandingPageStatus


class LandingPageRepository:
    @staticmethod
    def add(db: Session, landing_page: LandingPage) -> LandingPage:
        db.add(landing_page)
        db.flush()
        return landing_page

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        landing_page_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> LandingPage | None:
        statement = select(LandingPage).where(
            LandingPage.company_id == company_id,
            LandingPage.id == landing_page_id,
            LandingPage.deleted_at.is_(None),
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def get_by_slug(
        db: Session,
        company_id: uuid.UUID,
        slug: str,
    ) -> LandingPage | None:
        statement = select(LandingPage).where(
            LandingPage.company_id == company_id,
            LandingPage.slug == slug,
            LandingPage.deleted_at.is_(None),
        )
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def list_by_company(
        db: Session,
        company_id: uuid.UUID,
        *,
        status: LandingPageStatus | None,
        page: int,
        page_size: int,
    ) -> tuple[list[LandingPage], int]:
        filters = [
            LandingPage.company_id == company_id,
            LandingPage.deleted_at.is_(None),
        ]
        if status is not None:
            filters.append(LandingPage.status == status.value)

        total = db.scalar(
            select(func.count()).select_from(LandingPage).where(*filters)
        ) or 0
        statement = (
            select(LandingPage)
            .where(*filters)
            .order_by(LandingPage.updated_at.desc(), LandingPage.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total
