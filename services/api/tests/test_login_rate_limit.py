from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings
from app.models.login_rate_limit import LoginRateLimit
from app.repositories.login_rate_limit import LoginRateLimitRepository
from app.services.login_rate_limit import LoginRateLimiter, LoginRateLimitExceeded


@pytest.fixture
def rate_limit_store(
    monkeypatch: pytest.MonkeyPatch,
) -> dict[str, LoginRateLimit]:
    records: dict[str, LoginRateLimit] = {}
    monkeypatch.setattr(
        LoginRateLimitRepository,
        "get_for_update",
        lambda _db, key_hash: records.get(key_hash),
    )
    def record_failure(
        _db: object,
        key_hash: str,
        now: datetime,
        window_seconds: int,
    ) -> None:
        record = records.get(key_hash)
        if record is None:
            records[key_hash] = LoginRateLimit(
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
        LoginRateLimitRepository,
        "record_failure",
        record_failure,
    )
    monkeypatch.setattr(
        LoginRateLimitRepository,
        "delete",
        lambda _db, key_hash: records.pop(key_hash, None),
    )
    return records


def test_attempts_below_limit_are_allowed(
    rate_limit_store: dict[str, LoginRateLimit],
) -> None:
    for _ in range(settings.LOGIN_RATE_LIMIT_ATTEMPTS - 1):
        LoginRateLimiter.record_failure(object(), "unknown@example.com", "127.0.0.1")

    LoginRateLimiter.ensure_allowed(
        object(),
        "unknown@example.com",
        "127.0.0.1",
    )
    assert len(rate_limit_store) == 1


def test_limit_returns_retry_after_for_unknown_or_existing_email(
    rate_limit_store: dict[str, LoginRateLimit],
) -> None:
    for email in ("unknown@example.com", "existing@example.com"):
        for _ in range(settings.LOGIN_RATE_LIMIT_ATTEMPTS):
            LoginRateLimiter.record_failure(object(), email, "127.0.0.1")

        with pytest.raises(LoginRateLimitExceeded) as error:
            LoginRateLimiter.ensure_allowed(object(), email, "127.0.0.1")

        assert 1 <= error.value.retry_after <= (
            settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS + 1
        )

    assert len(rate_limit_store) == 2


def test_expired_window_allows_login_again(
    rate_limit_store: dict[str, LoginRateLimit],
) -> None:
    email = "usuario@example.com"
    host = "127.0.0.1"
    key_hash = LoginRateLimiter._key(email, host)
    rate_limit_store[key_hash] = LoginRateLimit(
        key_hash=key_hash,
        attempts=settings.LOGIN_RATE_LIMIT_ATTEMPTS,
        window_started_at=datetime.now(timezone.utc)
        - timedelta(seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS + 1),
    )

    LoginRateLimiter.ensure_allowed(object(), email, host)

    assert key_hash not in rate_limit_store


def test_success_clears_previous_failures(
    rate_limit_store: dict[str, LoginRateLimit],
) -> None:
    email = "usuario@example.com"
    host = "127.0.0.1"
    LoginRateLimiter.record_failure(object(), email, host)

    LoginRateLimiter.clear(object(), email, host)

    assert rate_limit_store == {}
