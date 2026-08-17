from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from jose import jwt
from pydantic import ValidationError

from app.core.config import Settings, settings
from app.core.security import (
    MAX_PASSWORD_BYTES,
    PasswordPolicyError,
    TokenValidationError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_differs_and_correct_password_verifies() -> None:
    password = "senha-segura"
    password_hash = hash_password(password)

    assert password_hash != password
    assert verify_password(password, password_hash)
    assert not verify_password("senha-incorreta", password_hash)


@pytest.mark.parametrize("password", ["", "curta"])
def test_password_rejects_empty_or_short_value(password: str) -> None:
    with pytest.raises(PasswordPolicyError):
        hash_password(password)


def test_password_accepts_bcrypt_limit() -> None:
    password = "a" * MAX_PASSWORD_BYTES

    assert verify_password(password, hash_password(password))


def test_password_rejects_value_above_bcrypt_limit() -> None:
    with pytest.raises(PasswordPolicyError, match="72 bytes"):
        hash_password("a" * (MAX_PASSWORD_BYTES + 1))


def test_password_rejects_multibyte_value_above_bcrypt_limit() -> None:
    with pytest.raises(PasswordPolicyError, match="72 bytes"):
        hash_password("á" * 37)


def test_invalid_password_hash_returns_false() -> None:
    assert not verify_password("senha-segura", "hash-inválido")


def test_access_token_contains_required_claims() -> None:
    subject = uuid4()
    token = create_access_token(subject)
    claims = decode_access_token(token)

    assert claims.subject == str(subject)
    assert claims.token_type == "access"
    assert claims.expires_at > claims.issued_at
    UUID(claims.jti)


def test_access_token_rejects_non_uuid_subject() -> None:
    with pytest.raises(ValueError, match="UUID válido"):
        create_access_token("not-a-user-id")


def test_expired_access_token_is_rejected() -> None:
    token = create_access_token(
        uuid4(),
        expires_delta=timedelta(seconds=-1),
    )

    with pytest.raises(TokenValidationError, match="expirado"):
        decode_access_token(token)


def test_access_token_with_invalid_signature_is_rejected() -> None:
    token = create_access_token(uuid4())

    forged_payload = jwt.decode(
        token,
        settings.JWT_SECRET.get_secret_value(),
        algorithms=[settings.JWT_ALGORITHM],
    )
    forged_token = jwt.encode(
        forged_payload,
        "different-test-secret-with-at-least-32-characters",
        algorithm=settings.JWT_ALGORITHM,
    )

    with pytest.raises(TokenValidationError, match="inválido"):
        decode_access_token(forged_token)


def test_non_access_token_is_rejected() -> None:
    token = create_access_token(uuid4())
    payload = jwt.decode(
        token,
        settings.JWT_SECRET.get_secret_value(),
        algorithms=[settings.JWT_ALGORITHM],
    )
    payload["type"] = "refresh"
    refresh_token = jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )

    with pytest.raises(TokenValidationError, match="Tipo de token inválido"):
        decode_access_token(refresh_token)


@pytest.mark.parametrize("secret", ["", "segredo-curto", "a" * 32])
def test_missing_or_weak_jwt_secret_is_rejected(secret: str) -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(_env_file=None, JWT_SECRET=secret)


def test_absent_jwt_secret_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("JWT_SECRET")

    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(_env_file=None)


@pytest.mark.parametrize(
    "origins",
    [
        "*",
        "",
        "https://example.com/path",
        "javascript:alert(1)",
    ],
)
def test_cors_requires_explicit_http_origins(origins: str) -> None:
    with pytest.raises(ValidationError, match="CORS_ORIGINS|Origem CORS"):
        Settings(
            _env_file=None,
            JWT_SECRET="secure-test-secret-with-at-least-32-characters",
            CORS_ORIGINS=origins,
        )


def test_cors_normalizes_and_deduplicates_origins() -> None:
    configured = Settings(
        _env_file=None,
        JWT_SECRET="secure-test-secret-with-at-least-32-characters",
        CORS_ORIGINS="http://localhost:3000/, https://app.example.com, http://localhost:3000",
    )

    assert configured.CORS_ORIGINS == (
        "http://localhost:3000,https://app.example.com"
    )


@pytest.mark.parametrize(
    "origin",
    ["http://app.example.com", "http://localhost:3000"],
)
def test_production_cors_requires_explicit_https_origin(origin: str) -> None:
    with pytest.raises(ValidationError, match="produção"):
        Settings(
            _env_file=None,
            APP_ENV="production",
            JWT_SECRET="secure-test-secret-with-at-least-32-characters",
            CORS_ORIGINS=origin,
        )


def test_production_cors_accepts_explicit_https_origin() -> None:
    configured = Settings(
        _env_file=None,
        APP_ENV="production",
        JWT_SECRET="secure-test-secret-with-at-least-32-characters",
        CORS_ORIGINS="https://app.example.com",
    )

    assert configured.CORS_ORIGINS == "https://app.example.com"
