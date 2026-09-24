import uuid
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal, Self
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class LandingPageStatus(StrEnum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class LandingPageTemplate(StrEnum):
    BLANK = "BLANK"
    LEAD_CAPTURE = "LEAD_CAPTURE"
    SERVICE_PROMOTION = "SERVICE_PROMOTION"


def _normalize_required_text(value: object) -> object:
    if isinstance(value, str):
        return value.strip()
    return value


def _normalize_optional_text(value: object) -> object:
    if isinstance(value, str):
        return value.strip() or None
    return value


class LandingPageAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1, max_length=60)
    href: str = Field(min_length=1, max_length=2048)

    @field_validator("label", "href", mode="before")
    @classmethod
    def normalize_text(cls, value: object) -> object:
        return _normalize_required_text(value)

    @field_validator("href")
    @classmethod
    def validate_href(cls, value: str) -> str:
        if value.startswith("/") and not value.startswith("//"):
            return value
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("Use uma rota relativa ou uma URL HTTPS.")
        if parsed.username is not None or parsed.password is not None:
            raise ValueError("A URL não pode conter credenciais.")
        return value


class LandingPageHeroBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    type: Literal["HERO"]
    eyebrow: str | None = Field(default=None, max_length=80)
    heading: str = Field(min_length=1, max_length=120)
    body: str | None = Field(default=None, max_length=1000)
    primary_action: LandingPageAction | None = None

    @field_validator("heading", mode="before")
    @classmethod
    def normalize_heading(cls, value: object) -> object:
        return _normalize_required_text(value)

    @field_validator("eyebrow", "body", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_text(value)


class LandingPageTextBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    type: Literal["TEXT"]
    heading: str | None = Field(default=None, max_length=120)
    body: str = Field(min_length=1, max_length=5000)

    @field_validator("body", mode="before")
    @classmethod
    def normalize_body(cls, value: object) -> object:
        return _normalize_required_text(value)

    @field_validator("heading", mode="before")
    @classmethod
    def normalize_heading(cls, value: object) -> object:
        return _normalize_optional_text(value)


class LandingPageFeature(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1, max_length=500)

    @field_validator("title", "body", mode="before")
    @classmethod
    def normalize_text(cls, value: object) -> object:
        return _normalize_required_text(value)


class LandingPageFeaturesBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    type: Literal["FEATURES"]
    heading: str | None = Field(default=None, max_length=120)
    items: list[LandingPageFeature] = Field(min_length=1, max_length=12)

    @field_validator("heading", mode="before")
    @classmethod
    def normalize_heading(cls, value: object) -> object:
        return _normalize_optional_text(value)


class LandingPageCallToActionBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    type: Literal["CALL_TO_ACTION"]
    heading: str = Field(min_length=1, max_length=120)
    body: str | None = Field(default=None, max_length=1000)
    action: LandingPageAction

    @field_validator("heading", mode="before")
    @classmethod
    def normalize_heading(cls, value: object) -> object:
        return _normalize_required_text(value)

    @field_validator("body", mode="before")
    @classmethod
    def normalize_body(cls, value: object) -> object:
        return _normalize_optional_text(value)


class LandingPageFaqItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=200)
    answer: str = Field(min_length=1, max_length=2000)

    @field_validator("question", "answer", mode="before")
    @classmethod
    def normalize_text(cls, value: object) -> object:
        return _normalize_required_text(value)


class LandingPageFaqBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    type: Literal["FAQ"]
    heading: str | None = Field(default=None, max_length=120)
    items: list[LandingPageFaqItem] = Field(min_length=1, max_length=20)

    @field_validator("heading", mode="before")
    @classmethod
    def normalize_heading(cls, value: object) -> object:
        return _normalize_optional_text(value)


class LandingPageContactBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    type: Literal["CONTACT"]
    heading: str = Field(min_length=1, max_length=120)
    body: str | None = Field(default=None, max_length=1000)
    submit_label: str = Field(default="Enviar", min_length=1, max_length=60)
    success_message: str = Field(
        default="Recebemos seus dados.",
        min_length=1,
        max_length=240,
    )

    @field_validator("heading", "submit_label", "success_message", mode="before")
    @classmethod
    def normalize_required_text(cls, value: object) -> object:
        return _normalize_required_text(value)

    @field_validator("body", mode="before")
    @classmethod
    def normalize_body(cls, value: object) -> object:
        return _normalize_optional_text(value)


LandingPageBlock = Annotated[
    LandingPageHeroBlock
    | LandingPageTextBlock
    | LandingPageFeaturesBlock
    | LandingPageCallToActionBlock
    | LandingPageFaqBlock
    | LandingPageContactBlock,
    Field(discriminator="type"),
]


class LandingPageContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = 1
    blocks: list[LandingPageBlock] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def require_unique_block_ids(self) -> Self:
        block_ids = [block.id for block in self.blocks]
        if len(block_ids) != len(set(block_ids)):
            raise ValueError("Cada bloco deve possuir um id único.")
        return self


class LandingPageSeo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=60)
    description: str | None = Field(default=None, max_length=160)
    canonical_url: str | None = Field(default=None, max_length=2048)
    no_index: bool = False

    @field_validator("title", "description", "canonical_url", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_text(value)

    @field_validator("canonical_url")
    @classmethod
    def validate_canonical_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("A URL canônica deve usar HTTPS.")
        if parsed.username is not None or parsed.password is not None:
            raise ValueError("A URL canônica não pode conter credenciais.")
        return value


class LandingPageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=150)
    slug: str = Field(
        min_length=1,
        max_length=120,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    template: LandingPageTemplate = LandingPageTemplate.BLANK
    content: LandingPageContent = Field(default_factory=LandingPageContent)
    seo: LandingPageSeo = Field(default_factory=LandingPageSeo)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        return _normalize_required_text(value)

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class LandingPageUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=150)
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=120,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    template: LandingPageTemplate | None = None
    content: LandingPageContent | None = None
    seo: LandingPageSeo | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        return _normalize_required_text(value)

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @model_validator(mode="after")
    def validate_patch(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualização.")
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"O campo {field_name} não aceita valor nulo.")
        return self


class LandingPageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    name: str
    slug: str
    status: LandingPageStatus
    template: LandingPageTemplate
    content: LandingPageContent
    seo: LandingPageSeo
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class LandingPageListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[LandingPageResponse]
    total: int
    page: int
    page_size: int
