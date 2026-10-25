"""
Cultora — utilidades transversales de seguridad.

Contiene:
- Validación de JWT_SECRET al arranque.
- Política de contraseñas centralizada.
- Rate limiter en memoria (sliding window, por proceso).
- Helpers de auditoría estructurada (IP anonimizada, UA resumido).
- Constantes reutilizables.

Este módulo NO debe importar admin_router ni server para evitar dependencias
circulares. Sólo dependencias estándar de la aplicación (pydantic, etc.).
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Deque, Dict, List, Optional, Tuple

logger = logging.getLogger("cultora.security")

# ---------------------------------------------------------------------------
# JWT_SECRET hardening
# ---------------------------------------------------------------------------

_WEAK_SECRET_MARKERS = {"dev-secret", "change-me", "changeme", "secret", "password", ""}


def validate_jwt_secret_or_die(secret: str, environment: str) -> None:
    """Aborta el arranque si JWT_SECRET falta o es débil en producción/staging.

    - environment: "production" | "staging" | "development" | "test"
    - En development/test se permite un secreto débil pero se avisa por log.
    """
    env = (environment or "").strip().lower()
    is_prod_like = env in ("production", "staging", "prod")
    val = (secret or "").strip()
    if not val:
        raise RuntimeError(
            "JWT_SECRET no está configurado. Genera un secreto robusto y configúralo en el entorno."
        )
    if val in _WEAK_SECRET_MARKERS or val.startswith("dev-") or len(val) < 32:
        if is_prod_like:
            raise RuntimeError(
                "JWT_SECRET es débil o corto para el entorno actual. "
                "Debe tener al menos 32 caracteres y no ser un valor por defecto."
            )
        logger.warning(
            "JWT_SECRET es débil (%d chars). Aceptable sólo en '%s'. Usa un secreto robusto en staging/production.",
            len(val), env or "development",
        )


# ---------------------------------------------------------------------------
# Política de contraseñas
# ---------------------------------------------------------------------------

# Set corto de passwords notoriamente débiles/comunes. Idea: bloquear los peores
# offenders sin importar diccionarios de MB. Se puede ampliar sin re-deploy
# vía env var CULTORA_EXTRA_BLOCKED_PASSWORDS.
_COMMON_PASSWORDS: set = {
    "password", "password1", "password12", "password123", "password1234",
    "qwerty", "qwerty123", "abc123456", "12345678", "123456789", "1234567890",
    "letmein", "letmein1", "welcome", "welcome1", "welcome123",
    "iloveyou", "iloveyou1", "admin", "admin123", "administrator",
    "cultora", "cultora123", "cultora2025", "cultora2026",
}
_EXTRA_BLOCKED = {
    p.strip().lower() for p in (os.environ.get("CULTORA_EXTRA_BLOCKED_PASSWORDS", "") or "").split(",") if p.strip()
}
_COMMON_PASSWORDS |= _EXTRA_BLOCKED


class PasswordPolicyError(ValueError):
    """Error legible orientado a mostrar al usuario."""


def evaluate_password(
    password: str,
    *,
    min_length: int = 10,
    require_upper: bool = True,
    require_lower: bool = True,
    require_digit: bool = True,
    require_symbol: bool = True,
    forbid: Optional[List[str]] = None,
) -> None:
    """Levanta PasswordPolicyError si la contraseña no cumple. NUNCA loggea el valor."""
    if not isinstance(password, str) or len(password) < min_length:
        raise PasswordPolicyError(f"La contraseña debe tener al menos {min_length} caracteres")
    if require_lower and not re.search(r"[a-z]", password):
        raise PasswordPolicyError("La contraseña debe incluir minúsculas")
    if require_upper and not re.search(r"[A-Z]", password):
        raise PasswordPolicyError("La contraseña debe incluir mayúsculas")
    if require_digit and not re.search(r"\d", password):
        raise PasswordPolicyError("La contraseña debe incluir un dígito")
    if require_symbol and not re.search(r"[^A-Za-z0-9]", password):
        raise PasswordPolicyError("La contraseña debe incluir un símbolo")
    lowered = password.lower()
    if lowered in _COMMON_PASSWORDS:
        raise PasswordPolicyError("Esa contraseña es demasiado común. Elige una distinta.")
    for f in (forbid or []):
        if f and password == f:
            raise PasswordPolicyError("La nueva contraseña no puede ser la misma que la anterior.")


def admin_password_policy(password: str, *, forbid: Optional[List[str]] = None) -> None:
    """Política para administradores: 12+ y todos los grupos + no común + no reutilizar."""
    evaluate_password(password, min_length=12, forbid=forbid)


def user_password_policy(password: str, *, forbid: Optional[List[str]] = None) -> None:
    """Política para usuarios comunes: 10+ chars con algo de complejidad."""
    evaluate_password(
        password,
        min_length=10,
        require_upper=True,
        require_lower=True,
        require_digit=True,
        require_symbol=False,   # más laxo que admin
        forbid=forbid,
    )


# ---------------------------------------------------------------------------
# Rate limiter en memoria (sliding window)
# ---------------------------------------------------------------------------

class SlidingWindowRateLimiter:
    """Rate limiter simple por proceso. Suficiente para MVP monoréplica.

    Para producción con múltiples workers conviene migrar a Redis o
    a un contador atómico en Mongo. Documentado.
    """

    def __init__(self) -> None:
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)

    def check(self, key: str, *, max_events: int, window_seconds: int) -> Tuple[bool, int]:
        """Devuelve (allowed, retry_after_seconds).

        - allowed=False cuando se excedió el cupo dentro de la ventana.
        - retry_after_seconds es el tiempo hasta que el bucket se libere.
        """
        now = time.monotonic()
        bucket = self._buckets[key]
        # Limpiar eventos fuera de la ventana
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= max_events:
            retry_after = int(window_seconds - (now - bucket[0])) + 1
            return False, max(retry_after, 1)
        bucket.append(now)
        return True, 0

    def reset(self, key: str) -> None:
        self._buckets.pop(key, None)


# Instancia global usada por endpoints
rate_limiter = SlidingWindowRateLimiter()


def rl_key(prefix: str, *parts: str) -> str:
    return prefix + ":" + ":".join(p or "-" for p in parts)


# ---------------------------------------------------------------------------
# Session version helpers
# ---------------------------------------------------------------------------

INITIAL_SESSION_VERSION = 1


async def bump_session_version(db, user_id: str) -> int:
    """Incrementa session_version del usuario. Devuelve el nuevo valor.
    Todos los JWT emitidos antes de este incremento quedarán inválidos.
    """
    result = await db.users.find_one_and_update(
        {"id": user_id},
        {"$inc": {"session_version": 1}},
        return_document=True,
        projection={"session_version": 1},
    )
    if not result:
        return INITIAL_SESSION_VERSION
    return int(result.get("session_version") or INITIAL_SESSION_VERSION)


# ---------------------------------------------------------------------------
# Auditoría — helpers
# ---------------------------------------------------------------------------

def anonymize_ip(ip: Optional[str]) -> Optional[str]:
    """Anonimiza IP truncando el último octeto/hextet."""
    if not ip:
        return None
    if ":" in ip:
        parts = ip.split(":")
        if len(parts) >= 4:
            return ":".join(parts[:4]) + "::"
        return ip
    parts = ip.split(".")
    if len(parts) == 4:
        return ".".join(parts[:3]) + ".0"
    return ip


def summarize_user_agent(ua: Optional[str]) -> Optional[str]:
    """Devuelve una versión resumida del user agent (max 120 chars)."""
    if not ua:
        return None
    ua = ua.strip()
    return ua[:120] + ("…" if len(ua) > 120 else "")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def token_id_new() -> str:
    """Identificador aleatorio para tokens de un solo uso (recovery/verify).
    Devuelve (token_plano, token_hash)."""
    plain = secrets.token_urlsafe(32)
    h = hashlib.sha256(plain.encode()).hexdigest()
    return plain, h


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


__all__ = [
    "validate_jwt_secret_or_die",
    "PasswordPolicyError",
    "evaluate_password",
    "admin_password_policy",
    "user_password_policy",
    "SlidingWindowRateLimiter",
    "rate_limiter",
    "rl_key",
    "bump_session_version",
    "INITIAL_SESSION_VERSION",
    "anonymize_ip",
    "summarize_user_agent",
    "now_iso",
    "token_id_new",
    "sha256_hex",
]
