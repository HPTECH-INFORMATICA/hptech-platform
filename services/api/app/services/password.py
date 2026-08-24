import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.identity import AuthenticatedIdentity
from app.core.security import hash_password, validate_password, verify_password
from app.models.password_reset_token import PasswordResetToken
from app.repositories.audit_log import AuditLogRepository
from app.repositories.password_reset import PasswordResetRepository
from app.repositories.user import UserRepository, normalize_email
from app.services.auth import AuthenticationError, AuthService
from app.services.invitation_notifier import (
    InvitationDeliveryError,
    PasswordResetMessage,
    PasswordResetNotifier,
)


class PasswordResetInvalidError(RuntimeError):
    pass


class CurrentPasswordInvalidError(RuntimeError):
    pass


class SamePasswordError(RuntimeError):
    pass


def hash_password_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class PasswordService:
    GENERIC_MESSAGE = (
        "Se existir uma conta para esse email, enviaremos instruções para redefinir sua senha."
    )

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def request_reset(
        cls, db: Session, email: str, notifier: PasswordResetNotifier
    ) -> None:
        user = UserRepository.get_unique_by_email(db, normalize_email(email))
        if user is None:
            return
        try:
            AuthService.identity_from_user(user)
        except AuthenticationError:
            return
        now = cls._now()
        PasswordResetRepository.revoke_pending(db, user.id, now)
        plaintext = secrets.token_urlsafe(48)
        reset = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_password_reset_token(plaintext),
            expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_TTL_MINUTES),
            created_at=now,
        )
        PasswordResetRepository.add(db, reset)
        db.flush()
        AuditLogRepository.add(
            db, company_id=user.company_id, actor_user_id=user.id,
            target_type="USER", target_id=user.id,
            action="PASSWORD_RESET_REQUESTED", details={},
        )
        db.commit()
        try:
            notifier.send_password_reset(PasswordResetMessage(
                recipient=user.email,
                user_name=user.name,
                reset_url=(
                    f"{settings.FRONTEND_PUBLIC_URL.rstrip('/')}/redefinir-senha"
                    f"#token={quote(plaintext, safe='')}"
                ),
                expires_in_minutes=settings.PASSWORD_RESET_TTL_MINUTES,
            ))
        except InvitationDeliveryError:
            reset.revoked_at = cls._now()
            db.commit()

    @classmethod
    def reset_password(cls, db: Session, token: str, password: str) -> None:
        reset = PasswordResetRepository.get_by_hash_for_update(
            db, hash_password_reset_token(token)
        )
        now = cls._now()
        if (
            reset is None or reset.used_at is not None or reset.revoked_at is not None
            or reset.expires_at <= now
        ):
            raise PasswordResetInvalidError("Token inválido ou expirado.")
        user = UserRepository.get_by_id(db, reset.user_id)
        if user is None:
            raise PasswordResetInvalidError("Token inválido ou expirado.")
        try:
            AuthService.identity_from_user(user)
        except AuthenticationError as error:
            raise PasswordResetInvalidError("Token inválido ou expirado.") from error
        validate_password(password)
        user.password_hash = hash_password(password)
        user.auth_version += 1
        reset.used_at = now
        PasswordResetRepository.revoke_pending(
            db,
            user.id,
            now,
            exclude_id=reset.id,
        )
        AuditLogRepository.add(
            db, company_id=user.company_id, actor_user_id=user.id,
            target_type="USER", target_id=user.id,
            action="PASSWORD_RESET_COMPLETED", details={},
        )
        db.commit()

    @classmethod
    def change_password(
        cls, db: Session, identity: AuthenticatedIdentity,
        current_password: str, new_password: str,
    ) -> None:
        user = UserRepository.get_by_company_and_id(
            db, identity.company.id, identity.user.id, for_update=True
        )
        if user is None or not verify_password(current_password, user.password_hash):
            raise CurrentPasswordInvalidError("Senha atual inválida.")
        if verify_password(new_password, user.password_hash):
            raise SamePasswordError("A nova senha deve ser diferente da senha atual.")
        validate_password(new_password)
        user.password_hash = hash_password(new_password)
        user.auth_version += 1
        AuditLogRepository.add(
            db, company_id=user.company_id, actor_user_id=user.id,
            target_type="USER", target_id=user.id,
            action="PASSWORD_CHANGED", details={},
        )
        db.commit()
