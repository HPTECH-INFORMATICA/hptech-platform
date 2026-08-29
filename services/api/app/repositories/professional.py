import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, case, exists, func, or_, select
from sqlalchemy.orm import Session

from app.models.professional import Professional
from app.models.user import User
from app.schemas.professional import ProfessionalCreate


class ProfessionalRepository:
    @staticmethod
    def create(
        db: Session,
        company_id: uuid.UUID,
        data: ProfessionalCreate,
    ) -> Professional:
        professional = Professional(
            company_id=company_id,
            display_name=data.display_name,
            user_id=data.user_id,
            is_active=True,
        )
        db.add(professional)
        db.flush()
        return professional

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        professional_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> Professional | None:
        statement = select(Professional).where(
            Professional.company_id == company_id,
            Professional.id == professional_id,
            Professional.deleted_at.is_(None),
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
    ) -> tuple[list[Professional], int]:
        filters = [
            Professional.company_id == company_id,
            Professional.deleted_at.is_(None),
        ]
        if search and (term := search.strip()):
            filters.append(Professional.display_name.icontains(term, autoescape=True))
        if is_active is not None:
            filters.append(Professional.is_active.is_(is_active))

        total = db.scalar(
            select(func.count()).select_from(Professional).where(*filters)
        ) or 0
        statement = (
            select(Professional)
            .where(*filters)
            .order_by(Professional.display_name.asc(), Professional.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total

    @staticmethod
    def get_eligible_user(
        db: Session,
        company_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> User | None:
        return db.execute(
            select(User).where(
                User.company_id == company_id,
                User.id == user_id,
                User.deleted_at.is_(None),
            )
        ).scalar_one_or_none()

    @staticmethod
    def get_by_user_id(
        db: Session,
        company_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        exclude_professional_id: uuid.UUID | None = None,
    ) -> Professional | None:
        filters = [
            Professional.company_id == company_id,
            Professional.user_id == user_id,
        ]
        if exclude_professional_id is not None:
            filters.append(Professional.id != exclude_professional_id)
        return db.execute(select(Professional).where(*filters)).scalar_one_or_none()

    @staticmethod
    def list_user_candidates(
        db: Session,
        company_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None,
        current_professional_id: uuid.UUID | None,
        current_user_id: uuid.UUID | None,
    ) -> tuple[list[User], int]:
        linked_to_another_professional = exists(
            select(Professional.id).where(
                Professional.company_id == company_id,
                Professional.user_id == User.id,
                *(
                    (Professional.id != current_professional_id,)
                    if current_professional_id is not None
                    else ()
                ),
            )
        )
        filters = [
            User.company_id == company_id,
            User.deleted_at.is_(None),
            ~linked_to_another_professional,
        ]
        if current_user_id is None:
            filters.append(User.is_active.is_(True))
        else:
            filters.append(
                or_(User.is_active.is_(True), User.id == current_user_id)
            )
        if search and (term := search.strip()):
            filters.append(
                or_(
                    User.name.icontains(term, autoescape=True),
                    User.email.icontains(term, autoescape=True),
                )
            )

        total = db.scalar(
            select(func.count()).select_from(User).where(and_(*filters))
        ) or 0
        ordering = (
            (
                case((User.id == current_user_id, 0), else_=1),
                func.lower(User.name),
                User.id,
            )
            if current_user_id is not None
            else (func.lower(User.name), User.id)
        )
        statement = (
            select(User)
            .where(and_(*filters))
            .order_by(*ordering)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total

    @staticmethod
    def update(
        professional: Professional,
        changes: dict[str, object],
    ) -> list[str]:
        changed: list[str] = []
        for field, value in changes.items():
            if getattr(professional, field) != value:
                setattr(professional, field, value)
                changed.append(field)
        return changed

    @staticmethod
    def change_status(professional: Professional, is_active: bool) -> bool:
        if professional.is_active is is_active:
            return False
        professional.is_active = is_active
        return True

    @staticmethod
    def soft_delete(professional: Professional) -> None:
        professional.is_active = False
        professional.deleted_at = datetime.now(timezone.utc)
