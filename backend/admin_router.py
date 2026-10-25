"""
Cultora — Rutas del Panel Administrativo.

Diseño:
- Módulo aislado con su propio router (montado en /api/admin).
- Todos los endpoints requieren autenticación + permiso granular.
- Eliminación lógica (deleted_at) siempre que sea posible.
- Bitácora automática para acciones importantes.

Uso desde server.py:
    from admin_router import build_admin_router
    app.include_router(build_admin_router(db, get_current_user))
"""
import logging
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field

from admin_permissions import PERMISSIONS, ROLE_DEFINITIONS, permissions_for_role
from notifications import refresh_notifications, notify as _notify_helper
from rag import chunk_text, search as kb_search, bump_version as kb_bump, format_context_block
from taxonomy import DECISION_RULES as _DEFAULT_RULES, GOAL_CATALOG, DIAGNOSTIC_QUESTIONS, PLAN_TEMPLATES

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------
# Helpers puros
# --------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _user_perms(user: Dict[str, Any]) -> Set[str]:
    role = user.get("admin_role")
    if not role:
        return set()
    explicit = user.get("admin_permissions")
    if isinstance(explicit, list):
        return set(explicit)
    return permissions_for_role(role)


def _has(user: Dict[str, Any], perm: str) -> bool:
    return perm in _user_perms(user)


def build_admin_router(db, get_current_user) -> APIRouter:
    """Construye y devuelve el APIRouter admin cerrando db + auth dep."""
    router = APIRouter(prefix="/api/admin", tags=["admin"])

    async def _log(actor: Dict[str, Any], action: str, target_type: str,
                   target_id: Optional[str] = None, meta: Optional[Dict[str, Any]] = None):
        await db.admin_activity.insert_one({
            "id": _new_id(),
            "actor_id": actor.get("id"),
            "actor_name": actor.get("name"),
            "actor_email": actor.get("email"),
            "actor_role": actor.get("admin_role"),
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "meta": meta or {},
            "at": _now_iso(),
        })

    def _require(perm: Optional[str] = None):
        """Devuelve dependencia. Sin perm: cualquier usuario admin. Con perm: exacto."""
        async def _dep(user=Depends(get_current_user)):
            perms = _user_perms(user)
            if not perms:
                raise HTTPException(403, "Acceso restringido")
            if user.get("status") == "blocked":
                raise HTTPException(403, "Cuenta bloqueada")
            if perm and perm not in perms:
                raise HTTPException(403, f"Permiso requerido: {perm}")
            return user
        return _dep

    # ================================================================
    # ME + RBAC
    # ================================================================
    @router.get("/me")
    async def admin_me(user=Depends(get_current_user)):
        perms = list(_user_perms(user))
        role = user.get("admin_role")
        role_info = ROLE_DEFINITIONS.get(role) if role else None
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "admin_role": role,
            "role_label": role_info["label"] if role_info else None,
            "permissions": perms,
            "is_admin": bool(perms),
            "status": user.get("status", "active"),
        }

    @router.get("/rbac/permissions")
    async def list_permissions(user=Depends(_require())):
        return {"permissions": PERMISSIONS}

    @router.get("/rbac/roles")
    async def list_roles(user=Depends(_require())):
        return {"roles": [
            {**r, "permissions_count": len(r["permissions"])}
            for r in ROLE_DEFINITIONS.values()
        ]}

    # ================================================================
    # DASHBOARD
    # ================================================================
    @router.get("/dashboard")
    async def dashboard(user=Depends(_require())):
        now = datetime.now(timezone.utc)
        last_7d_cutoff = (now - timedelta(days=7)).isoformat()

        users_total = await db.users.count_documents({"deleted_at": {"$exists": False}})
        users_new_7d = await db.users.count_documents({
            "created_at": {"$gte": last_7d_cutoff}, "deleted_at": {"$exists": False}
        })
        active_ids = await db.sessions.distinct("user_id", {"updated_at": {"$gte": last_7d_cutoff}})

        agents_published = await db.users.count_documents({"public_agent.published": True})
        agents_pending = await db.users.count_documents({"public_agent.status": "pending"})

        forum_topics = await db.forum_topics.count_documents({"deleted_at": {"$exists": False}})
        forum_replies = await db.forum_replies.count_documents({"deleted_at": {"$exists": False}})
        forum_reports = await db.forum_reports.count_documents({"status": "open"})

        conv_active = await db.convocatorias.count_documents({"status": "Abierta", "deleted_at": {"$exists": False}})
        conv_draft = await db.convocatorias.count_documents({"status": "Borrador", "deleted_at": {"$exists": False}})

        # temas recientes
        recent_topics = await db.forum_topics.find(
            {"deleted_at": {"$exists": False}}, {"_id": 0, "id": 1, "title": 1, "author_name": 1, "created_at": 1, "category": 1}
        ).sort("created_at", -1).limit(5).to_list(5)

        recent_activity = await db.admin_activity.find({}, {"_id": 0}).sort("at", -1).to_list(8)

        return {
            "metrics": {
                "users_total": users_total,
                "users_new_7d": users_new_7d,
                "users_active_7d": len(active_ids),
                "agents_published": agents_published,
                "agents_pending": agents_pending,
                "forum_topics": forum_topics,
                "forum_replies": forum_replies,
                "forum_reports_open": forum_reports,
                "convocatorias_active": conv_active,
                "convocatorias_draft": conv_draft,
            },
            "recent_topics": recent_topics,
            "recent_activity": recent_activity,
            "generated_at": _now_iso(),
        }

    # ================================================================
    # USUARIOS
    # ================================================================
    @router.get("/users")
    async def list_users(
        q: Optional[str] = None, role: Optional[str] = None,
        status: Optional[str] = None, page: int = 1, limit: int = 50,
        user=Depends(_require("users.view")),
    ):
        query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
        if q:
            rx = {"$regex": re.escape(q), "$options": "i"}
            query["$or"] = [{"email": rx}, {"name": rx}]
        if role == "none":
            query["admin_role"] = None
        elif role:
            query["admin_role"] = role
        if status:
            query["status"] = status
        lim = max(1, min(limit, 200))
        skip = max(0, (page - 1) * lim)
        total = await db.users.count_documents(query)
        items = await db.users.find(
            query, {"_id": 0, "password_hash": 0, "conv_recommendations": 0}
        ).sort("created_at", -1).skip(skip).limit(lim).to_list(lim)
        for u in items:
            u.setdefault("status", "active")
            u["is_active"] = u.get("status") == "active"
        return {"count": len(items), "total": total, "page": page, "limit": lim,
                "has_more": skip + len(items) < total, "items": items}

    @router.get("/users/{uid}")
    async def get_user(uid: str, user=Depends(_require("users.view"))):
        u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        if not u:
            raise HTTPException(404, "Usuario no encontrado")
        u.setdefault("status", "active")
        u["recent_sessions"] = await db.sessions.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(5)
        u["recent_plans"] = await db.plans.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(5)
        u["recent_topics"] = await db.forum_topics.find({"author_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(5)
        return u

    class UserRoleIn(BaseModel):
        role: Optional[str] = None

    async def _count_active_superadmins(exclude_uid: Optional[str] = None) -> int:
        q = {"admin_role": "superadmin", "status": {"$ne": "blocked"}}
        if exclude_uid:
            q["id"] = {"$ne": exclude_uid}
        return await db.users.count_documents(q)

    @router.put("/users/{uid}/role")
    async def set_user_role(uid: str, body: UserRoleIn, user=Depends(_require("users.edit_role"))):
        role_key = body.role
        # No modificar el propio rol (autopromoción o autodegradación).
        if uid == user["id"]:
            raise HTTPException(400, "No puedes cambiar tu propio rol.")
        # Sólo superadmin puede otorgar superadmin.
        if role_key == "superadmin" and user.get("admin_role") != "superadmin":
            raise HTTPException(403, "Sólo un superadmin puede promover a otra cuenta a superadmin.")
        # Verificar que el usuario no esté siendo degradado si es el último superadmin activo.
        target = await db.users.find_one({"id": uid}, {"admin_role": 1, "status": 1})
        if not target:
            raise HTTPException(404, "Usuario no encontrado")
        target_was_super = target.get("admin_role") == "superadmin"
        if target_was_super and role_key != "superadmin":
            remaining = await _count_active_superadmins(exclude_uid=uid)
            if remaining < 1:
                raise HTTPException(400, "No puedes dejar al sistema sin al menos un superadministrador activo.")

        set_ops: Dict[str, Any] = {}
        unset_ops: Dict[str, Any] = {}
        if role_key:
            if role_key in ROLE_DEFINITIONS:
                set_ops["admin_role"] = role_key
                unset_ops["admin_permissions"] = ""
            else:
                custom = await db.admin_roles.find_one({"key": role_key, "deleted_at": {"$exists": False}})
                if not custom:
                    raise HTTPException(400, "Rol inválido")
                set_ops["admin_role"] = role_key
                set_ops["admin_permissions"] = custom.get("permissions") or []
        else:
            unset_ops["admin_role"] = ""
            unset_ops["admin_permissions"] = ""
        # Session version bump obligatorio: los tokens previos del target quedan inválidos.
        set_ops["session_version"] = int((target.get("session_version") or 1)) + 1
        update: Dict[str, Any] = {"$set": set_ops}
        if unset_ops:
            update["$unset"] = unset_ops
        r = await db.users.update_one({"id": uid}, update)
        if r.matched_count == 0:
            raise HTTPException(404, "Usuario no encontrado")
        await _log(user, "user.role_changed", "user", uid,
                   {"new_role": role_key, "previous_role": target.get("admin_role"),
                    "session_revoked": True})
        return {"ok": True, "role": role_key}

    class UserStatusIn(BaseModel):
        status: str
        reason: Optional[str] = None

    @router.put("/users/{uid}/status")
    async def set_user_status(uid: str, body: UserStatusIn, user=Depends(get_current_user)):
        needed = {"suspended": "users.suspend", "active": "users.reactivate", "blocked": "users.block"}
        perm = needed.get(body.status)
        if not perm:
            raise HTTPException(400, "Estado inválido")
        if not _has(user, perm):
            raise HTTPException(403, f"Permiso requerido: {perm}")
        if uid == user["id"]:
            raise HTTPException(400, "No puedes cambiar tu propio estado")
        # Proteger al último superadmin activo: no permitir suspender ni bloquear.
        if body.status in ("suspended", "blocked"):
            target = await db.users.find_one({"id": uid}, {"admin_role": 1, "session_version": 1})
            if not target:
                raise HTTPException(404, "Usuario no encontrado")
            if target.get("admin_role") == "superadmin":
                remaining = await _count_active_superadmins(exclude_uid=uid)
                if remaining < 1:
                    raise HTTPException(
                        400,
                        "No puedes suspender ni bloquear al último superadministrador activo.",
                    )
        current = await db.users.find_one({"id": uid}, {"session_version": 1})
        new_sv = int((current or {}).get("session_version") or 1) + 1
        r = await db.users.update_one(
            {"id": uid},
            {"$set": {
                "status": body.status,
                "status_reason": body.reason,
                "status_at": _now_iso(),
                "session_version": new_sv,
            }},
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Usuario no encontrado")
        await _log(user, f"user.{body.status}", "user", uid,
                   {"reason": body.reason, "session_revoked": True})
        return {"ok": True, "status": body.status}

    # ================================================================
    # AGENTES
    # ================================================================
    @router.get("/agents")
    async def list_admin_agents(
        q: Optional[str] = None, status: Optional[str] = None,
        page: int = 1, limit: int = 50,
        user=Depends(_require("agents.view")),
    ):
        query: Dict[str, Any] = {"public_agent": {"$exists": True}}
        if q:
            rx = {"$regex": re.escape(q), "$options": "i"}
            query["$or"] = [
                {"public_agent.name": rx}, {"public_agent.role": rx},
                {"public_agent.discipline": rx}, {"email": rx},
            ]
        if status:
            query["public_agent.status"] = status
        lim = max(1, min(limit, 200))
        skip = max(0, (page - 1) * lim)
        total = await db.users.count_documents(query)
        users_list = await db.users.find(
            query, {"_id": 0, "password_hash": 0}
        ).skip(skip).limit(lim).to_list(lim)
        items = []
        for u in users_list:
            pa = u.get("public_agent") or {}
            items.append({
                "user_id": u["id"],
                "agent_id": f"user-{u['id']}",
                "email": u.get("email"),
                "name": pa.get("name") or u.get("name"),
                "role": pa.get("role"),
                "discipline": pa.get("discipline"),
                "city": pa.get("city"),
                "status": pa.get("status") or ("approved" if pa.get("published") else "pending"),
                "verified": bool(pa.get("verified")),
                "published": bool(pa.get("published")),
                "created_at": pa.get("created_at") or u.get("created_at"),
                "updated_at": pa.get("updated_at"),
            })
        return {"count": len(items), "total": total, "page": page, "limit": lim,
                "has_more": skip + len(items) < total, "items": items}

    class AgentStatusIn(BaseModel):
        status: str
        note: Optional[str] = None

    @router.put("/agents/{uid}/status")
    async def set_agent_status(uid: str, body: AgentStatusIn, user=Depends(get_current_user)):
        allowed = {
            "approved": "agents.approve",
            "hidden": "agents.hide",
            "suspended": "agents.suspend",
            "pending": "agents.request_correction",
        }
        perm = allowed.get(body.status)
        if not perm:
            raise HTTPException(400, "Estado inválido")
        if not _has(user, perm):
            raise HTTPException(403, f"Permiso requerido: {perm}")
        upd = {
            "public_agent.status": body.status,
            "public_agent.status_note": body.note,
            "public_agent.updated_at": _now_iso(),
        }
        if body.status == "approved":
            upd["public_agent.published"] = True
        elif body.status in {"hidden", "suspended"}:
            upd["public_agent.published"] = False
        r = await db.users.update_one({"id": uid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404, "Agente no encontrado")
        await _log(user, f"agent.{body.status}", "agent", uid, {"note": body.note})
        return {"ok": True, "status": body.status}

    class AgentVerifyIn(BaseModel):
        verified: bool

    @router.put("/agents/{uid}/verify")
    async def verify_agent(uid: str, body: AgentVerifyIn,
                           user=Depends(_require("agents.verify"))):
        await db.users.update_one({"id": uid}, {"$set": {"public_agent.verified": body.verified}})
        await _log(user, "agent.verify" if body.verified else "agent.unverify", "agent", uid)
        return {"ok": True, "verified": body.verified}

    # ================================================================
    # FORO
    # ================================================================
    @router.get("/forum/topics")
    async def admin_forum_topics(
        q: Optional[str] = None, category: Optional[str] = None,
        status: Optional[str] = None, page: int = 1, limit: int = 50,
        user=Depends(_require("forum.view")),
    ):
        query: Dict[str, Any] = {}
        if status == "deleted":
            query["deleted_at"] = {"$exists": True}
        else:
            query["deleted_at"] = {"$exists": False}
            if status == "closed":
                query["closed"] = True
            elif status == "open":
                query["$or"] = [{"closed": {"$exists": False}}, {"closed": False}]
        if category:
            query["category"] = category
        if q:
            rx = {"$regex": re.escape(q), "$options": "i"}
            query.setdefault("$or", [])
            query["$or"].extend([{"title": rx}, {"body": rx}])
        lim = max(1, min(limit, 200))
        skip = max(0, (page - 1) * lim)
        total = await db.forum_topics.count_documents(query)
        items = await db.forum_topics.find(query, {"_id": 0}).sort("updated_at", -1).skip(skip).limit(lim).to_list(lim)
        return {"count": len(items), "total": total, "page": page, "limit": lim,
                "has_more": skip + len(items) < total, "items": items}

    class TopicUpdateIn(BaseModel):
        title: Optional[str] = None
        body: Optional[str] = None
        category: Optional[str] = None
        featured: Optional[bool] = None
        pinned: Optional[bool] = None
        closed: Optional[bool] = None

    @router.put("/forum/topics/{tid}")
    async def admin_update_topic(tid: str, body: TopicUpdateIn, user=Depends(get_current_user)):
        updates: Dict[str, Any] = {}
        if body.title is not None or body.body is not None or body.category is not None:
            if not _has(user, "forum.edit"):
                raise HTTPException(403, "Permiso requerido: forum.edit")
            if body.title is not None: updates["title"] = body.title.strip()
            if body.body is not None: updates["body"] = body.body.strip()
            if body.category is not None: updates["category"] = body.category
        if body.featured is not None or body.pinned is not None:
            if not _has(user, "forum.pin"):
                raise HTTPException(403, "Permiso requerido: forum.pin")
            if body.featured is not None: updates["featured"] = body.featured
            if body.pinned is not None: updates["pinned"] = body.pinned
        if body.closed is not None:
            if not _has(user, "forum.close"):
                raise HTTPException(403, "Permiso requerido: forum.close")
            updates["closed"] = body.closed
        if not updates:
            raise HTTPException(400, "Nada que actualizar")
        updates["updated_at"] = _now_iso()
        r = await db.forum_topics.update_one({"id": tid}, {"$set": updates})
        if r.matched_count == 0:
            raise HTTPException(404, "Tema no encontrado")
        await _log(user, "forum.topic_updated", "topic", tid, {"fields": list(updates.keys())})
        return {"ok": True}

    @router.delete("/forum/topics/{tid}")
    async def admin_delete_topic(tid: str, user=Depends(_require("forum.delete"))):
        r = await db.forum_topics.update_one(
            {"id": tid},
            {"$set": {"deleted_at": _now_iso(), "deleted_by": user["id"]}}
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Tema no encontrado")
        await _log(user, "forum.topic_deleted", "topic", tid)
        return {"ok": True}

    # ================================================================
    # CONVOCATORIAS
    # ================================================================
    class ConvocatoriaIn(BaseModel):
        model_config = ConfigDict(extra="ignore")
        title: str
        entity: str
        country: str
        status: str = "Borrador"
        summary: Optional[str] = None
        description: Optional[str] = None
        types: List[str] = Field(default_factory=list)
        areas: List[str] = Field(default_factory=list)
        proponents: List[str] = Field(default_factory=list)
        tags: List[str] = Field(default_factory=list)
        open_date: Optional[str] = None
        close_date: Optional[str] = None
        publish_at: Optional[str] = None
        amount_min: Optional[int] = None
        amount_max: Optional[int] = None
        moneda: Optional[str] = "USD"
        modalidad: Optional[str] = None
        source_name: Optional[str] = None
        source_url: Optional[str] = None
        official_url: Optional[str] = None
        requirements: Optional[str] = None

    @router.get("/convocatorias")
    async def admin_list_conv(
        q: Optional[str] = None, status: Optional[str] = None,
        page: int = 1, limit: int = 50, user=Depends(_require("convocatorias.view")),
    ):
        query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
        if status: query["status"] = status
        if q:
            rx = {"$regex": re.escape(q), "$options": "i"}
            query["$or"] = [{"title": rx}, {"entity": rx}, {"country": rx}]
        lim = max(1, min(limit, 200))
        skip = max(0, (page - 1) * lim)
        total = await db.convocatorias.count_documents(query)
        items = await db.convocatorias.find(query, {"_id": 0}).sort("updated_at", -1).skip(skip).limit(lim).to_list(lim)
        today = datetime.now(timezone.utc).date().isoformat()
        for c in items:
            if c.get("status") == "Abierta" and c.get("close_date") and c["close_date"] < today:
                await db.convocatorias.update_one({"id": c["id"]}, {"$set": {"status": "Cerrada"}})
                c["status"] = "Cerrada"
        return {"count": len(items), "total": total, "page": page, "limit": lim,
                "has_more": skip + len(items) < total, "items": items}

    @router.post("/convocatorias")
    async def admin_create_conv(body: ConvocatoriaIn, user=Depends(_require("convocatorias.create"))):
        doc = body.model_dump()
        doc.update({"id": _new_id(), "created_at": _now_iso(), "updated_at": _now_iso(), "created_by": user["id"]})
        await db.convocatorias.insert_one(doc)
        await _log(user, "convocatoria.created", "convocatoria", doc["id"], {"title": doc["title"]})
        doc.pop("_id", None)
        return doc

    @router.get("/convocatorias/{cid}")
    async def admin_get_conv(cid: str, user=Depends(_require("convocatorias.view"))):
        c = await db.convocatorias.find_one({"id": cid}, {"_id": 0})
        if not c:
            raise HTTPException(404, "No encontrada")
        return c

    @router.put("/convocatorias/{cid}")
    async def admin_update_conv(cid: str, body: ConvocatoriaIn, user=Depends(_require("convocatorias.edit"))):
        upd = body.model_dump()
        upd["updated_at"] = _now_iso()
        r = await db.convocatorias.update_one({"id": cid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404, "No encontrada")
        await _log(user, "convocatoria.updated", "convocatoria", cid)
        return {"ok": True}

    class ConvStatusIn(BaseModel):
        status: str
        publish_at: Optional[str] = None

    @router.put("/convocatorias/{cid}/status")
    async def admin_conv_status(cid: str, body: ConvStatusIn, user=Depends(get_current_user)):
        map_perm = {
            "Abierta": "convocatorias.publish",
            "Cerrada": "convocatorias.close",
            "Archivada": "convocatorias.archive",
            "Programada": "convocatorias.schedule",
            "Borrador": "convocatorias.edit",
        }
        perm = map_perm.get(body.status)
        if not perm:
            raise HTTPException(400, "Estado inválido")
        if not _has(user, perm):
            raise HTTPException(403, f"Permiso requerido: {perm}")
        upd: Dict[str, Any] = {"status": body.status, "updated_at": _now_iso()}
        if body.status == "Programada" and body.publish_at:
            upd["publish_at"] = body.publish_at
        r = await db.convocatorias.update_one({"id": cid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404, "No encontrada")
        await _log(user, f"convocatoria.{body.status.lower()}", "convocatoria", cid)
        return {"ok": True}

    @router.post("/convocatorias/{cid}/duplicate")
    async def admin_duplicate_conv(cid: str, user=Depends(_require("convocatorias.duplicate"))):
        src = await db.convocatorias.find_one({"id": cid}, {"_id": 0})
        if not src:
            raise HTTPException(404, "No encontrada")
        dup = dict(src)
        dup["id"] = _new_id()
        dup["title"] = f"{src.get('title','')} (copia)"
        dup["status"] = "Borrador"
        dup["created_at"] = _now_iso()
        dup["updated_at"] = _now_iso()
        dup["created_by"] = user["id"]
        await db.convocatorias.insert_one(dup)
        await _log(user, "convocatoria.duplicated", "convocatoria", dup["id"], {"from": cid})
        dup.pop("_id", None)
        return dup

    # ================================================================
    # RECURSOS
    # ================================================================
    class ResourceIn(BaseModel):
        model_config = ConfigDict(extra="ignore")
        title: str
        kind: str = "articulo"
        category: str
        summary: Optional[str] = None
        body: Optional[str] = None
        url: Optional[str] = None
        tags: List[str] = Field(default_factory=list)
        status: str = "draft"

    @router.get("/resources")
    async def list_resources(
        q: Optional[str] = None, kind: Optional[str] = None,
        category: Optional[str] = None,
        user=Depends(_require("resources.view")),
    ):
        query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
        if q:
            rx = {"$regex": re.escape(q), "$options": "i"}
            query["$or"] = [{"title": rx}, {"summary": rx}]
        if kind: query["kind"] = kind
        if category: query["category"] = category
        items = await db.resources.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
        return {"count": len(items), "items": items}

    @router.post("/resources")
    async def create_resource(body: ResourceIn, user=Depends(_require("resources.create"))):
        doc = body.model_dump()
        doc.update({"id": _new_id(), "created_at": _now_iso(), "updated_at": _now_iso(), "created_by": user["id"]})
        await db.resources.insert_one(doc)
        await _log(user, "resource.created", "resource", doc["id"], {"title": doc["title"]})
        doc.pop("_id", None)
        return doc

    @router.put("/resources/{rid}")
    async def update_resource(rid: str, body: ResourceIn, user=Depends(_require("resources.edit"))):
        upd = body.model_dump()
        upd["updated_at"] = _now_iso()
        r = await db.resources.update_one({"id": rid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404, "No encontrado")
        await _log(user, "resource.updated", "resource", rid)
        return {"ok": True}

    @router.delete("/resources/{rid}")
    async def delete_resource(rid: str, user=Depends(_require("resources.delete"))):
        r = await db.resources.update_one({"id": rid}, {"$set": {"deleted_at": _now_iso()}})
        if r.matched_count == 0:
            raise HTTPException(404, "No encontrado")
        await _log(user, "resource.deleted", "resource", rid)
        return {"ok": True}

    # ================================================================
    # ESPACIOS
    # ================================================================
    class SpaceIn(BaseModel):
        model_config = ConfigDict(extra="ignore")
        name: str
        summary: Optional[str] = None
        description: Optional[str] = None
        address: Optional[str] = None
        city: Optional[str] = None
        country: Optional[str] = None
        capacity: Optional[int] = None
        equipment: List[str] = Field(default_factory=list)
        contact_email: Optional[str] = None
        contact_phone: Optional[str] = None
        website: Optional[str] = None
        status: str = "active"

    @router.get("/spaces")
    async def list_spaces(
        q: Optional[str] = None, city: Optional[str] = None,
        status: Optional[str] = None,
        user=Depends(_require("spaces.view")),
    ):
        query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
        if q:
            rx = {"$regex": re.escape(q), "$options": "i"}
            query["$or"] = [{"name": rx}, {"city": rx}]
        if city: query["city"] = city
        if status: query["status"] = status
        items = await db.spaces.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
        return {"count": len(items), "items": items}

    @router.post("/spaces")
    async def create_space(body: SpaceIn, user=Depends(_require("spaces.create"))):
        doc = body.model_dump()
        doc.update({"id": _new_id(), "created_at": _now_iso(), "updated_at": _now_iso(), "created_by": user["id"]})
        await db.spaces.insert_one(doc)
        await _log(user, "space.created", "space", doc["id"], {"name": doc["name"]})
        doc.pop("_id", None)
        return doc

    @router.put("/spaces/{sid}")
    async def update_space(sid: str, body: SpaceIn, user=Depends(_require("spaces.edit"))):
        upd = body.model_dump()
        upd["updated_at"] = _now_iso()
        r = await db.spaces.update_one({"id": sid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404, "No encontrado")
        await _log(user, "space.updated", "space", sid)
        return {"ok": True}

    @router.delete("/spaces/{sid}")
    async def delete_space(sid: str, user=Depends(_require("spaces.delete"))):
        r = await db.spaces.update_one({"id": sid}, {"$set": {"deleted_at": _now_iso()}})
        if r.matched_count == 0:
            raise HTTPException(404, "No encontrado")
        await _log(user, "space.deleted", "space", sid)
        return {"ok": True}

    # ================================================================
    # ANALYTICS
    # ================================================================
    @router.get("/analytics")
    async def analytics(user=Depends(_require("analytics.view"))):
        users_total = await db.users.count_documents({"deleted_at": {"$exists": False}})
        agents_pub = await db.users.count_documents({"public_agent.published": True})
        topics = await db.forum_topics.count_documents({"deleted_at": {"$exists": False}})
        conv = await db.convocatorias.count_documents({"deleted_at": {"$exists": False}})
        sample_series = [
            {"month": "2025-09", "users": 12, "sessions": 34, "plans": 8},
            {"month": "2025-10", "users": 21, "sessions": 61, "plans": 15},
            {"month": "2025-11", "users": 38, "sessions": 92, "plans": 27},
            {"month": "2025-12", "users": 54, "sessions": 130, "plans": 41},
            {"month": "2026-01", "users": 71, "sessions": 174, "plans": 58},
            {"month": "2026-02", "users": users_total, "sessions": None, "plans": None},
        ]
        return {
            "real": {
                "users_total": users_total,
                "agents_published": agents_pub,
                "forum_topics": topics,
                "convocatorias": conv,
            },
            "sample_series": sample_series,
            "sample_disclaimer": "Serie histórica de ejemplo. Solo el último punto refleja datos reales de la plataforma.",
        }

    # ================================================================
    # CONFIG
    # ================================================================
    _CONFIG_KEYS = {
        "disciplines", "categories", "countries", "cities", "tags", "states",
        "conv_types", "conv_areas", "conv_modalidades",
    }

    @router.get("/config")
    async def get_config(user=Depends(_require("config.view"))):
        doc = await db.admin_config.find_one({"id": "global"}, {"_id": 0}) or {"id": "global"}
        for k in _CONFIG_KEYS:
            doc.setdefault(k, [])
        return doc

    class ConfigListIn(BaseModel):
        key: str
        values: List[str]

    @router.put("/config")
    async def set_config_list(body: ConfigListIn, user=Depends(_require("config.edit"))):
        if body.key not in _CONFIG_KEYS:
            raise HTTPException(400, "Clave no permitida")
        values = [v.strip() for v in body.values if v and v.strip()]
        await db.admin_config.update_one(
            {"id": "global"},
            {"$set": {body.key: values, "updated_at": _now_iso()}},
            upsert=True,
        )
        await _log(user, "config.updated", "config", body.key, {"count": len(values)})
        return {"ok": True, "key": body.key, "count": len(values)}

    # ================================================================
    # ACTIVITY LOG
    # ================================================================
    @router.get("/activity")
    async def list_activity(
        actor: Optional[str] = None, action: Optional[str] = None,
        target_type: Optional[str] = None, page: int = 1, limit: int = 50,
        user=Depends(_require("activity.view")),
    ):
        query: Dict[str, Any] = {}
        if actor: query["actor_id"] = actor
        if action: query["action"] = {"$regex": re.escape(action), "$options": "i"}
        if target_type: query["target_type"] = target_type
        lim = max(1, min(limit, 200))
        skip = max(0, (page - 1) * lim)
        total = await db.admin_activity.count_documents(query)
        items = await db.admin_activity.find(query, {"_id": 0}).sort("at", -1).skip(skip).limit(lim).to_list(lim)
        return {"count": len(items), "total": total, "page": page, "limit": lim,
                "has_more": skip + len(items) < total, "items": items}

    # ================================================================
    # SEARCH (para command palette ⌘K)
    # ================================================================
    @router.get("/search")
    async def global_search(q: str, user=Depends(_require())):
        """Busca en paralelo en las colecciones principales y devuelve top matches."""
        q = (q or "").strip()
        if not q or len(q) < 2:
            return {"query": q, "results": []}
        perms = _user_perms(user)
        rx = {"$regex": re.escape(q), "$options": "i"}
        results: List[Dict[str, Any]] = []

        if "users.view" in perms:
            async for u in db.users.find(
                {"$or": [{"email": rx}, {"name": rx}], "deleted_at": {"$exists": False}},
                {"_id": 0, "id": 1, "name": 1, "email": 1, "admin_role": 1, "status": 1},
            ).limit(5):
                results.append({
                    "type": "user", "id": u["id"], "title": u.get("name") or u["email"],
                    "subtitle": u.get("email"), "meta": u.get("admin_role") or "usuario",
                    "url": f"/admin/usuarios?focus={u['id']}",
                })

        if "agents.view" in perms:
            async for a in db.users.find(
                {"public_agent": {"$exists": True}, "$or": [
                    {"public_agent.name": rx}, {"public_agent.role": rx},
                    {"public_agent.discipline": rx}, {"email": rx}]},
                {"_id": 0, "id": 1, "public_agent": 1},
            ).limit(5):
                pa = a.get("public_agent") or {}
                results.append({
                    "type": "agent", "id": a["id"],
                    "title": pa.get("name") or "Agente",
                    "subtitle": pa.get("role") or pa.get("discipline"),
                    "meta": pa.get("city"),
                    "url": f"/admin/agentes?focus={a['id']}",
                })

        if "convocatorias.view" in perms:
            async for c in db.convocatorias.find(
                {"deleted_at": {"$exists": False},
                 "$or": [{"title": rx}, {"entity": rx}]},
                {"_id": 0, "id": 1, "title": 1, "entity": 1, "status": 1, "country": 1},
            ).sort("updated_at", -1).limit(5):
                results.append({
                    "type": "convocatoria", "id": c["id"], "title": c["title"],
                    "subtitle": f"{c.get('entity','')} · {c.get('country','')}",
                    "meta": c.get("status"),
                    "url": f"/admin/convocatorias?focus={c['id']}",
                })

        if "forum.view" in perms:
            async for t in db.forum_topics.find(
                {"deleted_at": {"$exists": False}, "$or": [{"title": rx}, {"body": rx}]},
                {"_id": 0, "id": 1, "title": 1, "category": 1, "author_name": 1},
            ).sort("updated_at", -1).limit(5):
                results.append({
                    "type": "topic", "id": t["id"], "title": t["title"],
                    "subtitle": t.get("author_name"), "meta": t.get("category"),
                    "url": f"/admin/foro?focus={t['id']}",
                })

        if "resources.view" in perms:
            async for r in db.resources.find(
                {"deleted_at": {"$exists": False}, "$or": [{"title": rx}, {"summary": rx}]},
                {"_id": 0, "id": 1, "title": 1, "kind": 1, "category": 1},
            ).limit(3):
                results.append({
                    "type": "resource", "id": r["id"], "title": r["title"],
                    "subtitle": r.get("summary"), "meta": r.get("kind"),
                    "url": f"/admin/recursos?focus={r['id']}",
                })

        if "spaces.view" in perms:
            async for s in db.spaces.find(
                {"deleted_at": {"$exists": False}, "$or": [{"name": rx}, {"city": rx}]},
                {"_id": 0, "id": 1, "name": 1, "city": 1, "country": 1},
            ).limit(3):
                results.append({
                    "type": "space", "id": s["id"], "title": s["name"],
                    "subtitle": s.get("city"), "meta": s.get("country"),
                    "url": f"/admin/espacios?focus={s['id']}",
                })

        return {"query": q, "results": results}

    # ================================================================
    # DETAIL endpoints (drawers)
    # ================================================================
    @router.get("/agents/{uid}")
    async def get_agent_detail(uid: str, user=Depends(_require("agents.view"))):
        u = await db.users.find_one({"id": uid, "public_agent": {"$exists": True}}, {"_id": 0, "password_hash": 0})
        if not u:
            raise HTTPException(404, "Agente no encontrado")
        history = await db.admin_activity.find(
            {"target_type": "agent", "target_id": uid}, {"_id": 0}
        ).sort("at", -1).limit(20).to_list(20)
        return {
            "user_id": u["id"], "email": u.get("email"),
            "public_agent": u.get("public_agent") or {},
            "profile": u.get("profile") or {},
            "history": history,
        }

    @router.get("/forum/topics/{tid}")
    async def get_topic_detail(tid: str, user=Depends(_require("forum.view"))):
        t = await db.forum_topics.find_one({"id": tid}, {"_id": 0})
        if not t:
            raise HTTPException(404, "Tema no encontrado")
        replies = await db.forum_replies.find(
            {"topic_id": tid, "deleted_at": {"$exists": False}}, {"_id": 0}
        ).sort("created_at", 1).limit(30).to_list(30)
        history = await db.admin_activity.find(
            {"target_type": "topic", "target_id": tid}, {"_id": 0}
        ).sort("at", -1).limit(15).to_list(15)
        return {"topic": t, "replies": replies, "history": history}

    @router.get("/resources/{rid}")
    async def get_resource_detail(rid: str, user=Depends(_require("resources.view"))):
        r = await db.resources.find_one({"id": rid}, {"_id": 0})
        if not r:
            raise HTTPException(404, "No encontrado")
        return r

    @router.get("/spaces/{sid}")
    async def get_space_detail(sid: str, user=Depends(_require("spaces.view"))):
        s = await db.spaces.find_one({"id": sid}, {"_id": 0})
        if not s:
            raise HTTPException(404, "No encontrado")
        return s

    # ================================================================
    # ROLES CUSTOM + PERMISSION OVERRIDES
    # ================================================================
    class RoleIn(BaseModel):
        key: str
        label: str
        description: Optional[str] = ""
        permissions: List[str] = Field(default_factory=list)

    @router.get("/rbac/roles/all")
    async def list_all_roles(user=Depends(_require())):
        """Devuelve roles system + custom, unificados."""
        system_roles = [
            {**r, "system": True, "permissions_count": len(r["permissions"])}
            for r in ROLE_DEFINITIONS.values()
        ]
        custom = await db.admin_roles.find({"deleted_at": {"$exists": False}}, {"_id": 0}).to_list(100)
        for c in custom:
            c["system"] = False
            c["permissions_count"] = len(c.get("permissions") or [])
        return {"roles": system_roles + custom}

    def _validate_permissions_or_raise(perms_in: List[str], user: Dict[str, Any]) -> List[str]:
        """Valida que todos los perms sean del catálogo Y que el creador los posea.
        Rechaza con error explícito si hay claves desconocidas o excede privilegios."""
        valid = {p["key"] for p in PERMISSIONS}
        unknown = [p for p in perms_in if p not in valid]
        if unknown:
            raise HTTPException(400, f"Permisos desconocidos: {', '.join(unknown[:5])}")
        # Superadmin puede otorgar cualquier permiso; el resto solo los que posee.
        if user.get("admin_role") != "superadmin":
            actor_perms = _user_perms(user)
            excess = [p for p in perms_in if p not in actor_perms]
            if excess:
                raise HTTPException(
                    403,
                    f"No podés otorgar permisos que no tenés: {', '.join(excess[:5])}",
                )
        # Deduplicar preservando orden
        seen = set()
        return [p for p in perms_in if not (p in seen or seen.add(p))]

    @router.post("/rbac/roles")
    async def create_custom_role(body: RoleIn, user=Depends(_require("users.edit_role"))):
        key = body.key.strip().lower().replace(" ", "_")
        if not key:
            raise HTTPException(400, "Clave requerida")
        if key in ROLE_DEFINITIONS:
            raise HTTPException(400, "Ya existe un rol system con esa clave")
        existing = await db.admin_roles.find_one({"key": key})
        if existing:
            raise HTTPException(400, "Ya existe un rol custom con esa clave")
        perms = _validate_permissions_or_raise(body.permissions or [], user)
        doc = {
            "key": key, "label": body.label.strip(), "description": (body.description or "").strip(),
            "permissions": perms, "created_by": user["id"], "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.admin_roles.insert_one(doc)
        await _log(user, "role.created", "role", key, {"permissions": len(perms)})
        doc.pop("_id", None)
        return {**doc, "system": False}

    @router.put("/rbac/roles/{role_key}")
    async def update_custom_role(role_key: str, body: RoleIn, user=Depends(_require("users.edit_role"))):
        if role_key in ROLE_DEFINITIONS:
            raise HTTPException(400, "Los roles system no se pueden editar")
        perms = _validate_permissions_or_raise(body.permissions or [], user)
        r = await db.admin_roles.update_one(
            {"key": role_key},
            {"$set": {
                "label": body.label.strip(),
                "description": (body.description or "").strip(),
                "permissions": perms, "updated_at": _now_iso(),
            }},
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Rol no encontrado")
        # Re-sincronizar usuarios que tienen este rol + bump session_version.
        # El bump invalida sus JWT: reciben los perms nuevos al re-loguearse.
        affected = await db.users.update_many(
            {"admin_role": role_key},
            {"$set": {"admin_permissions": perms}, "$inc": {"session_version": 1}},
        )
        await _log(user, "role.updated", "role", role_key,
                   {"permissions": len(perms), "users_synced": affected.modified_count,
                    "session_revoked": True})
        return {"ok": True, "users_synced": affected.modified_count}

    @router.delete("/rbac/roles/{role_key}")
    async def delete_custom_role(role_key: str, user=Depends(_require("users.edit_role"))):
        if role_key in ROLE_DEFINITIONS:
            raise HTTPException(400, "Los roles system no se pueden eliminar")
        in_use = await db.users.count_documents({"admin_role": role_key})
        if in_use > 0:
            raise HTTPException(400, f"Hay {in_use} usuarios con este rol. Reasigna primero.")
        r = await db.admin_roles.update_one(
            {"key": role_key},
            {"$set": {"deleted_at": _now_iso(), "deleted_by": user["id"]}}
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Rol no encontrado")
        await _log(user, "role.deleted", "role", role_key)
        return {"ok": True}

    class UserPermsOverrideIn(BaseModel):
        # None => remover override y usar permisos del rol
        permissions: Optional[List[str]] = None

    @router.put("/users/{uid}/permissions")
    async def override_user_permissions(uid: str, body: UserPermsOverrideIn,
                                        user=Depends(_require("users.edit_role"))):
        if uid == user["id"]:
            raise HTTPException(400, "No puedes editar tus propios permisos")
        current = await db.users.find_one({"id": uid}, {"session_version": 1, "admin_role": 1})
        if not current:
            raise HTTPException(404, "Usuario no encontrado")
        new_sv = int(current.get("session_version") or 1) + 1
        if body.permissions is None:
            await db.users.update_one(
                {"id": uid},
                {"$unset": {"admin_permissions": ""}, "$set": {"session_version": new_sv}},
            )
            await _log(user, "user.permissions_reset", "user", uid, {"session_revoked": True})
            return {"ok": True, "cleared": True}
        perms = _validate_permissions_or_raise(body.permissions, user)
        await db.users.update_one(
            {"id": uid},
            {"$set": {"admin_permissions": perms, "session_version": new_sv}},
        )
        await _log(user, "user.permissions_overridden", "user", uid,
                   {"count": len(perms), "session_revoked": True})
        return {"ok": True, "count": len(perms)}

    @router.get("/rbac/integrity")
    async def rbac_integrity(user=Depends(_require())):
        """Diagnóstico de integridad de roles: detecta usuarios con roles inexistentes,
        permisos obsoletos o snapshots desincronizados. Sólo lectura."""
        system_roles = set(ROLE_DEFINITIONS.keys())
        custom_roles = set()
        custom_role_perms: Dict[str, List[str]] = {}
        async for r in db.admin_roles.find({"deleted_at": {"$exists": False}},
                                            {"key": 1, "permissions": 1}):
            custom_roles.add(r["key"])
            custom_role_perms[r["key"]] = r.get("permissions") or []
        valid_perms = {p["key"] for p in PERMISSIONS}
        orphans: List[Dict[str, Any]] = []
        stale_snapshots: List[Dict[str, Any]] = []
        obsolete_perm_users: List[Dict[str, Any]] = []
        async for u in db.users.find({"admin_role": {"$exists": True, "$ne": None}},
                                      {"id": 1, "email": 1, "admin_role": 1, "admin_permissions": 1}):
            role = u.get("admin_role")
            if role not in system_roles and role not in custom_roles:
                orphans.append({"id": u["id"], "email": u.get("email"), "role": role})
                continue
            if isinstance(u.get("admin_permissions"), list):
                explicit = list(u["admin_permissions"])
                obsolete = [p for p in explicit if p not in valid_perms]
                if obsolete:
                    obsolete_perm_users.append({
                        "id": u["id"], "email": u.get("email"),
                        "obsolete_count": len(obsolete),
                    })
                # Detectar snapshot desactualizado vs definición del rol custom.
                if role in custom_roles:
                    expected = set(custom_role_perms.get(role, []))
                    if set(explicit) - {p for p in explicit if p not in valid_perms} != expected:
                        stale_snapshots.append({
                            "id": u["id"], "email": u.get("email"), "role": role,
                        })
        return {
            "system_roles": sorted(system_roles),
            "custom_roles": sorted(custom_roles),
            "orphan_users": orphans,
            "users_with_stale_snapshot": stale_snapshots,
            "users_with_obsolete_perms": obsolete_perm_users,
        }

    # ================================================================
    # NOTIFICATIONS
    # ================================================================
    @router.get("/notifications")
    async def list_notifications(
        unread_only: bool = False,
        kind: Optional[str] = None,
        limit: int = 30,
        user=Depends(_require()),
    ):
        # refresca (con cache de 60s)
        await refresh_notifications(db)
        perms = _user_perms(user)
        query: Dict[str, Any] = {
            "required_perm": {"$in": list(perms)},
            "dismissed_by": {"$ne": user["id"]},
        }
        if unread_only:
            query["read_by"] = {"$ne": user["id"]}
        if kind:
            query["kind"] = kind
        items = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(min(limit, 100)).to_list(100)
        # marcar is_read por usuario
        uid = user["id"]
        for n in items:
            n["is_read"] = uid in (n.get("read_by") or [])
        unread_count = await db.notifications.count_documents({
            "required_perm": {"$in": list(perms)},
            "dismissed_by": {"$ne": uid},
            "read_by": {"$ne": uid},
        })
        return {"count": len(items), "unread": unread_count, "items": items}

    @router.get("/notifications/unread-count")
    async def notifications_unread_count(user=Depends(_require())):
        await refresh_notifications(db)
        perms = _user_perms(user)
        uid = user["id"]
        c = await db.notifications.count_documents({
            "required_perm": {"$in": list(perms)},
            "dismissed_by": {"$ne": uid},
            "read_by": {"$ne": uid},
        })
        return {"unread": c}

    @router.post("/notifications/{nid}/read")
    async def mark_notification_read(nid: str, user=Depends(_require())):
        r = await db.notifications.update_one(
            {"id": nid, "required_perm": {"$in": list(_user_perms(user))}},
            {"$addToSet": {"read_by": user["id"]}}
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Notificación no encontrada")
        return {"ok": True}

    @router.post("/notifications/{nid}/dismiss")
    async def dismiss_notification(nid: str, user=Depends(_require())):
        r = await db.notifications.update_one(
            {"id": nid, "required_perm": {"$in": list(_user_perms(user))}},
            {"$addToSet": {"dismissed_by": user["id"]}}
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Notificación no encontrada")
        return {"ok": True}

    @router.post("/notifications/mark-all-read")
    async def mark_all_read(user=Depends(_require())):
        perms = _user_perms(user)
        uid = user["id"]
        r = await db.notifications.update_many(
            {"required_perm": {"$in": list(perms)}, "read_by": {"$ne": uid}, "dismissed_by": {"$ne": uid}},
            {"$addToSet": {"read_by": uid}},
        )
        return {"ok": True, "modified": r.modified_count}

    # ================================================================
    # MOTOR DE DECISIÓN — BIBLIOTECA (RAG)
    # ================================================================
    class KBFileRef(BaseModel):
        model_config = ConfigDict(extra="ignore")
        name: str
        extension: Optional[str] = None
        size_bytes: int = 0
        size_label: Optional[str] = None
        chars: int = 0
        language: Optional[Dict[str, Any]] = None
        storage_path: Optional[str] = None
        uploaded_at: Optional[str] = None

    class KBDocIn(BaseModel):
        model_config = ConfigDict(extra="ignore")
        title: str
        kind: str = "guia"  # guia | caso | reglamento | manual | articulo | plantilla
        category: str = ""
        summary: Optional[str] = ""
        content: str
        source_url: Optional[str] = None
        author: Optional[str] = None
        goal_keys: List[str] = Field(default_factory=list)
        disciplines: List[str] = Field(default_factory=list)
        countries: List[str] = Field(default_factory=list)
        maturity: Optional[str] = None
        is_authoritative: bool = False
        status: str = "draft"  # draft | published | archived
        language: Optional[Dict[str, Any]] = None
        original_files: List[KBFileRef] = Field(default_factory=list)

    async def _reindex_document(doc: Dict[str, Any]):
        """Genera y reemplaza los chunks del documento."""
        doc_id = doc["id"]
        await db.knowledge_chunks.delete_many({"doc_id": doc_id})
        pieces = chunk_text(doc.get("content") or "")
        is_pub = doc.get("status") == "published" and not doc.get("deleted_at")
        chunk_docs = []
        for i, txt in enumerate(pieces):
            chunk_docs.append({
                "id": _new_id(),
                "doc_id": doc_id,
                "position": i,
                "text": txt,
                "token_est": len(txt.split()),
                "goal_keys": doc.get("goal_keys") or [],
                "disciplines": doc.get("disciplines") or [],
                "countries": doc.get("countries") or [],
                "is_authoritative": bool(doc.get("is_authoritative")),
                "is_published": is_pub,
            })
        if chunk_docs:
            await db.knowledge_chunks.insert_many(chunk_docs)
        await db.knowledge_documents.update_one(
            {"id": doc_id},
            {"$set": {"chunks_count": len(chunk_docs)}}
        )
        await kb_bump(db)
        return len(chunk_docs)

    @router.get("/motor/kb/documents")
    async def kb_list(
        q: Optional[str] = None, kind: Optional[str] = None,
        status: Optional[str] = None, goal_key: Optional[str] = None,
        page: int = 1, limit: int = 30,
        user=Depends(_require("engine.kb.view")),
    ):
        query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
        if q:
            rx = {"$regex": re.escape(q), "$options": "i"}
            query["$or"] = [{"title": rx}, {"summary": rx}]
        if kind: query["kind"] = kind
        if status: query["status"] = status
        if goal_key: query["goal_keys"] = goal_key
        lim = max(1, min(limit, 100))
        skip = max(0, (page - 1) * lim)
        total = await db.knowledge_documents.count_documents(query)
        items = await db.knowledge_documents.find(
            query, {"_id": 0, "content": 0}  # ocultar content en lista
        ).sort("updated_at", -1).skip(skip).limit(lim).to_list(lim)
        return {"count": len(items), "total": total, "page": page, "limit": lim,
                "has_more": skip + len(items) < total, "items": items}

    @router.get("/motor/kb/documents/{did}")
    async def kb_get(did: str, user=Depends(_require("engine.kb.view"))):
        doc = await db.knowledge_documents.find_one({"id": did}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Documento no encontrado")
        chunks = await db.knowledge_chunks.find(
            {"doc_id": did}, {"_id": 0}
        ).sort("position", 1).to_list(200)
        return {**doc, "chunks": chunks}

    @router.post("/motor/kb/documents")
    async def kb_create(body: KBDocIn, user=Depends(_require("engine.kb.create"))):
        doc = body.model_dump()
        doc.update({
            "id": _new_id(),
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "created_by": user["id"],
            "usage_count": 0,
        })
        if not _has(user, "engine.kb.authorize"):
            doc["is_authoritative"] = False
        await db.knowledge_documents.insert_one(doc)
        n = await _reindex_document(doc)
        await _log(user, "kb.document_created", "kb_doc", doc["id"],
                   {"title": doc["title"], "chunks": n})
        doc.pop("_id", None)
        return {**doc, "chunks_count": n}

    @router.put("/motor/kb/documents/{did}")
    async def kb_update(did: str, body: KBDocIn, user=Depends(_require("engine.kb.edit"))):
        existing = await db.knowledge_documents.find_one({"id": did}, {"_id": 0})
        if not existing:
            raise HTTPException(404, "No encontrado")
        upd = body.model_dump()
        upd["updated_at"] = _now_iso()
        if not _has(user, "engine.kb.authorize"):
            upd["is_authoritative"] = existing.get("is_authoritative", False)
        await db.knowledge_documents.update_one({"id": did}, {"$set": upd})
        merged = {**existing, **upd, "id": did}
        n = await _reindex_document(merged)
        await _log(user, "kb.document_updated", "kb_doc", did, {"chunks": n})
        return {"ok": True, "chunks_count": n}

    class KBAuthorizeIn(BaseModel):
        is_authoritative: bool

    @router.put("/motor/kb/documents/{did}/authorize")
    async def kb_authorize(did: str, body: KBAuthorizeIn,
                           user=Depends(_require("engine.kb.authorize"))):
        r = await db.knowledge_documents.update_one(
            {"id": did}, {"$set": {"is_authoritative": body.is_authoritative, "updated_at": _now_iso()}}
        )
        if r.matched_count == 0:
            raise HTTPException(404, "No encontrado")
        await db.knowledge_chunks.update_many(
            {"doc_id": did}, {"$set": {"is_authoritative": body.is_authoritative}}
        )
        await kb_bump(db)
        await _log(user, "kb.document_authorized" if body.is_authoritative else "kb.document_unauthorized",
                   "kb_doc", did)
        return {"ok": True}

    @router.delete("/motor/kb/documents/{did}")
    async def kb_delete(did: str, user=Depends(_require("engine.kb.delete"))):
        r = await db.knowledge_documents.update_one(
            {"id": did}, {"$set": {"deleted_at": _now_iso(), "status": "archived"}}
        )
        if r.matched_count == 0:
            raise HTTPException(404, "No encontrado")
        await db.knowledge_chunks.update_many({"doc_id": did}, {"$set": {"is_published": False}})
        await kb_bump(db)
        await _log(user, "kb.document_deleted", "kb_doc", did)
        return {"ok": True}

    class KBSearchIn(BaseModel):
        query: str
        top_k: int = 5
        goal_key: Optional[str] = None
        only_authoritative: bool = False

    @router.post("/motor/kb/search")
    async def kb_search_endpoint(body: KBSearchIn, user=Depends(_require("engine.kb.view"))):
        results = await kb_search(
            db, body.query, top_k=body.top_k,
            goal_key=body.goal_key,
            only_authoritative=body.only_authoritative,
        )
        return {"query": body.query, "results": results}

    @router.get("/motor/kb/stats")
    async def kb_stats(user=Depends(_require("engine.kb.view"))):
        total = await db.knowledge_documents.count_documents({"deleted_at": {"$exists": False}})
        published = await db.knowledge_documents.count_documents({"status": "published", "deleted_at": {"$exists": False}})
        authoritative = await db.knowledge_documents.count_documents({"is_authoritative": True, "deleted_at": {"$exists": False}})
        chunks_total = await db.knowledge_chunks.count_documents({"is_published": True})
        by_goal_pipeline = [
            {"$match": {"deleted_at": {"$exists": False}, "status": "published"}},
            {"$unwind": {"path": "$goal_keys", "preserveNullAndEmptyArrays": True}},
            {"$group": {"_id": "$goal_keys", "count": {"$sum": 1}}},
        ]
        by_goal = {}
        async for r in db.knowledge_documents.aggregate(by_goal_pipeline):
            by_goal[r["_id"] or "sin_objetivo"] = r["count"]
        return {
            "documents_total": total,
            "documents_published": published,
            "documents_authoritative": authoritative,
            "chunks_indexed": chunks_total,
            "by_goal": by_goal,
        }

    # ================================================================
    # MOTOR DE DECISIÓN — REGLAS
    # ================================================================
    async def _rules_for(goal_key: str) -> List[Dict[str, Any]]:
        """Carga las reglas del goal desde BD o cae al default de código."""
        custom = await db.motor_rules.find(
            {"goal_key": goal_key, "deleted_at": {"$exists": False}},
            {"_id": 0}
        ).sort("order", 1).to_list(500)
        if custom:
            return custom
        # Fallback a taxonomy.py
        defaults = _DEFAULT_RULES.get(goal_key, [])
        return [{
            "id": f"default-{goal_key}-{i}",
            "goal_key": goal_key,
            "system": True,
            "cause_title": r.get("cause_title"),
            "cause_detail": r.get("cause_detail"),
            "when": r.get("when", {}),
            "priorities": r.get("priorities", []),
            "order": i,
            "active": True,
        } for i, r in enumerate(defaults)]

    class RuleIn(BaseModel):
        model_config = ConfigDict(extra="ignore")
        goal_key: str
        cause_title: str
        cause_detail: Optional[str] = ""
        when: Dict[str, List[str]]  # {question_id: [keyword1, keyword2, ...]}
        priorities: List[str] = Field(default_factory=list)
        order: int = 0
        active: bool = True

    @router.get("/motor/rules")
    async def rules_list(goal_key: Optional[str] = None,
                         user=Depends(_require("engine.rules.view"))):
        if goal_key:
            rules = await _rules_for(goal_key)
            return {"goal_key": goal_key, "rules": rules}
        # Todas
        out = {}
        for g in GOAL_CATALOG:
            out[g["key"]] = await _rules_for(g["key"])
        return {"rules_by_goal": out, "goals": GOAL_CATALOG}

    @router.post("/motor/rules")
    async def rules_create(body: RuleIn, user=Depends(_require("engine.rules.edit"))):
        # Primer edit: si es la primera regla custom para este goal, migrar system→custom
        existing_count = await db.motor_rules.count_documents(
            {"goal_key": body.goal_key, "deleted_at": {"$exists": False}}
        )
        if existing_count == 0:
            # Copiar reglas system al BD como base
            for i, r in enumerate(_DEFAULT_RULES.get(body.goal_key, [])):
                await db.motor_rules.insert_one({
                    "id": _new_id(),
                    "goal_key": body.goal_key,
                    "cause_title": r["cause_title"],
                    "cause_detail": r["cause_detail"],
                    "when": r["when"],
                    "priorities": r.get("priorities", []),
                    "order": i,
                    "active": True,
                    "created_at": _now_iso(),
                    "created_by": "system_migration",
                })
        doc = body.model_dump()
        doc.update({"id": _new_id(), "created_at": _now_iso(), "created_by": user["id"]})
        await db.motor_rules.insert_one(doc)
        await _log(user, "rule.created", "rule", doc["id"], {"goal_key": body.goal_key})
        doc.pop("_id", None)
        return doc

    @router.put("/motor/rules/{rid}")
    async def rules_update(rid: str, body: RuleIn, user=Depends(_require("engine.rules.edit"))):
        upd = body.model_dump()
        upd["updated_at"] = _now_iso()
        r = await db.motor_rules.update_one({"id": rid}, {"$set": upd})
        if r.matched_count == 0:
            raise HTTPException(404, "Regla no encontrada")
        await _log(user, "rule.updated", "rule", rid)
        return {"ok": True}

    @router.delete("/motor/rules/{rid}")
    async def rules_delete(rid: str, user=Depends(_require("engine.rules.edit"))):
        r = await db.motor_rules.update_one(
            {"id": rid}, {"$set": {"deleted_at": _now_iso()}}
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Regla no encontrada")
        await _log(user, "rule.deleted", "rule", rid)
        return {"ok": True}

    @router.get("/motor/questions/{goal_key}")
    async def get_questions_for_goal(goal_key: str, user=Depends(_require("engine.rules.view"))):
        qs = DIAGNOSTIC_QUESTIONS.get(goal_key, [])
        return {"goal_key": goal_key, "questions": qs}

    # ================================================================
    # MOTOR DE DECISIÓN — SIMULADOR
    # ================================================================
    class SimulateIn(BaseModel):
        model_config = ConfigDict(extra="ignore")
        goal_key: str
        answers: Dict[str, str] = Field(default_factory=dict)
        profile: Dict[str, str] = Field(default_factory=dict)
        include_rag: bool = True
        top_k: int = 5
        run_llm: bool = False  # si True, genera plan completo (más caro)

    @router.post("/motor/simulate")
    async def simulate(body: SimulateIn, user=Depends(_require("engine.simulate"))):
        rules = await _rules_for(body.goal_key)
        # 1) Motor de reglas
        triggered = []
        priorities: List[str] = []
        ans_low = {k: (v or "").lower() for k, v in body.answers.items()}
        for r in rules:
            if not r.get("active", True):
                continue
            when = r.get("when") or {}
            match = True
            for qid, keywords in when.items():
                val = ans_low.get(qid, "")
                if not any(k.lower() in val for k in keywords):
                    match = False
                    break
            if match:
                triggered.append({
                    "rule_id": r.get("id"),
                    "cause_title": r.get("cause_title"),
                    "cause_detail": r.get("cause_detail"),
                    "priorities": r.get("priorities") or [],
                })
                priorities.extend(r.get("priorities") or [])
        # dedup priorities preservando orden
        seen = set()
        priorities = [p for p in priorities if not (p in seen or seen.add(p))]

        # 2) Recuperación RAG
        rag_results: List[Dict[str, Any]] = []
        if body.include_rag:
            query_parts = [v for v in body.answers.values() if v]
            query = " ".join(query_parts)[:2000]
            if query.strip():
                rag_results = await kb_search(
                    db, query, top_k=body.top_k,
                    goal_key=body.goal_key,
                )

        # 3) Plantilla base
        template = PLAN_TEMPLATES.get(body.goal_key, {"tasks": [], "indicators": []})

        # 4) Prompt LLM (solo si se pide)
        goal_title = next((g["title"] for g in GOAL_CATALOG if g["key"] == body.goal_key), body.goal_key)
        profile_lines = [f"- {k}: {v}" for k, v in body.profile.items() if v]
        context_lines = [f"- {k}: {v}" for k, v in body.answers.items() if v]
        causes_lines = [f"- {c['cause_title']}" for c in triggered] or ["- (sin causas)"]
        priorities_lines = [f"- {p}" for p in priorities] or ["- (usar plantilla base)"]
        rag_block = format_context_block(rag_results) if rag_results else ""

        prompt = (
            f"OBJETIVO: {goal_title}\n\n"
            f"PERFIL:\n{chr(10).join(profile_lines) or '- (sin perfil)'}\n\n"
            f"RESPUESTAS:\n{chr(10).join(context_lines) or '- (sin respuestas)'}\n\n"
            f"CAUSAS DETECTADAS:\n{chr(10).join(causes_lines)}\n\n"
            f"PRIORIDADES:\n{chr(10).join(priorities_lines)}\n\n"
            f"{rag_block}"
        )

        response = {
            "goal_key": body.goal_key,
            "goal_title": goal_title,
            "rules_evaluated": len(rules),
            "rules_triggered": triggered,
            "priorities": priorities,
            "rag_results": rag_results,
            "template_preview": template,
            "prompt_preview": prompt,
            "llm_plan": None,
        }

        if body.run_llm:
            # Import lazy para evitar dep circular
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            import os, json as _json
            key = os.environ.get("EMERGENT_LLM_KEY")
            if key:
                try:
                    chat = LlmChat(
                        api_key=key,
                        session_id=f"sim-{_new_id()}",
                        system_message=(
                            "Eres un consultor senior en gestión cultural. Español claro, sin jerga. "
                            "Responde SOLO con JSON válido con claves: situacion_actual, lectura_estrategica, "
                            "recomendaciones (array de 3-5 strings). "
                            "Si hay MATERIAL DE REFERENCIA, cita usando '[Fuente N]'."
                        ),
                    ).with_model("openai", "gpt-5.2")
                    resp = await chat.send_message(UserMessage(text=prompt))
                    text = resp if isinstance(resp, str) else str(resp)
                    m = re.search(r"\{.*\}", text, re.DOTALL)
                    if m:
                        response["llm_plan"] = _json.loads(m.group(0))
                    else:
                        response["llm_plan"] = {"raw": text}
                except Exception as e:
                    response["llm_error"] = str(e)
        await _log(user, "engine.simulate", "engine", body.goal_key,
                   {"triggered": len(triggered), "rag": len(rag_results), "run_llm": body.run_llm})
        return response

    # ================================================================
    # MOTOR DE DECISIÓN — ESTADO (widget del dashboard)
    # ================================================================
    def _engine_motor_perms() -> List[str]:
        return ["engine.kb.view", "engine.rules.view", "engine.simulate"]

    @router.get("/motor/status")
    async def motor_status(user=Depends(_require())):
        """Snapshot rápido del motor: biblioteca, reglas, actividad y alertas."""
        perms = _user_perms(user)
        if not (set(_engine_motor_perms()) & perms):
            raise HTTPException(403, "Permiso requerido: engine.*")

        now = datetime.now(timezone.utc)
        cutoff_7d = (now - timedelta(days=7)).isoformat()

        # --- Biblioteca ---
        docs_total = await db.knowledge_documents.count_documents({"deleted_at": {"$exists": False}})
        docs_published = await db.knowledge_documents.count_documents(
            {"status": "published", "deleted_at": {"$exists": False}}
        )
        docs_draft = await db.knowledge_documents.count_documents(
            {"status": "draft", "deleted_at": {"$exists": False}}
        )
        docs_authoritative = await db.knowledge_documents.count_documents(
            {"is_authoritative": True, "deleted_at": {"$exists": False}}
        )
        chunks_indexed = await db.knowledge_chunks.count_documents({"is_published": True})

        by_goal_pipeline = [
            {"$match": {"deleted_at": {"$exists": False}, "status": "published"}},
            {"$unwind": {"path": "$goal_keys", "preserveNullAndEmptyArrays": True}},
            {"$group": {"_id": "$goal_keys", "count": {"$sum": 1}}},
        ]
        docs_by_goal: Dict[str, int] = {}
        async for r in db.knowledge_documents.aggregate(by_goal_pipeline):
            key = r["_id"] or "sin_objetivo"
            docs_by_goal[key] = r["count"]

        # --- Reglas ---
        rules_by_goal: List[Dict[str, Any]] = []
        rules_custom_total = 0
        rules_system_total = 0
        for g in GOAL_CATALOG:
            custom = await db.motor_rules.count_documents(
                {"goal_key": g["key"], "deleted_at": {"$exists": False}}
            )
            default = len(_DEFAULT_RULES.get(g["key"], []))
            rules_custom_total += custom
            if custom == 0:
                rules_system_total += default
            active_count = custom if custom > 0 else default
            rules_by_goal.append({
                "goal_key": g["key"],
                "goal_title": g["title"],
                "custom": custom,
                "default": default,
                "active": active_count,
                "source": "custom" if custom > 0 else "system",
                "docs_published": docs_by_goal.get(g["key"], 0),
            })
        rules_total = rules_custom_total + rules_system_total

        # --- Actividad (últimos 7 días) ---
        sims_7d = await db.admin_activity.count_documents(
            {"action": "engine.simulate", "at": {"$gte": cutoff_7d}}
        )
        kb_edits_7d = await db.admin_activity.count_documents({
            "action": {"$in": ["kb.document_created", "kb.document_updated",
                               "kb.document_authorized", "kb.document_deleted"]},
            "at": {"$gte": cutoff_7d},
        })
        rule_edits_7d = await db.admin_activity.count_documents({
            "action": {"$in": ["rule.created", "rule.updated", "rule.deleted"]},
            "at": {"$gte": cutoff_7d},
        })
        last_sim_doc = await db.admin_activity.find_one(
            {"action": "engine.simulate"}, {"_id": 0, "at": 1, "actor_name": 1, "meta": 1},
            sort=[("at", -1)],
        )
        last_kb_edit = await db.admin_activity.find_one(
            {"action": {"$in": ["kb.document_created", "kb.document_updated"]}},
            {"_id": 0, "at": 1, "actor_name": 1, "meta": 1},
            sort=[("at", -1)],
        )

        # --- Alertas ---
        alerts: List[Dict[str, str]] = []
        if docs_published == 0:
            alerts.append({
                "level": "critical",
                "message": "No hay documentos publicados en la biblioteca. El motor solo usará reglas + IA sin material curado.",
                "cta_label": "Publicar documento",
                "cta_url": "/admin/motor/biblioteca",
            })
        elif docs_published < 6:
            alerts.append({
                "level": "warning",
                "message": f"Solo {docs_published} documentos publicados. Se recomiendan al menos 6 para respuestas sólidas.",
                "cta_label": "Ampliar biblioteca",
                "cta_url": "/admin/motor/biblioteca",
            })

        if docs_authoritative == 0 and docs_published > 0:
            alerts.append({
                "level": "info",
                "message": "Ningún documento marcado como autoritativo. Prioriza los textos que la IA debe seguir estrictamente.",
                "cta_label": "Revisar biblioteca",
                "cta_url": "/admin/motor/biblioteca",
            })

        # Objetivos sin documentos publicados
        goals_without_docs = [
            g["title"] for g in GOAL_CATALOG
            if docs_by_goal.get(g["key"], 0) == 0
        ]
        if goals_without_docs:
            names = ", ".join(goals_without_docs[:3])
            more = "" if len(goals_without_docs) <= 3 else f" y {len(goals_without_docs) - 3} más"
            alerts.append({
                "level": "warning",
                "message": f"Objetivos sin documentos: {names}{more}.",
                "cta_label": "Añadir contenido",
                "cta_url": "/admin/motor/biblioteca",
            })

        if sims_7d == 0:
            alerts.append({
                "level": "info",
                "message": "El motor no se ha simulado en los últimos 7 días. Valida cambios recientes antes de aplicarlos a usuarios.",
                "cta_label": "Abrir simulador",
                "cta_url": "/admin/motor/simulador",
            })

        # --- Health score (0-100) ---
        score = 0
        # 40 pts biblioteca publicada
        if docs_published >= 12: score += 40
        elif docs_published >= 6: score += 28
        elif docs_published >= 3: score += 18
        elif docs_published >= 1: score += 8
        # 20 pts autoritativos
        if docs_authoritative >= 4: score += 20
        elif docs_authoritative >= 1: score += 10
        # 20 pts cobertura por objetivo
        covered = sum(1 for g in GOAL_CATALOG if docs_by_goal.get(g["key"], 0) >= 1)
        if GOAL_CATALOG:
            score += round((covered / len(GOAL_CATALOG)) * 20)
        # 10 pts reglas activas
        if rules_total >= 12: score += 10
        elif rules_total >= 6: score += 6
        # 10 pts actividad reciente
        if sims_7d >= 3: score += 10
        elif sims_7d >= 1: score += 6

        if score >= 80:
            health_label, health_tone = "Excelente", "success"
        elif score >= 55:
            health_label, health_tone = "Bien", "success"
        elif score >= 30:
            health_label, health_tone = "Mejorable", "warning"
        else:
            health_label, health_tone = "Insuficiente", "danger"

        return {
            "generated_at": _now_iso(),
            "health": {"score": score, "label": health_label, "tone": health_tone},
            "kb": {
                "documents_total": docs_total,
                "documents_published": docs_published,
                "documents_draft": docs_draft,
                "documents_authoritative": docs_authoritative,
                "chunks_indexed": chunks_indexed,
                "docs_by_goal": docs_by_goal,
                "goals_without_docs": goals_without_docs,
                "last_edit": last_kb_edit,
            },
            "rules": {
                "total_active": rules_total,
                "custom": rules_custom_total,
                "system_default": rules_system_total,
                "by_goal": rules_by_goal,
            },
            "activity": {
                "simulations_7d": sims_7d,
                "kb_edits_7d": kb_edits_7d,
                "rule_edits_7d": rule_edits_7d,
                "last_simulation": last_sim_doc,
            },
            "alerts": alerts,
        }

    # ================================================================
    # BIBLIOTECA — Extracción de archivos (PDF/DOCX/TXT/MD)
    # ================================================================
    from kb_extractors import (
        extract_from_bytes as _kb_extract,
        SUPPORTED_EXTS as _KB_SUPPORTED_EXTS,
        MAX_SINGLE_FILE_BYTES as _KB_MAX_SINGLE,
        MAX_TOTAL_BYTES as _KB_MAX_TOTAL,
        humanize_size as _kb_hsize,
        detect_extension as _kb_ext,
        detect_language as _kb_lang,
    )
    from storage import (
        put_bytes as _storage_put,
        get_object as _storage_get,
        build_path as _storage_build_path,
        is_available as _storage_available,
        StorageError as _StorageError,
    )

    @router.post("/motor/kb/extract-files")
    async def kb_extract_files(
        files: List[UploadFile] = File(...),
        user=Depends(_require()),
    ):
        """Recibe hasta 5 archivos y devuelve el texto extraído por cada uno + combinado.
        No persiste nada en base de datos: el admin decide luego si guardarlo como documento.
        """
        # Perm: cualquiera que pueda crear o editar KB
        perms = _user_perms(user)
        if not ({"engine.kb.create", "engine.kb.edit"} & perms):
            raise HTTPException(403, "Permiso requerido: engine.kb.create o engine.kb.edit")

        if not files:
            raise HTTPException(400, "Se requiere al menos un archivo")
        if len(files) > 5:
            raise HTTPException(400, "Máximo 5 archivos por lote")

        results = []
        combined_parts = []
        total_bytes = 0

        for up in files:
            fname = up.filename or "archivo"
            ext = _kb_ext(fname)
            entry = {
                "name": fname,
                "extension": ext,
                "size_bytes": 0,
                "size_label": "0 B",
                "chars": 0,
                "text": "",
                "language": None,
                "storage_path": None,
                "uploaded_at": None,
                "error": None,
            }

            if ext not in _KB_SUPPORTED_EXTS:
                entry["error"] = f"Formato no soportado ({ext or 'sin extensión'}). Usa PDF, DOCX, TXT o MD."
                results.append(entry)
                continue

            try:
                data = await up.read()
            except Exception as e:
                entry["error"] = f"No se pudo leer el archivo: {e}"
                results.append(entry)
                continue

            size = len(data)
            entry["size_bytes"] = size
            entry["size_label"] = _kb_hsize(size)

            if size > _KB_MAX_SINGLE:
                entry["error"] = f"Archivo demasiado grande ({entry['size_label']}). Máximo {_kb_hsize(_KB_MAX_SINGLE)}."
                results.append(entry)
                continue

            total_bytes += size
            if total_bytes > _KB_MAX_TOTAL:
                entry["error"] = f"Se superó el tamaño total del lote ({_kb_hsize(_KB_MAX_TOTAL)})."
                results.append(entry)
                continue

            try:
                text, _ = _kb_extract(fname, data)
            except Exception as e:
                entry["error"] = f"Error al extraer texto: {e}"
                results.append(entry)
                continue

            entry["text"] = text
            entry["chars"] = len(text)

            # Detección de idioma (sobre el texto extraído)
            if text.strip():
                entry["language"] = _kb_lang(text)

            # Persistir el archivo original en object storage
            if _storage_available():
                try:
                    path = _storage_build_path(user["id"], ext)
                    up_res = _storage_put(path, data, ext)
                    entry["storage_path"] = up_res.get("path") or path
                    entry["uploaded_at"] = _now_iso()
                except _StorageError as se:
                    logger.warning("Storage no disponible: %s", se)
                except Exception as se:
                    logger.warning("No se pudo subir %s a storage: %s", fname, se)

            if text.strip():
                combined_parts.append(f"## {fname}\n\n{text}")
            else:
                entry["error"] = "No se encontró texto legible (¿PDF escaneado sin OCR?)."
            results.append(entry)

        combined_text = "\n\n---\n\n".join(combined_parts).strip()
        successful = sum(1 for r in results if not r["error"])
        failed = len(results) - successful
        total_chars = sum(r["chars"] for r in results)

        await _log(user, "kb.files_extracted", "engine", None, {
            "files": len(files), "successful": successful, "failed": failed, "chars": total_chars,
        })

        return {
            "files": results,
            "combined_text": combined_text,
            "storage_enabled": _storage_available(),
            "stats": {
                "total": len(files),
                "successful": successful,
                "failed": failed,
                "total_chars": total_chars,
                "total_bytes": total_bytes,
            },
        }

    @router.get("/motor/kb/files/download")
    async def kb_file_download(path: str, user=Depends(_require())):
        """Proxy de descarga del archivo original persistido en object storage.
        Sólo admins autenticados; verifica que el path exista referenciado en algún documento."""
        # Validar que el path existe en algún documento (evita enumeración)
        ref_doc = await db.knowledge_documents.find_one(
            {"original_files.storage_path": path, "deleted_at": {"$exists": False}},
            {"_id": 0, "original_files": 1},
        )
        if not ref_doc:
            raise HTTPException(404, "Archivo no encontrado")

        # Localizar metadata del archivo (para content-type + filename)
        meta = next((f for f in (ref_doc.get("original_files") or [])
                     if f.get("storage_path") == path), None)
        try:
            data, ctype = _storage_get(path)
        except _StorageError:
            raise HTTPException(503, "Object storage no disponible")
        except Exception as e:
            logger.warning("Fallo al descargar de storage: %s", e)
            raise HTTPException(500, "No se pudo descargar el archivo")

        filename = (meta or {}).get("name") or path.rsplit("/", 1)[-1]
        # Encode para nombres con acentos/espacios
        from urllib.parse import quote
        return Response(
            content=data,
            media_type=ctype,
            headers={
                "Content-Disposition": f'attachment; filename*=UTF-8\'\'{quote(filename)}',
                "X-Original-Name": quote(filename),
            },
        )

    # ================================================================
    # PERFIL DEL ADMIN — cambio de contraseña
    # ================================================================
    class ChangePasswordIn(BaseModel):
        current_password: str
        new_password: str = Field(min_length=12, max_length=200)

    @router.post("/me/change-password")
    async def change_own_password(body: ChangePasswordIn, user=Depends(_require())):
        import bcrypt as _bcrypt
        from security_lib import admin_password_policy, PasswordPolicyError
        full = await db.users.find_one({"id": user["id"]})
        if not full or not full.get("password_hash"):
            raise HTTPException(404, "Usuario no encontrado")
        try:
            ok = _bcrypt.checkpw(body.current_password.encode(), full["password_hash"].encode())
        except Exception:
            ok = False
        if not ok:
            raise HTTPException(400, "La contraseña actual es incorrecta")
        if body.current_password == body.new_password:
            raise HTTPException(400, "La nueva contraseña debe ser distinta de la actual")
        try:
            admin_password_policy(body.new_password, forbid=[body.current_password])
        except PasswordPolicyError as e:
            raise HTTPException(400, str(e))
        new_hash = _bcrypt.hashpw(body.new_password.encode(), _bcrypt.gensalt()).decode()
        # Rotar session_version → invalida cualquier token previo (incluido el actual).
        new_sv = int(full.get("session_version") or 1) + 1
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "password_hash": new_hash,
                "password_changed_at": _now_iso(),
                "session_version": new_sv,
            }},
        )
        # Emitir nuevo JWT para que la sesión actual continúe sin re-login.
        import jwt as _jwt
        import os as _os
        from datetime import datetime as _dt, timezone as _tz, timedelta as _td
        secret = _os.environ.get("JWT_SECRET", "")
        algo = _os.environ.get("JWT_ALGORITHM", "HS256")
        expire = int(_os.environ.get("JWT_EXPIRE_HOURS", "24"))
        new_token = _jwt.encode(
            {
                "sub": user["id"], "sv": new_sv,
                "iat": _dt.now(_tz.utc),
                "exp": _dt.now(_tz.utc) + _td(hours=expire),
            },
            secret, algorithm=algo,
        )
        await _log(user, "admin.password_changed", "user", user["id"],
                   {"session_revoked": True})
        return {"ok": True, "changed_at": _now_iso(), "token": new_token}

    return router
