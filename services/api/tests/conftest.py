import os
from urllib.parse import urlparse

import pytest


TEST_DATABASE_URL = (
    "postgresql+psycopg://hptech_test:hptech_test@127.0.0.1:1/"
    "hptech_platform_test"
)


def _configure_safe_test_environment() -> None:
    parsed = urlparse(TEST_DATABASE_URL)

    if (
        parsed.scheme != "postgresql+psycopg"
        or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
        or not parsed.path.endswith("_test")
    ):
        raise RuntimeError(
            "A suíte de testes exige um PostgreSQL local e exclusivo de teste."
        )

    os.environ["APP_ENV"] = "test"
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    os.environ["JWT_SECRET"] = (
        "test-only-jwt-secret-with-at-least-32-characters"
    )


_configure_safe_test_environment()

from app.db import base as _models  # noqa: E402, F401


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"
