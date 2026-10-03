import logging
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from html import escape
from urllib.parse import urlparse

import httpx

from core import config
from core.db import db

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = config.INTEGRATION_PROXY_URL
EMAIL_KEY = config.EMERGENT_EMAIL_KEY


async def create_reset_token(user: dict) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    await db.password_reset_tokens.insert_one({
        "token_hash": token_hash,
        "user_id": user["user_id"],
        "email": user["email"],
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False,
    })
    return token


async def send_password_reset_email(to_email: str, token: str) -> bool:
    base = config.FRONTEND_URL.rstrip("/")
    link = f"{base}/reset-password?token={token}"
    if not EMAIL_KEY or EMAIL_KEY.startswith("{") or not base.startswith("https://"):
        if urlparse(base).hostname in ("localhost", "127.0.0.1", "::1"):
            logger.warning("Email not configured; password reset link: %s", link)
        else:
            logger.error("Password reset email not configured (EMERGENT_EMAIL_KEY / FRONTEND_URL)")
        return False
    brand = escape(config.EMAIL_FROM_NAME)
    html = (
        f'<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
        f'<p>We received a request to reset your {brand} password.</p>'
        f'<p><a href="{escape(link)}">Reset your password</a></p>'
        f'<p>This link expires in 1 hour and can be used once. If you did not request it, ignore this email.</p>'
        f'<p style="font-size:12px;color:#888">Sent by {brand}. We never ask for your password by email.</p>'
        f'</td></tr></table>'
    )
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json={"to": [to_email], "subject": f"Reset your {config.EMAIL_FROM_NAME} password",
                      "html": html, "from_name": config.EMAIL_FROM_NAME},
            )
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Password reset email failed: {e}")
        return False
