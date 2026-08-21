import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.identity import UserRole
from app.models.company import Company
from app.models.user import User


class AmbiguousUserEmailError(RuntimeError):
    """Raised when an email cannot identify exactly one active record."""


def normalize_email(email: str) -> str:
    return email.strip().lower()


class UserRepository:
    @staticmethod
    def list_by_company(
        db: Session,
        company_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        filters = [
            User.company_id == company_id,
            User.deleted_at.is_(None),
        ]
        if search:
            term = search.strip()
            filters.append(
                or_(
                    User.name.icontains(term, autoescape=True),
                    User.email.icontains(term, autoescape=True),
                )
            )
        if role is not None:
            filters.append(User.role == role.value)
        if is_active is not None:
            filters.append(User.is_active == is_active)

        total = db.scalar(select(func.count()).select_from(User).where(*filters)) or 0
        statement = (
            select(User)
            .where(*filters)
            .order_by(func.lower(User.name), User.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total

    @staticmethod
    def get_by_company_and_id(
        db: Session,
        company_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> User | None:
        statement = select(User).where(
            User.company_id == company_id,
            User.id == user_id,
            User.deleted_at.is_(None),
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def lock_company(db: Session, company_id: uuid.UUID) -> None:
        db.execute(
            select(Company.id)
            .where(Company.id == company_id)
            .with_for_update()
        ).scalar_one()

    @staticmethod
    def count_active_owners(db: Session, company_id: uuid.UUID) -> int:
        return db.scalar(
            select(func.count())
            .select_from(User)
            .where(
                User.company_id == company_id,
                User.role == UserRole.OWNER.value,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        ) or 0

    @staticmethod
    def get_unique_by_email(
        db: Session,
        email: str,
    ) -> User | None:
        normalized_email = normalize_email(email)
        statement = (
            select(User)
            .options(joinedload(User.company))
            .where(
                func.lower(func.trim(User.email)) == normalized_email,
                User.deleted_at.is_(None),
            )
            .limit(2)
        )
        users = list(db.execute(statement).scalars().all())

        if len(users) > 1:
            raise AmbiguousUserEmailError(
                "Mais de um usuário corresponde ao email normalizado."
            )

        return users[0] if users else None

    @staticmethod
    def get_by_id(
        db: Session,
        user_id: uuid.UUID,
    ) -> User | None:
        statement = (
            select(User)
            .options(joinedload(User.company))
            .where(
                User.id == user_id,
                User.deleted_at.is_(None),
            )
        )

        return db.execute(statement).scalar_one_or_none()
