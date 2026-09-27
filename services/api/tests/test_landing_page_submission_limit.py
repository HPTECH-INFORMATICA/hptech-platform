from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings
from app.models.landing_page_submission_limit import LandingPageSubmissionLimit
from app.repositories.landing_page_submission_limit import (
    LandingPageSubmissionLimitRepository,
)
from app.services.landing_page_submission_limit import (
    LandingPageSubmissionRateLimitExceeded,
    LandingPageSubmissionRateLimiter,
)


@pytest.fixture
def submission_limit_store(
    monkeypatch: pytest.MonkeyPatch,
) -> dict[str, LandingPageSubmissionLimit]:
    records: dict[str, LandingPageSubmissionLimit] = {}
    monkeypatch.setattr(
        LandingPageSubmissionLimitRepository,
        "lock_key",
        lambda _db, _key_hash: None,
    )
    monkeypatch.setattr(
        LandingPageSubmissionLimitRepository,
        "get_for_update",
        lambda _db, key_hash: records.get(key_hash),
    )

    def record_attempt(
        _db: object,
        key_hash: str,
        now: datetime,
        window_seconds: int,
    ) -> None:
        record = records.get(key_hash)
        if record is None:
            records[key_hash] = LandingPageSubmissionLimit(
                key_hash=key_hash,
                attempts=1,
                window_started_at=now,
            )
            return
        if record.window_started_at + timedelta(seconds=window_seconds) <= now:
            record.attempts = 1
            record.window_started_at = now
        else:
            record.attempts += 1

    monkeypatch.setattr(
        LandingPageSubmissionLimitRepository,
        "record_attempt",
        record_attempt,
    )

    def delete_expired(_db: object, expired_before: datetime) -> None:
        stale_keys = [
            key
            for key, record in records.items()
            if record.window_started_at <= expired_before
        ]
        for key in stale_keys:
            records.pop(key)

    monkeypatch.setattr(
        LandingPageSubmissionLimitRepository,
        "delete_expired",
        delete_expired,
    )
    monkeypatch.setattr(
        LandingPageSubmissionLimitRepository,
        "delete",
        lambda _db, key_hash: records.pop(key_hash, None),
    )
    return records


def test_submission_limit_is_scoped_by_page_and_client(
    submission_limit_store: dict[str, LandingPageSubmissionLimit],
) -> None:
    LandingPageSubmissionRateLimiter.record_attempt(
        object(), "empresa", "pagina-a", "pessoa@example.com", "127.0.0.1"
    )
    LandingPageSubmissionRateLimiter.record_attempt(
        object(), "empresa", "pagina-b", "pessoa@example.com", "127.0.0.1"
    )
    LandingPageSubmissionRateLimiter.record_attempt(
        object(), "empresa", "pagina-a", "pessoa@example.com", "127.0.0.2"
    )

    assert len(submission_limit_store) == 3
    assert all(len(key) == 64 for key in submission_limit_store)


def test_submission_limit_returns_retry_after(
    submission_limit_store: dict[str, LandingPageSubmissionLimit],
) -> None:
    for _ in range(settings.LANDING_PAGE_SUBMISSION_RATE_LIMIT_ATTEMPTS):
        LandingPageSubmissionRateLimiter.record_attempt(
            object(),
            "empresa",
            "pagina",
            "pessoa@example.com",
            "127.0.0.1",
        )

    with pytest.raises(LandingPageSubmissionRateLimitExceeded) as error:
        LandingPageSubmissionRateLimiter.ensure_allowed(
            object(),
            "empresa",
            "pagina",
            "pessoa@example.com",
            "127.0.0.1",
        )

    assert 1 <= error.value.retry_after <= (
        settings.LANDING_PAGE_SUBMISSION_RATE_LIMIT_WINDOW_SECONDS + 1
    )


def test_expired_submission_window_is_removed(
    submission_limit_store: dict[str, LandingPageSubmissionLimit],
) -> None:
    key_hash = LandingPageSubmissionRateLimiter._key(
        "empresa", "pagina", "pessoa@example.com", "127.0.0.1"
    )
    submission_limit_store[key_hash] = LandingPageSubmissionLimit(
        key_hash=key_hash,
        attempts=settings.LANDING_PAGE_SUBMISSION_RATE_LIMIT_ATTEMPTS,
        window_started_at=datetime.now(timezone.utc)
        - timedelta(
            seconds=(
                settings.LANDING_PAGE_SUBMISSION_RATE_LIMIT_WINDOW_SECONDS + 1
            )
        ),
    )

    LandingPageSubmissionRateLimiter.ensure_allowed(
        object(),
        "empresa",
        "pagina",
        "pessoa@example.com",
        "127.0.0.1",
    )

    assert submission_limit_store == {}
