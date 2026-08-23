import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.identity import AuthenticatedIdentity, UserRole
from app.core.security import hash_password
from app.models.user import User
from app.models.user_invitation import UserInvitation
from app.repositories.audit_log import AuditLogRepository
from app.repositories.user import UserRepository, normalize_email
from app.repositories.user_invitation import UserInvitationRepository
from app.schemas.user_invitation import InvitationCreate
from app.services.invitation_notifier import (
    InvitationDeliveryError,
    InvitationMessage,
    InvitationNotifier,
)


class InvitationNotFoundError(RuntimeError): pass
class InvitationConflictError(RuntimeError): pass
class InvitationForbiddenError(RuntimeError): pass
class InvitationInvalidError(RuntimeError): pass


def hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class UserInvitationService:
    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def create(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        data: InvitationCreate,
        notifier: InvitationNotifier,
    ) -> UserInvitation:
        if data.role is UserRole.OWNER and identity.role is not UserRole.OWNER:
            raise InvitationForbiddenError
        email = normalize_email(str(data.email))
        if UserRepository.get_unique_by_email(db, email) is not None:
            raise InvitationConflictError("Email já utilizado por outro usuário.")
        now = cls._now()
        if UserInvitationRepository.get_pending_by_email(db, identity.company.id, email, now):
            raise InvitationConflictError("Já existe um convite pendente para este email.")
        token = secrets.token_urlsafe(48)
        invitation = UserInvitation(
            company_id=identity.company.id,
            email=email,
            name=data.name.strip(),
            role=data.role.value,
            token_hash=hash_invitation_token(token),
            expires_at=now + timedelta(hours=settings.USER_INVITATION_TTL_HOURS),
            invited_by_user_id=identity.user.id,
        )
        UserInvitationRepository.add(db, invitation)
        db.flush()
        AuditLogRepository.add(
            db, company_id=identity.company.id, actor_user_id=identity.user.id,
            target_type="USER_INVITATION", target_id=invitation.id,
            action="USER_INVITED", details={"role": invitation.role, "delivery": "PENDING"},
        )
        db.commit()
        try:
            notifier.send_invitation(InvitationMessage(
                recipient=email,
                invited_name=invitation.name,
                acceptance_url=(
                    f"{settings.FRONTEND_PUBLIC_URL.rstrip('/')}/aceitar-convite"
                    f"#token={quote(token, safe='')}"
                ),
                expires_in_hours=settings.USER_INVITATION_TTL_HOURS,
            ))
        except InvitationDeliveryError:
            invitation.delivery_status = "FAILED"
            invitation.delivery_failed_at = cls._now()
            AuditLogRepository.add(
                db, company_id=identity.company.id, actor_user_id=identity.user.id,
                target_type="USER_INVITATION", target_id=invitation.id,
                action="USER_INVITATION_DELIVERY_FAILED", details={"state": "FAILED"},
            )
            db.commit()
            return invitation
        invitation.delivery_status = "DELIVERED"
        invitation.delivered_at = cls._now()
        db.commit()
        return invitation

    @staticmethod
    def list(db: Session, identity: AuthenticatedIdentity) -> list[UserInvitation]:
        return UserInvitationRepository.list_by_company(db, identity.company.id)

    @classmethod
    def revoke(cls, db: Session, identity: AuthenticatedIdentity, invitation_id: uuid.UUID) -> None:
        invitation = UserInvitationRepository.get_by_company_and_id(
            db, identity.company.id, invitation_id, for_update=True
        )
        if invitation is None:
            raise InvitationNotFoundError
        if invitation.accepted_at is not None or invitation.revoked_at is not None:
            raise InvitationConflictError("O convite não está pendente.")
        invitation.revoked_at = cls._now()
        AuditLogRepository.add(
            db, company_id=identity.company.id, actor_user_id=identity.user.id,
            target_type="USER_INVITATION", target_id=invitation.id,
            action="USER_INVITATION_REVOKED", details={"state": "REVOKED"},
        )
        db.commit()

    @classmethod
    def accept(cls, db: Session, token: str, password: str) -> User:
        invitation = UserInvitationRepository.get_by_token_hash_for_update(
            db, hash_invitation_token(token)
        )
        now = cls._now()
        if (
            invitation is None or invitation.accepted_at is not None
            or invitation.revoked_at is not None or invitation.expires_at <= now
        ):
            raise InvitationInvalidError("Convite inválido ou expirado.")
        if UserRepository.get_unique_by_email(db, invitation.email) is not None:
            raise InvitationConflictError("O convite não pode mais ser aceito.")
        user = User(
            company_id=invitation.company_id, name=invitation.name,
            email=invitation.email, role=invitation.role,
            password_hash=hash_password(password), is_active=True,
        )
        db.add(user)
        db.flush()
        invitation.accepted_at = now
        AuditLogRepository.add(
            db, company_id=invitation.company_id, actor_user_id=None,
            target_type="USER_INVITATION", target_id=invitation.id,
            action="USER_INVITATION_ACCEPTED", details={"user_id": str(user.id), "role": user.role},
        )
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise InvitationConflictError("O convite não pode mais ser aceito.") from error
        return user
