from dataclasses import dataclass
from html import escape
from typing import Protocol

import httpx

from app.core.config import settings


@dataclass(frozen=True)
class InvitationMessage:
    recipient: str
    invited_name: str
    acceptance_url: str
    expires_in_hours: int


class InvitationDeliveryError(RuntimeError):
    pass


class InvitationNotifier(Protocol):
    def send_invitation(self, message: InvitationMessage) -> None: ...


class ResendInvitationNotifier:
    def send_invitation(self, message: InvitationMessage) -> None:
        api_key = settings.RESEND_API_KEY.get_secret_value()
        if not api_key or not settings.EMAIL_FROM:
            raise InvitationDeliveryError("Provider de email não configurado.")
        safe_name = escape(message.invited_name)
        safe_url = escape(message.acceptance_url, quote=True)
        payload = {
            "from": settings.EMAIL_FROM,
            "to": [message.recipient],
            "subject": "Convite para acessar o HPTECH Clinic",
            "html": (
                f"<p>Olá, {safe_name}.</p>"
                "<p>Você recebeu um convite para acessar o ambiente da sua clínica no HPTECH Clinic.</p>"
                f'<p><a href="{safe_url}">Aceitar convite</a></p>'
                f"<p>O convite é válido por aproximadamente {message.expires_in_hours} horas.</p>"
                "<p>Se você não reconhece este convite, ignore esta mensagem.</p>"
            ),
        }
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
                timeout=10.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise InvitationDeliveryError("Falha ao entregar convite.") from error


@dataclass(frozen=True)
class PasswordResetMessage:
    recipient: str
    user_name: str
    reset_url: str
    expires_in_minutes: int


class PasswordResetNotifier(Protocol):
    def send_password_reset(self, message: PasswordResetMessage) -> None: ...


class ResendPasswordResetNotifier:
    def send_password_reset(self, message: PasswordResetMessage) -> None:
        api_key = settings.RESEND_API_KEY.get_secret_value()
        if not api_key or not settings.EMAIL_FROM:
            raise InvitationDeliveryError("Provider de email não configurado.")
        safe_name = escape(message.user_name)
        safe_url = escape(message.reset_url, quote=True)
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "from": settings.EMAIL_FROM,
                    "to": [message.recipient],
                    "subject": "Redefinição de senha do HPTECH Clinic",
                    "html": (
                        f"<p>Olá, {safe_name}.</p>"
                        "<p>Recebemos uma solicitação para redefinir sua senha.</p>"
                        f'<p><a href="{safe_url}">Redefinir senha</a></p>'
                        f"<p>O link expira em {message.expires_in_minutes} minutos.</p>"
                        "<p>Se você não fez esta solicitação, ignore esta mensagem.</p>"
                    ),
                },
                timeout=10.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise InvitationDeliveryError("Falha ao entregar redefinição.") from error
