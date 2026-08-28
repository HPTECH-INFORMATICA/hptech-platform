import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.identity import CompanyStatus, UserRole


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(max_length=150)
    password: str = Field(min_length=1, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class CurrentCompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: CompanyStatus
    timezone: str


class CurrentPermissionResponse(BaseModel):
    module: str
    actions: list[str]


class CurrentUserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    active: bool
    company: CurrentCompanyResponse
    permissions: list[CurrentPermissionResponse]
