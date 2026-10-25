"""
Cultora — Bootstrap seguro del primer superadministrador.

Reemplaza la lógica insegura de admin_seed.py que:
- Contenía credenciales hardcoded.
- Re-fijaba admin_role="superadmin" y status="active" en cada arranque.
- Podía reactivar cuentas suspendidas o degradadas.

Este módulo es la ÚNICA vía autorizada para crear el primer superadmin.

Comportamiento
--------------
- Si CULTORA_BOOTSTRAP_ENABLED != "true": no ejecuta ninguna operación.
- Si está habilitado:
    - Si YA existe algún superadmin: registra warning y sale (no toca nada).
    - Si NO existe: valida email + password fuerte, crea el usuario con
      must_change_password=true, registra en bitácora y sale.
- Si está habilitado pero faltan variables: RuntimeError (el server falla al iniciar).
- La contraseña NUNCA se escribe en logs.
- La contraseña de la variable de entorno se usa una única vez; el operador
  debe eliminar CULTORA_BOOTSTRAP_ENABLED (o ponerla en false) tras la
  primera inicialización.
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import bcrypt

logger = logging.getLogger("cultora.bootstrap")

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# Password mínimo robusto: 12+ chars, mayúscula, minúscula, dígito y símbolo.
_MIN_PASSWORD_LEN = 12


class BootstrapConfigError(RuntimeError):
    """Configuración de bootstrap inválida — el servidor no debe arrancar."""


def _validate_email(value: str) -> str:
    email = (value or "").strip().lower()
    if not email:
        raise BootstrapConfigError("CULTORA_BOOTSTRAP_ADMIN_EMAIL vacío")
    if not _EMAIL_RE.match(email):
        raise BootstrapConfigError("CULTORA_BOOTSTRAP_ADMIN_EMAIL con formato inválido")
    return email


def _validate_password_strength(password: str) -> None:
    """Valida robustez sin loggear el valor."""
    if not password:
        raise BootstrapConfigError("CULTORA_BOOTSTRAP_ADMIN_PASSWORD vacío")
    if len(password) < _MIN_PASSWORD_LEN:
        raise BootstrapConfigError(
            f"CULTORA_BOOTSTRAP_ADMIN_PASSWORD debe tener al menos {_MIN_PASSWORD_LEN} caracteres"
        )
    if not re.search(r"[a-z]", password):
        raise BootstrapConfigError("CULTORA_BOOTSTRAP_ADMIN_PASSWORD debe incluir minúsculas")
    if not re.search(r"[A-Z]", password):
        raise BootstrapConfigError("CULTORA_BOOTSTRAP_ADMIN_PASSWORD debe incluir mayúsculas")
    if not re.search(r"\d", password):
        raise BootstrapConfigError("CULTORA_BOOTSTRAP_ADMIN_PASSWORD debe incluir un dígito")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise BootstrapConfigError("CULTORA_BOOTSTRAP_ADMIN_PASSWORD debe incluir un símbolo")


def _is_enabled() -> bool:
    """Enabled sólo si el valor es EXACTAMENTE 'true' (case-insensitive, trimmed)."""
    raw = os.environ.get("CULTORA_BOOTSTRAP_ENABLED", "")
    return raw.strip().lower() == "true"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def run_admin_bootstrap(db) -> Dict[str, Any]:
    """Punto de entrada. Devuelve un resumen del resultado sin datos sensibles.

    Devuelve dict:
      {"status": "disabled" | "skipped_existing_superadmin" | "created",
       "email": "..." (sólo cuando corresponde), "user_id": "..." (sólo cuando corresponde)}

    Lanza BootstrapConfigError si el server debe fallar al arrancar.
    """
    if not _is_enabled():
        logger.info("Admin bootstrap: DESHABILITADO (CULTORA_BOOTSTRAP_ENABLED != 'true'). Nada que hacer.")
        return {"status": "disabled"}

    # Habilitado — leer y validar entradas.
    email_raw = os.environ.get("CULTORA_BOOTSTRAP_ADMIN_EMAIL", "")
    password = os.environ.get("CULTORA_BOOTSTRAP_ADMIN_PASSWORD", "")

    email = _validate_email(email_raw)
    _validate_password_strength(password)

    # ¿Ya hay algún superadmin? En cuyo caso NO tocamos nada.
    existing_count = await db.users.count_documents({"admin_role": "superadmin"})
    if existing_count > 0:
        logger.warning(
            "Admin bootstrap: OMITIDO — ya existe(n) %d superadmin(s). "
            "El bootstrap sólo aplica a la inicialización original. "
            "Elimina CULTORA_BOOTSTRAP_ENABLED del entorno.",
            existing_count,
        )
        return {"status": "skipped_existing_superadmin", "existing_superadmins": existing_count}

    # ¿Ya existe una cuenta con este email (aunque haya sido degradada)? No la promovemos
    # automáticamente ni creamos un duplicado. El spec exige que futuros reinicios NUNCA
    # promuevan, reactiven ni modifiquen cuentas.
    existing_by_email = await db.users.find_one({"email": email}, {"id": 1, "admin_role": 1})
    if existing_by_email:
        logger.warning(
            "Admin bootstrap: OMITIDO — ya existe una cuenta con ese email "
            "(admin_role=%r). El bootstrap no promueve ni modifica cuentas existentes.",
            existing_by_email.get("admin_role"),
        )
        return {"status": "skipped_email_in_use"}

    # Crear el primer superadmin.
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    # Limpieza defensiva: aunque `password` viva en memoria del proceso, no lo referenciamos más.
    del password

    user_id = str(uuid.uuid4())
    now = _now_iso()
    user_doc = {
        "id": user_id,
        "email": email,
        "name": "Superadministración",
        "password_hash": password_hash,
        "created_at": now,
        "profile": {},
        "admin_role": "superadmin",
        "status": "active",
        "must_change_password": True,
    }
    await db.users.insert_one(user_doc)

    # Bitácora administrativa: registrar el evento.
    await db.admin_activity.insert_one({
        "id": str(uuid.uuid4()),
        "actor_id": user_id,
        "actor_name": "system.bootstrap",
        "actor_email": email,
        "actor_role": "superadmin",
        "action": "system.bootstrap_admin_created",
        "target_type": "user",
        "target_id": user_id,
        "meta": {
            "note": (
                "Primer superadministrador creado vía bootstrap seguro. "
                "Se exige cambio de contraseña en el primer inicio de sesión."
            ),
        },
        "at": now,
    })

    logger.info(
        "Admin bootstrap: superadmin creado (email=%s, id=%s). "
        "Se exige cambio de contraseña en el primer login. "
        "IMPORTANTE: elimina CULTORA_BOOTSTRAP_ENABLED y CULTORA_BOOTSTRAP_ADMIN_PASSWORD del entorno.",
        email,
        user_id,
    )

    return {"status": "created", "email": email, "user_id": user_id}


__all__ = ["run_admin_bootstrap", "BootstrapConfigError"]
