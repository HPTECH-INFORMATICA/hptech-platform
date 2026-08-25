import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.core.identity import PermissionAction, PermissionModule, UserRole
from app.db.base_class import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class RolePermissionOverride(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "role_permission_overrides"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "role", "module", "action",
            name="uq_role_permission_override_scope",
        ),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    allowed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    @validates("role")
    def validate_role(self, _key: str, value: str | UserRole) -> str:
        return UserRole(value).value

    @validates("module")
    def validate_module(self, _key: str, value: str | PermissionModule) -> str:
        return PermissionModule(value).value

    @validates("action")
    def validate_action(self, _key: str, value: str | PermissionAction) -> str:
        return PermissionAction(value).value
