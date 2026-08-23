from typing import Literal, Self

from urllib.parse import urlparse

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "HPTECH Platform"
    APP_ENV: Literal["development", "test", "production"] = "development"

    DATABASE_URL: str = ""

    JWT_SECRET: SecretStr

    JWT_ALGORITHM: Literal["HS256"] = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    LOGIN_RATE_LIMIT_ATTEMPTS: int = Field(default=5, ge=1, le=100)
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = Field(default=900, ge=60, le=86400)

    RESEND_API_KEY: SecretStr = SecretStr("")
    EMAIL_FROM: str = ""
    FRONTEND_PUBLIC_URL: str = "http://localhost:3000"
    USER_INVITATION_TTL_HOURS: int = Field(default=24, ge=1, le=168)

    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, value: SecretStr) -> SecretStr:
        secret_value = value.get_secret_value()
        secret = secret_value.strip()

        if len(secret) < 32:
            raise ValueError(
                "JWT_SECRET deve possuir pelo menos 32 caracteres."
            )

        if len(set(secret)) < 8:
            raise ValueError("JWT_SECRET não possui diversidade suficiente.")

        return SecretStr(secret)

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        origins = [origin.strip().rstrip("/") for origin in value.split(",")]

        if not origins or any(not origin for origin in origins):
            raise ValueError("CORS_ORIGINS deve conter origens explícitas.")

        for origin in origins:
            parsed = urlparse(origin)
            if (
                origin == "*"
                or parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path not in {"", "/"}
                or parsed.params
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError(f"Origem CORS inválida: {origin!r}.")

        return ",".join(dict.fromkeys(origins))

    @model_validator(mode="after")
    def validate_production_origins(self) -> Self:
        if self.APP_ENV != "production":
            return self

        for origin in self.CORS_ORIGINS.split(","):
            parsed = urlparse(origin)
            if parsed.scheme != "https" or parsed.hostname in {
                "localhost",
                "127.0.0.1",
                "::1",
            }:
                raise ValueError(
                    "CORS_ORIGINS de produção deve usar origens HTTPS explícitas."
                )

        return self


settings = Settings()
