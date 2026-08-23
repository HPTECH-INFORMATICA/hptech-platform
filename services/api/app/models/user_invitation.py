import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class UserInvitation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_invitations"

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="RESTRICT"), index=True
    )
    email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invited_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    delivery_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PENDING", index=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivery_failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def state(self) -> str:
        now = datetime.now(self.expires_at.tzinfo)
        if self.accepted_at is not None:
            return "ACCEPTED"
        if self.revoked_at is not None:
            return "REVOKED"
        if self.expires_at <= now:
            return "EXPIRED"
        if self.delivery_status == "FAILED":
            return "DELIVERY_FAILED"
        return "PENDING"
