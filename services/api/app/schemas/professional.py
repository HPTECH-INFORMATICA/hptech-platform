import uuid
import re
from datetime import date, datetime
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


def normalize_spaces(value: str) -> str:
    return " ".join(value.split())


def normalize_cpf(value: str) -> str:
    if not re.fullmatch(r"[\d.\-\s]+", value):
        raise ValueError("O CPF deve conter somente dígitos e pontuação válida.")
    return re.sub(r"\D", "", value)


def is_valid_cpf(value: str) -> bool:
    if len(value) != 11 or value == value[0] * 11:
        return False
    for length in (9, 10):
        total = sum(int(value[index]) * (length + 1 - index) for index in range(length))
        digit = (total * 10) % 11
        if digit == 10:
            digit = 0
        if digit != int(value[length]):
            return False
    return True


class ProfessionalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=1, max_length=150)
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    social_name: str | None = Field(default=None, max_length=150)
    cpf: str | None = Field(default=None, max_length=14)
    birth_date: date | None = None
    email: EmailStr | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    whatsapp: str | None = Field(default=None, max_length=30)
    profession: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=100)
    administrative_notes: str | None = Field(default=None, max_length=2000)
    user_id: uuid.UUID | None = None

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = normalize_spaces(value)
            if not normalized:
                raise ValueError("O nome de exibição não pode ficar vazio.")
            return normalized
        return value

    @field_validator(
        "full_name",
        "social_name",
        "phone",
        "whatsapp",
        "profession",
        "category",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_spaces(value) or None
        return value

    @field_validator("administrative_notes", mode="before")
    @classmethod
    def normalize_notes(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower() or None
        return value

    @field_validator("cpf", mode="before")
    @classmethod
    def validate_cpf(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if not value.strip():
            return None
        normalized = normalize_cpf(value)
        if not is_valid_cpf(normalized):
            raise ValueError("Informe um CPF válido.")
        return normalized

    @field_validator("birth_date")
    @classmethod
    def reject_future_birth_date(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("A data de nascimento não pode estar no futuro.")
        return value


class ProfessionalUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=150)
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    social_name: str | None = Field(default=None, max_length=150)
    cpf: str | None = Field(default=None, max_length=14)
    birth_date: date | None = None
    email: EmailStr | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    whatsapp: str | None = Field(default=None, max_length=30)
    profession: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=100)
    administrative_notes: str | None = Field(default=None, max_length=2000)
    user_id: uuid.UUID | None = None

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = normalize_spaces(value)
            if not normalized:
                raise ValueError("O nome de exibição não pode ficar vazio.")
            return normalized
        return value

    @field_validator(
        "full_name",
        "social_name",
        "phone",
        "whatsapp",
        "profession",
        "category",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_spaces(value) or None
        return value

    @field_validator("administrative_notes", mode="before")
    @classmethod
    def normalize_notes(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower() or None
        return value

    @field_validator("cpf", mode="before")
    @classmethod
    def validate_cpf(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if not value.strip():
            return None
        normalized = normalize_cpf(value)
        if not is_valid_cpf(normalized):
            raise ValueError("Informe um CPF válido.")
        return normalized

    @field_validator("birth_date")
    @classmethod
    def reject_future_birth_date(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("A data de nascimento não pode estar no futuro.")
        return value

    @model_validator(mode="after")
    def validate_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        required_fields = {"display_name", "full_name"}
        if any(
            field in self.model_fields_set and getattr(self, field) is None
            for field in required_fields
        ):
            raise ValueError("Nome completo e nome de exibição não aceitam valor nulo.")
        return self


class ProfessionalStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool


class ProfessionalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    display_name: str
    full_name: str
    social_name: str | None
    cpf: str | None
    birth_date: date | None
    email: str | None
    phone: str | None
    whatsapp: str | None
    profession: str | None
    category: str | None
    administrative_notes: str | None
    user_id: uuid.UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProfessionalListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ProfessionalResponse]
    total: int
    page: int
    page_size: int


class ProfessionalUserCandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    name: str
    email: str


class ProfessionalUserCandidateListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ProfessionalUserCandidateResponse]
    total: int
    page: int
    page_size: int
