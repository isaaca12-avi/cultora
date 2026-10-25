"""
Cultora — migraciones idempotentes de seguridad.

Cada migración se ejecuta al arranque, es idempotente y no sobrescribe
valores existentes salvo que sea seguro. Se registra en la colección
`_migrations` para evitar re-ejecuciones (aunque cada operación es también
segura si se corre nuevamente).

Migraciones incluidas:
- 2026_07_11_session_version: `session_version=1` para usuarios sin el campo.
- 2026_07_11_perm_integrity: quita permisos obsoletos del catálogo.
- 2026_07_11_role_integrity: detecta usuarios con roles inexistentes.

Ninguna migración muestra emails, hashes o contenido sensible en logs.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List

logger = logging.getLogger("cultora.migrations")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _record(db, key: str, result: Dict) -> None:
    await db.system_migrations.update_one(
        {"key": key},
        {"$set": {"key": key, "last_run_at": _now(), "result": result}},
        upsert=True,
    )


async def migrate_session_version(db) -> Dict:
    """Setea session_version=1 en usuarios que no lo tengan. Idempotente."""
    res = await db.users.update_many(
        {"session_version": {"$exists": False}},
        {"$set": {"session_version": 1}},
    )
    summary = {"users_updated": res.modified_count}
    await _record(db, "2026_07_11_session_version", summary)
    logger.info("Migration session_version: %d usuarios actualizados", res.modified_count)
    return summary


async def migrate_permission_integrity(db, valid_permissions: List[str]) -> Dict:
    """Detecta y limpia permisos obsoletos en admin_permissions/roles.

    - Para usuarios con override manual, remueve claves que ya no están en el
      catálogo (sin borrar el override completo).
    - No modifica roles del sistema (están definidos en código).
    - Los roles personalizados en admin_roles también se limpian.
    """
    valid = set(valid_permissions or [])
    users_fixed = 0
    async for user in db.users.find({"admin_permissions": {"$exists": True, "$type": "array"}}):
        perms = user.get("admin_permissions") or []
        cleaned = [p for p in perms if p in valid]
        if cleaned != perms:
            await db.users.update_one({"id": user["id"]}, {"$set": {"admin_permissions": cleaned}})
            users_fixed += 1

    roles_fixed = 0
    async for role in db.admin_roles.find({}):
        perms = role.get("permissions") or []
        cleaned = [p for p in perms if p in valid]
        if cleaned != perms:
            await db.admin_roles.update_one({"key": role["key"]}, {"$set": {"permissions": cleaned}})
            roles_fixed += 1

    summary = {"user_overrides_cleaned": users_fixed, "custom_roles_cleaned": roles_fixed}
    await _record(db, "2026_07_11_perm_integrity", summary)
    logger.info(
        "Migration perm_integrity: %d overrides limpiados, %d roles custom limpiados",
        users_fixed, roles_fixed,
    )
    return summary


async def report_orphan_roles(db, valid_system_roles: List[str]) -> Dict:
    """Detecta usuarios con admin_role apuntando a un rol inexistente.
    No modifica nada, sólo informa. Se puede ejecutar en cada arranque.
    """
    system = set(valid_system_roles or [])
    # Roles custom no eliminados
    custom_keys = set()
    async for role in db.admin_roles.find(
        {"deleted_at": {"$exists": False}}, {"key": 1}
    ):
        custom_keys.add(role["key"])
    valid = system | custom_keys

    orphans = 0
    async for user in db.users.find(
        {"admin_role": {"$exists": True, "$ne": None}},
        {"id": 1, "admin_role": 1},
    ):
        r = user.get("admin_role")
        if r and r not in valid:
            orphans += 1

    summary = {"users_with_orphan_role": orphans}
    await _record(db, "2026_07_11_role_integrity", summary)
    if orphans:
        logger.warning(
            "Integridad de roles: %d usuario(s) apuntan a roles inexistentes",
            orphans,
        )
    return summary


async def run_security_migrations(db, *, valid_permissions: List[str], valid_system_roles: List[str]) -> Dict:
    """Ejecuta todas las migraciones de seguridad en orden."""
    return {
        "session_version": await migrate_session_version(db),
        "perm_integrity": await migrate_permission_integrity(db, valid_permissions),
        "role_integrity": await report_orphan_roles(db, valid_system_roles),
    }
