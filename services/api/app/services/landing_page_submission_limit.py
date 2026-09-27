from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac

from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.landing_page_submission_limit import (
    LandingPageSubmissionLimitRepository,
)


class LandingPageSubmissionRateLimitExceeded(RuntimeError):
    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__("Limite temporário de envios excedido.")


class LandingPageSubmissionRateLimiter:
    @staticmethod
    def _key(
        company_slug: str,
        page_slug: str,
        subject: str,
        client_host: str,
    ) -> str:
        material = (
            "landing-page-submission"
            f"\0{company_slug}\0{page_slug}\0{subject.lower()}\0{client_host}"
        ).encode("utf-8")
        return hmac.new(
            settings.JWT_SECRET.get_secret_value().encode("utf-8"),
            material,
            sha256,
        ).hexdigest()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def ensure_allowed(
        cls,
        db: Session,
        company_slug: str,
        page_slug: str,
        subject: str,
        client_host: str,
    ) -> None:
        key_hash = cls._key(company_slug, page_slug, subject, client_host)
        LandingPageSubmissionLimitRepository.lock_key(db, key_hash)
        record = LandingPageSubmissionLimitRepository.get_for_update(db, key_hash)
        if record is None:
            return

        now = cls._now()
        window_end = record.window_started_at + timedelta(
            seconds=settings.LANDING_PAGE_SUBMISSION_RATE_LIMIT_WINDOW_SECONDS
        )
        if window_end <= now:
            LandingPageSubmissionLimitRepository.delete(db, record.key_hash)
            return
        if (
            record.attempts
            >= settings.LANDING_PAGE_SUBMISSION_RATE_LIMIT_ATTEMPTS
        ):
            retry_after = max(1, int((window_end - now).total_seconds()) + 1)
            raise LandingPageSubmissionRateLimitExceeded(retry_after)

    @classmethod
    def record_attempt(
        cls,
        db: Session,
        company_slug: str,
        page_slug: str,
        subject: str,
        client_host: str,
    ) -> None:
        now = cls._now()
        LandingPageSubmissionLimitRepository.delete_expired(
            db,
            now
            - timedelta(
                seconds=(
                    settings.LANDING_PAGE_SUBMISSION_RATE_LIMIT_WINDOW_SECONDS
                )
            ),
        )
        LandingPageSubmissionLimitRepository.record_attempt(
            db,
            cls._key(company_slug, page_slug, subject, client_host),
            now,
            settings.LANDING_PAGE_SUBMISSION_RATE_LIMIT_WINDOW_SECONDS,
        )
