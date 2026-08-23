import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user_invitation import UserInvitation


class UserInvitationRepository:
    @staticmethod
    def add(db: Session, invitation: UserInvitation) -> UserInvitation:
        db.add(invitation)
        return invitation

    @staticmethod
    def list_by_company(db: Session, company_id: uuid.UUID) -> list[UserInvitation]:
        statement = (
            select(UserInvitation)
            .where(UserInvitation.company_id == company_id)
            .order_by(UserInvitation.created_at.desc(), UserInvitation.id)
        )
        return list(db.execute(statement).scalars().all())

    @staticmethod
    def get_by_company_and_id(
        db: Session, company_id: uuid.UUID, invitation_id: uuid.UUID, *, for_update: bool = False
    ) -> UserInvitation | None:
        statement = select(UserInvitation).where(
            UserInvitation.company_id == company_id,
            UserInvitation.id == invitation_id,
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def get_pending_by_email(
        db: Session, company_id: uuid.UUID, email: str, now: datetime
    ) -> UserInvitation | None:
        return db.execute(
            select(UserInvitation).where(
                UserInvitation.company_id == company_id,
                func.lower(UserInvitation.email) == email,
                UserInvitation.accepted_at.is_(None),
                UserInvitation.revoked_at.is_(None),
                UserInvitation.expires_at > now,
            ).order_by(UserInvitation.created_at.desc()).limit(1)
        ).scalar_one_or_none()

    @staticmethod
    def get_by_token_hash_for_update(db: Session, token_hash: str) -> UserInvitation | None:
        return db.execute(
            select(UserInvitation)
            .where(UserInvitation.token_hash == token_hash)
            .with_for_update()
        ).scalar_one_or_none()
