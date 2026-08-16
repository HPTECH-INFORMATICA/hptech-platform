import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.core.identity import CompanyStatus, UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class CurrentCompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: CompanyStatus


class CurrentUserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    active: bool
    company: CurrentCompanyResponse
