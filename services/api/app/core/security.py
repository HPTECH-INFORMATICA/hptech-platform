from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID, uuid4

import bcrypt
from jose import ExpiredSignatureError, JWTError, jwt

from app.core.config import settings


MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72

class PasswordPolicyError(ValueError):
    """Raised when a password does not satisfy the platform policy."""


class TokenValidationError(ValueError):
    """Raised when an access token cannot be trusted."""


@dataclass(frozen=True)
class AccessTokenClaims:
    subject: str
    issued_at: datetime
    expires_at: datetime
    jti: str
    token_type: Literal["access"] = "access"


def validate_password(password: str) -> None:
    if not password:
        raise PasswordPolicyError("A senha não pode ser vazia.")

    if len(password) < MIN_PASSWORD_LENGTH:
        raise PasswordPolicyError(
            f"A senha deve possuir pelo menos {MIN_PASSWORD_LENGTH} caracteres."
        )

    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise PasswordPolicyError(
            f"A senha deve possuir no máximo {MAX_PASSWORD_BYTES} bytes em UTF-8."
        )


def hash_password(password: str) -> str:
    validate_password(password)
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("ascii")


def verify_password(plain_password: str, password_hash: str) -> bool:
    if not plain_password or not password_hash:
        return False

    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            password_hash.encode("ascii"),
        )
    except (TypeError, ValueError, UnicodeEncodeError):
        return False


def create_access_token(
    subject: str | UUID,
    *,
    expires_delta: timedelta | None = None,
) -> str:
    try:
        subject_value = str(UUID(str(subject).strip()))
    except ValueError as error:
        raise ValueError("O subject do token deve ser um UUID válido.") from error

    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload = {
        "sub": subject_value,
        "iat": issued_at,
        "exp": expires_at,
        "jti": str(uuid4()),
        "type": "access",
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> AccessTokenClaims:
    if not token:
        raise TokenValidationError("Token de acesso ausente.")

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
            options={
                "require_sub": True,
                "require_iat": True,
                "require_exp": True,
            },
        )
    except ExpiredSignatureError as error:
        raise TokenValidationError("Token de acesso expirado.") from error
    except JWTError as error:
        raise TokenValidationError("Token de acesso inválido.") from error

    subject = payload.get("sub")
    issued_at = payload.get("iat")
    expires_at = payload.get("exp")
    token_id = payload.get("jti")
    token_type = payload.get("type")

    if not isinstance(subject, str) or not subject.strip():
        raise TokenValidationError("Token de acesso sem subject válido.")

    try:
        UUID(subject)
    except ValueError as error:
        raise TokenValidationError("Token de acesso sem subject válido.") from error

    if not isinstance(issued_at, (int, float)):
        raise TokenValidationError("Token de acesso sem iat válido.")

    if not isinstance(expires_at, (int, float)):
        raise TokenValidationError("Token de acesso sem exp válido.")

    if not isinstance(token_id, str):
        raise TokenValidationError("Token de acesso sem jti válido.")

    try:
        UUID(token_id)
    except ValueError as error:
        raise TokenValidationError("Token de acesso sem jti válido.") from error

    if token_type != "access":
        raise TokenValidationError("Tipo de token inválido.")

    return AccessTokenClaims(
        subject=subject,
        issued_at=datetime.fromtimestamp(issued_at, tz=timezone.utc),
        expires_at=datetime.fromtimestamp(expires_at, tz=timezone.utc),
        jti=token_id,
    )
