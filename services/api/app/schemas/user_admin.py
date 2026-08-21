import uuid
from datetime import datetime

from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.core.identity import UserRole


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserAdminListResponse(BaseModel):
    items: list[UserAdminResponse]
    total: int
    page: int
    page_size: int


class UserAdminUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=150)
    email: EmailStr | None = Field(default=None, max_length=150)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                raise ValueError("O nome não pode ficar vazio.")
            return normalized
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email_input(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @model_validator(mode="after")
    def require_change(self) -> Self:
        if self.name is None and self.email is None:
            raise ValueError("Informe ao menos um campo para atualização.")
        return self


class UserAdminRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: UserRole


class UserAdminStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool
