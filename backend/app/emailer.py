import smtplib
import logging
from email.mime.text import MIMEText

from .config import settings

logger = logging.getLogger("financeiro.emailer")


def send_reset_email(to_email: str, reset_link: str) -> bool:
    """Envia o link de redefinicao por SMTP.

    Sem SMTP configurado, registra o link em log e retorna False para que o
    chamador exiba o link no painel admin.
    """
    if not settings.smtp_enabled or not settings.smtp_host:
        logger.warning("SMTP desabilitado. Link de reset para %s: %s", to_email, reset_link)
        return False

    body = (
        "Voce solicitou a redefinicao de senha.\n\n"
        f"Use o link a seguir (valido por {settings.password_reset_expire_minutes} minutos):\n"
        f"{reset_link}\n\n"
        "Se nao foi voce, ignore este e-mail."
    )
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = "Redefinicao de senha - Financeiro"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_tls:
                server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, [to_email], msg.as_string())
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Falha ao enviar e-mail de reset para %s: %s", to_email, exc)
        return False
