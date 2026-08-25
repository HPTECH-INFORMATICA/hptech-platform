import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.service import Service
from app.schemas.service import ServiceCreate


class ServiceRepository:
    @staticmethod
    def create(
        db: Session,
        company_id: uuid.UUID,
        data: ServiceCreate,
    ) -> Service:
        service = Service(
            company_id=company_id,
            is_active=True,
            **data.model_dump(),
        )
        db.add(service)
        db.flush()
        return service

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        service_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> Service | None:
        statement = select(Service).where(
            Service.company_id == company_id,
            Service.id == service_id,
            Service.deleted_at.is_(None),
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def list_by_company(
        db: Session,
        company_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None,
        is_active: bool | None,
        category: str | None,
    ) -> tuple[list[Service], int]:
        filters = [
            Service.company_id == company_id,
            Service.deleted_at.is_(None),
        ]
        if search:
            term = search.strip()
            if term:
                filters.append(
                    or_(
                        Service.name.icontains(term, autoescape=True),
                        Service.category.icontains(term, autoescape=True),
                    )
                )
        if is_active is not None:
            filters.append(Service.is_active.is_(is_active))
        if category:
            filters.append(Service.category == category.strip())

        total = db.scalar(
            select(func.count()).select_from(Service).where(*filters)
        ) or 0
        statement = (
            select(Service)
            .where(*filters)
            .order_by(Service.name.asc(), Service.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total
