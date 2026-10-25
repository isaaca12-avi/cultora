"""Correo transaccional de Cultora.

Sin SMTP configurado, imprime el contenido en el log (modo desarrollo) para no
bloquear flujos de recuperación y verificación mientras se configura el proveedor.
"""
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from typing import Optional

logger = logging.getLogger("cultora.email")


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def smtp_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST", "").strip())


def send_email(to: str, subject: str, text: str, html: Optional[str] = None) -> bool:
    """Envía un correo. Devuelve True si el servidor SMTP lo aceptó.

    En desarrollo sin SMTP devuelve False y deja el mensaje en el log con el
    enlace incluido, de modo que el flujo pueda probarse igualmente.
    """
    host = os.environ.get("SMTP_HOST", "").strip()
    sender = os.environ.get("SMTP_FROM", "").strip() or os.environ.get("SMTP_USER", "").strip()

    if not host:
        logger.info(
            "[email:dev] Sin SMTP configurado. To=%s | Subject=%s\n%s",
            to,
            subject,
            text,
        )
        return False

    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        port = 587

    use_ssl = _env_bool("SMTP_SSL", False)
    use_starttls = _env_bool("SMTP_STARTTLS", True)
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "")
    sender_name = os.environ.get("SMTP_FROM_NAME", "Cultora").strip() or "Cultora"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((sender_name, sender or user))
    msg["To"] = to
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        context = ssl.create_default_context()
        if use_ssl:
            with smtplib.SMTP_SSL(host, port, timeout=12, context=context) as smtp:
                if user:
                    smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=12) as smtp:
                smtp.ehlo()
                if use_starttls:
                    smtp.starttls(context=context)
                    smtp.ehlo()
                if user:
                    smtp.login(user, password)
                smtp.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001 - el envío nunca debe romper el flujo
        logger.warning("No se pudo enviar el correo a %s: %s", to, exc)
        return False
