from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "HPTECH Platform"
    APP_ENV: str = "development"

    DATABASE_URL: str = ""

    JWT_SECRET: SecretStr

    JWT_ALGORITHM: Literal["HS256"] = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

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


settings = Settings()
