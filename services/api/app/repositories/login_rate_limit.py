from datetime import datetime, timedelta

from sqlalchemy import case, delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.login_rate_limit import LoginRateLimit


class LoginRateLimitRepository:
    @staticmethod
    def get_for_update(db: Session, key_hash: str) -> LoginRateLimit | None:
        statement = (
            select(LoginRateLimit)
            .where(LoginRateLimit.key_hash == key_hash)
            .with_for_update()
        )
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def record_failure(
        db: Session,
        key_hash: str,
        now: datetime,
        window_seconds: int,
    ) -> None:
        window_expired_before = now - timedelta(seconds=window_seconds)
        window_expired = (
            LoginRateLimit.window_started_at <= window_expired_before
        )
        statement = insert(LoginRateLimit).values(
            key_hash=key_hash,
            attempts=1,
            window_started_at=now,
        )
        statement = statement.on_conflict_do_update(
            index_elements=[LoginRateLimit.key_hash],
            set_={
                "attempts": case(
                    (window_expired, 1),
                    else_=LoginRateLimit.attempts + 1,
                ),
                "window_started_at": case(
                    (window_expired, now),
                    else_=LoginRateLimit.window_started_at,
                ),
            },
        )
        db.execute(statement)

    @staticmethod
    def delete(db: Session, key_hash: str) -> None:
        db.execute(
            delete(LoginRateLimit).where(LoginRateLimit.key_hash == key_hash)
        )
