import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.core.identity import UserRole, normalize_user_role
from app.db.base_class import Base
from app.db.mixins import (
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class User(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    SoftDeleteMixin,
    Base,
):
    __tablename__ = "users"

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    auth_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )

    role: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=UserRole.VIEWER.value,
    )

    @validates("role")
    def validate_role(
        self,
        _key: str,
        value: str | UserRole,
    ) -> str:
        return normalize_user_role(value)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    company = relationship(
        "Company",
        back_populates="users",
    )

    appointments = relationship(
        "Appointment",
        back_populates="professional",
    )

    lead_history = relationship(
        "LeadHistory",
        back_populates="user",
        passive_deletes=True,
    )
