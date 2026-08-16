import os

import pytest


os.environ["JWT_SECRET"] = "test-only-jwt-secret-with-at-least-32-characters"

from app.db import base as _models  # noqa: E402, F401


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"
