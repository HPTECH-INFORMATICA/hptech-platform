from datetime import datetime, timedelta

from sqlalchemy import case, delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.landing_page_submission_limit import LandingPageSubmissionLimit


class LandingPageSubmissionLimitRepository:
    @staticmethod
    def lock_key(db: Session, key_hash: str) -> None:
        lock_id = int(key_hash[:16], 16)
        if lock_id >= 2**63:
            lock_id -= 2**64
        db.execute(select(func.pg_advisory_xact_lock(lock_id)))

    @staticmethod
    def get_for_update(
        db: Session,
        key_hash: str,
    ) -> LandingPageSubmissionLimit | None:
        statement = (
            select(LandingPageSubmissionLimit)
            .where(LandingPageSubmissionLimit.key_hash == key_hash)
            .with_for_update()
        )
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def record_attempt(
        db: Session,
        key_hash: str,
        now: datetime,
        window_seconds: int,
    ) -> None:
        window_expired_before = now - timedelta(seconds=window_seconds)
        window_expired = (
            LandingPageSubmissionLimit.window_started_at
            <= window_expired_before
        )
        statement = insert(LandingPageSubmissionLimit).values(
            key_hash=key_hash,
            attempts=1,
            window_started_at=now,
        )
        statement = statement.on_conflict_do_update(
            index_elements=[LandingPageSubmissionLimit.key_hash],
            set_={
                "attempts": case(
                    (window_expired, 1),
                    else_=LandingPageSubmissionLimit.attempts + 1,
                ),
                "window_started_at": case(
                    (window_expired, now),
                    else_=LandingPageSubmissionLimit.window_started_at,
                ),
            },
        )
        db.execute(statement)

    @staticmethod
    def delete_expired(db: Session, expired_before: datetime) -> None:
        db.execute(
            delete(LandingPageSubmissionLimit).where(
                LandingPageSubmissionLimit.window_started_at <= expired_before
            )
        )

    @staticmethod
    def delete(db: Session, key_hash: str) -> None:
        db.execute(
            delete(LandingPageSubmissionLimit).where(
                LandingPageSubmissionLimit.key_hash == key_hash
            )
        )
