"""
Cultora — Módulo de notificaciones internas del panel admin.

Diseño:
- Cada notificación tiene un `required_perm`. Solo usuarios con ese permiso la ven.
- Idempotencia por `(kind, target_type, target_id)`: no se duplican al re-escanear.
- `refresh_notifications(db)` escanea las fuentes conocidas y crea las que falten.
  Se llama al startup y bajo demanda (con cachet interno) desde el endpoint list.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


async def notify(
    db, *,
    kind: str,
    title: str,
    subtitle: Optional[str] = None,
    url: Optional[str] = None,
    required_perm: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Crea una notificación si no existe otra con la misma (kind, target).
    Idempotente. Devuelve el doc creado o None si ya existía."""
    query: Dict[str, Any] = {"kind": kind, "dismissed_globally": {"$exists": False}}
    if target_type is not None:
        query["target_type"] = target_type
    if target_id is not None:
        query["target_id"] = target_id
    if target_type is None and target_id is None:
        # Sin target: idempotencia por kind + subtitle + fecha (menos precisa)
        query["subtitle"] = subtitle
        # Solo evitar duplicado en las últimas 24h
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        query["created_at"] = {"$gte": cutoff}
    existing = await db.notifications.find_one(query)
    if existing:
        return None
    doc = {
        "id": _new_id(),
        "kind": kind,
        "title": title,
        "subtitle": subtitle,
        "url": url,
        "required_perm": required_perm,
        "target_type": target_type,
        "target_id": target_id,
        "meta": meta or {},
        "created_at": _now(),
        "read_by": [],
        "dismissed_by": [],
    }
    await db.notifications.insert_one(doc)
    return doc


# Cachet interno para no reescanear en cada request
_LAST_REFRESH: Dict[str, datetime] = {}
_REFRESH_TTL = timedelta(seconds=60)


async def refresh_notifications(db, force: bool = False) -> int:
    """Escanea fuentes y crea notificaciones faltantes. Devuelve # creadas."""
    now = datetime.now(timezone.utc)
    if not force:
        last = _LAST_REFRESH.get("global")
        if last and (now - last) < _REFRESH_TTL:
            return 0

    created = 0

    # 1) Agentes pendientes de aprobación
    async for u in db.users.find(
        {"public_agent.status": "pending"},
        {"_id": 0, "id": 1, "public_agent": 1},
    ):
        pa = u.get("public_agent") or {}
        r = await notify(
            db,
            kind="agent.pending",
            title="Nuevo agente pendiente de aprobación",
            subtitle=f"{pa.get('name','—')} · {pa.get('city','—')}",
            url=f"/admin/agentes?focus={u['id']}",
            required_perm="agents.approve",
            target_type="agent",
            target_id=u["id"],
            meta={"discipline": pa.get("discipline")},
        )
        if r:
            created += 1

    # 2) Convocatorias que vencen en < 7 días
    today = now.date().isoformat()
    limit_date = (now + timedelta(days=7)).date().isoformat()
    async for c in db.convocatorias.find(
        {
            "deleted_at": {"$exists": False},
            "status": "Abierta",
            "close_date": {"$gte": today, "$lte": limit_date},
        },
        {"_id": 0, "id": 1, "title": 1, "close_date": 1, "entity": 1},
    ):
        r = await notify(
            db,
            kind="convocatoria.expiring",
            title="Convocatoria a punto de vencer",
            subtitle=f"{c['title']} · cierra {c['close_date']}",
            url=f"/admin/convocatorias?focus={c['id']}",
            required_perm="convocatorias.edit",
            target_type="convocatoria",
            target_id=c["id"],
            meta={"close_date": c["close_date"], "entity": c.get("entity")},
        )
        if r:
            created += 1

    # 3) Reportes abiertos del foro
    async for rep in db.forum_reports.find(
        {"status": "open"},
        {"_id": 0, "id": 1, "topic_id": 1, "reason": 1, "created_at": 1},
    ).limit(50):
        r = await notify(
            db,
            kind="forum.reported",
            title="Nuevo reporte en el foro",
            subtitle=rep.get("reason") or "Contenido reportado",
            url=f"/admin/foro?focus={rep.get('topic_id')}",
            required_perm="forum.handle_reports",
            target_type="forum_report",
            target_id=rep.get("id"),
            meta={"topic_id": rep.get("topic_id")},
        )
        if r:
            created += 1

    # 4) Usuarios registrados en las últimas 24h (agrupado, no individual)
    cutoff = (now - timedelta(hours=24)).isoformat()
    recent = await db.users.count_documents({
        "created_at": {"$gte": cutoff},
        "deleted_at": {"$exists": False},
    })
    if recent > 0:
        r = await notify(
            db,
            kind="users.recent_registrations",
            title="Nuevos usuarios registrados",
            subtitle=f"{recent} usuarios se registraron en las últimas 24 horas",
            url="/admin/usuarios",
            required_perm="users.view",
            target_type="users_batch",
            target_id=now.date().isoformat(),  # una por día
            meta={"count": recent},
        )
        if r:
            created += 1

    _LAST_REFRESH["global"] = now
    return created
