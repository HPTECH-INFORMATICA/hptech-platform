from datetime import datetime, timedelta, timezone

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import settings
from app.services.invitation_notifier import (
    InvitationDeliveryError,
    InvitationMessage,
    ResendInvitationNotifier,
)
from app.services.user_invitation import hash_invitation_token


class FakeInvitationNotifier:
    def __init__(self) -> None:
        self.messages: list[InvitationMessage] = []

    def send_invitation(self, message: InvitationMessage) -> None:
        self.messages.append(message)


def test_fake_notifier_is_in_memory_and_test_only() -> None:
    notifier = FakeInvitationNotifier()
    message = InvitationMessage(
        recipient="invite@example.com", invited_name="Teste",
        acceptance_url="https://example.com/#token=secret", expires_in_hours=24,
    )
    notifier.send_invitation(message)
    assert notifier.messages == [message]


def test_invitation_token_hash_is_deterministic_and_does_not_contain_plaintext() -> None:
    token = "high-entropy-token-value"
    digest = hash_invitation_token(token)
    assert len(digest) == 64
    assert token not in digest
    assert digest == hash_invitation_token(token)


def test_resend_adapter_builds_expected_safe_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    class Response:
        def raise_for_status(self) -> None: pass

    def fake_post(url: str, **kwargs: object) -> Response:
        captured.update(url=url, **kwargs)
        return Response()

    monkeypatch.setattr(settings, "RESEND_API_KEY", SecretStr("test-resend-key"))
    monkeypatch.setattr(settings, "EMAIL_FROM", "HPTECH <test@example.com>")
    monkeypatch.setattr(httpx, "post", fake_post)
    ResendInvitationNotifier().send_invitation(InvitationMessage(
        recipient="invite@example.com", invited_name="Pessoa Teste",
        acceptance_url="https://example.com/aceitar-convite?token=secret",
        expires_in_hours=24,
    ))
    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["json"] == {
        "from": "HPTECH <test@example.com>",
        "to": ["invite@example.com"],
        "subject": "Convite para acessar a HPTECH Platform",
        "html": (
            "<p>Olá, Pessoa Teste.</p>"
            "<p>Você recebeu um convite para acessar a HPTECH Platform.</p>"
            '<p><a href="https://example.com/aceitar-convite?token=secret">Aceitar convite</a></p>'
            "<p>O convite é válido por aproximadamente 24 horas.</p>"
            "<p>Se você não reconhece este convite, ignore esta mensagem.</p>"
        ),
    }


def test_resend_adapter_requires_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "RESEND_API_KEY", SecretStr(""))
    monkeypatch.setattr(settings, "EMAIL_FROM", "")
    with pytest.raises(InvitationDeliveryError):
        ResendInvitationNotifier().send_invitation(InvitationMessage(
            recipient="invite@example.com", invited_name="Teste",
            acceptance_url="https://example.com", expires_in_hours=24,
        ))


def test_resend_adapter_maps_http_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "RESEND_API_KEY", SecretStr("test-resend-key"))
    monkeypatch.setattr(settings, "EMAIL_FROM", "HPTECH <test@example.com>")

    def fail(*args: object, **kwargs: object) -> None:
        raise httpx.TimeoutException("timeout")

    monkeypatch.setattr(httpx, "post", fail)
    with pytest.raises(InvitationDeliveryError):
        ResendInvitationNotifier().send_invitation(InvitationMessage(
            recipient="invite@example.com", invited_name="Teste",
            acceptance_url="https://example.com", expires_in_hours=24,
        ))
