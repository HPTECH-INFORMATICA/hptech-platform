from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.login_rate_limit import LoginRateLimit
from app.repositories.login_rate_limit import LoginRateLimitRepository
from app.repositories.user import normalize_email


class LoginRateLimitExceeded(RuntimeError):
    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__("Limite temporário de tentativas de login excedido.")


class LoginRateLimiter:
    @staticmethod
    def _key(email: str, client_host: str) -> str:
        material = f"{normalize_email(email)}\0{client_host}".encode("utf-8")
        return hmac.new(
            settings.JWT_SECRET.get_secret_value().encode("utf-8"),
            material,
            sha256,
        ).hexdigest()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def ensure_allowed(cls, db: Session, email: str, client_host: str) -> None:
        record = LoginRateLimitRepository.get_for_update(
            db,
            cls._key(email, client_host),
        )

        if record is None:
            return

        now = cls._now()
        window_end = record.window_started_at + timedelta(
            seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS
        )

        if window_end <= now:
            LoginRateLimitRepository.delete(db, record.key_hash)
            return

        if record.attempts >= settings.LOGIN_RATE_LIMIT_ATTEMPTS:
            retry_after = max(1, int((window_end - now).total_seconds()) + 1)
            raise LoginRateLimitExceeded(retry_after)

    @classmethod
    def record_failure(cls, db: Session, email: str, client_host: str) -> None:
        LoginRateLimitRepository.record_failure(
            db,
            cls._key(email, client_host),
            cls._now(),
            settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
        )

    @classmethod
    def clear(cls, db: Session, email: str, client_host: str) -> None:
        LoginRateLimitRepository.delete(db, cls._key(email, client_host))
