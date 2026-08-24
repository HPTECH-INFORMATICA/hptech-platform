import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken


class PasswordResetRepository:
    @staticmethod
    def add(db: Session, token: PasswordResetToken) -> PasswordResetToken:
        db.add(token)
        return token

    @staticmethod
    def revoke_pending(
        db: Session,
        user_id: uuid.UUID,
        now: datetime,
        *,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        conditions = [
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.revoked_at.is_(None),
        ]
        if exclude_id is not None:
            conditions.append(PasswordResetToken.id != exclude_id)

        db.execute(
            update(PasswordResetToken)
            .where(*conditions)
            .values(revoked_at=now)
        )

    @staticmethod
    def get_by_hash_for_update(db: Session, token_hash: str) -> PasswordResetToken | None:
        return db.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .with_for_update()
        ).scalar_one_or_none()
