from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.api.v1 import health
from app.main import app


client = TestClient(app)


def test_health_is_process_liveness() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_reports_ready_when_database_is_available(monkeypatch) -> None:
    monkeypatch.setattr(health, "test_database_connection", lambda: True)

    response = client.get("/api/v1/readiness")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readiness_is_sanitized_when_database_is_unavailable(monkeypatch) -> None:
    def unavailable() -> bool:
        raise OperationalError("SELECT 1", {}, Exception("sensitive detail"))

    monkeypatch.setattr(health, "test_database_connection", unavailable)

    response = client.get("/api/v1/readiness")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
    assert "sensitive" not in response.text
