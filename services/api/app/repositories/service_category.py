import uuid

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session, with_expression

from app.models.service import Service
from app.models.service_category import ServiceCategory
from app.schemas.service_category import ServiceCategoryCreate


class ServiceCategoryRepository:
    @staticmethod
    def _has_services_expression(company_id: uuid.UUID):
        return exists(
            select(Service.id).where(
                Service.company_id == company_id,
                Service.category_id == ServiceCategory.id,
            )
        )

    @staticmethod
    def create(db: Session, company_id: uuid.UUID, data: ServiceCategoryCreate) -> ServiceCategory:
        category = ServiceCategory(company_id=company_id, is_active=True, **data.model_dump())
        db.add(category)
        db.flush()
        return category

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        category_id: uuid.UUID,
        *,
        for_update: bool = False,
        active_only: bool = False,
    ) -> ServiceCategory | None:
        statement = select(ServiceCategory).options(
            with_expression(
                ServiceCategory.has_services,
                ServiceCategoryRepository._has_services_expression(company_id),
            )
        ).where(
            ServiceCategory.company_id == company_id,
            ServiceCategory.id == category_id,
            ServiceCategory.deleted_at.is_(None),
        )
        if active_only:
            statement = statement.where(ServiceCategory.is_active.is_(True))
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def has_linked_services(
        db: Session,
        company_id: uuid.UUID,
        category_id: uuid.UUID,
    ) -> bool:
        statement = select(
            exists().where(
                Service.company_id == company_id,
                Service.category_id == category_id,
            )
        )
        return bool(db.scalar(statement))

    @staticmethod
    def list_by_company(
        db: Session,
        company_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None,
        is_active: bool | None,
    ) -> tuple[list[ServiceCategory], int]:
        filters = [
            ServiceCategory.company_id == company_id,
            ServiceCategory.deleted_at.is_(None),
        ]
        if search and search.strip():
            filters.append(ServiceCategory.name.icontains(search.strip(), autoescape=True))
        if is_active is not None:
            filters.append(ServiceCategory.is_active.is_(is_active))
        total = db.scalar(select(func.count()).select_from(ServiceCategory).where(*filters)) or 0
        statement = (
            select(ServiceCategory)
            .options(
                with_expression(
                    ServiceCategory.has_services,
                    ServiceCategoryRepository._has_services_expression(company_id),
                )
            )
            .where(*filters)
            .order_by(ServiceCategory.name.asc(), ServiceCategory.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total
