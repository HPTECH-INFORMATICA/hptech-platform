import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.user import User


class AmbiguousUserEmailError(RuntimeError):
    """Raised when an email cannot identify exactly one active record."""


def normalize_email(email: str) -> str:
    return email.strip().lower()


class UserRepository:
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
