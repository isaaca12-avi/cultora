"""
Cultora — Semillas seguras del panel administrativo.

Este módulo NO gestiona la creación del primer superadministrador.
La creación del superadmin inicial está aislada en `admin_bootstrap.py` y
controlada por variables de entorno explícitas (no hay credenciales en código).

Responsabilidades restantes:
- Sembrar datos de ejemplo (espacios, recursos, convocatorias) sólo si las
  colecciones están vacías.
- Crear la config global si no existe.
- Crear índices Mongo idempotentes.
- Refrescar notificaciones y semilla de la biblioteca del motor si vacías.

NADA de este módulo modifica cuentas de usuario existentes, roles, permisos,
estados ni contraseñas.
"""
from datetime import datetime, timezone
from typing import Any, Dict

from convocatorias_seed import CONVOCATORIAS_SEED


SEED_SPACES = [
    {
        "name": "Casa Cultural La Esquina",
        "summary": "Espacio autogestionado de música y artes escénicas.",
        "description": "Sala de conciertos y taller de ensayo abierto a residentes del barrio.",
        "address": "Av. Independencia 1123",
        "city": "Buenos Aires",
        "country": "Argentina",
        "capacity": 120,
        "equipment": ["Sonido PA", "Piano vertical", "Iluminación básica"],
        "contact_email": "contacto@laesquina.org",
        "contact_phone": "+54 11 4444 5555",
        "website": "https://laesquina.org",
        "status": "active",
    },
    {
        "name": "Galería Norte",
        "summary": "Galería de artes visuales con residencias.",
        "description": "Programa de residencias trimestrales y muestras curadas.",
        "address": "Calle 7 #45-30",
        "city": "Bogotá",
        "country": "Colombia",
        "capacity": 60,
        "equipment": ["Iluminación museográfica", "Sistema de colgado"],
        "contact_email": "info@galerianorte.co",
        "contact_phone": "+57 1 555 1122",
        "website": None,
        "status": "active",
    },
    {
        "name": "Estudio Sur",
        "summary": "Estudio de grabación y ensayo compartido.",
        "description": "Sala live + control room. Sistema de reservas por horas.",
        "address": "Cerrada del Sauce 22",
        "city": "Ciudad de México",
        "country": "México",
        "capacity": 15,
        "equipment": ["Consola SSL", "Batería Ludwig", "Cabinas"],
        "contact_email": "hola@estudiosur.mx",
        "contact_phone": None,
        "website": "https://estudiosur.mx",
        "status": "draft",
    },
]


SEED_RESOURCES = [
    {
        "title": "Plantilla de presupuesto para proyecto cultural",
        "kind": "plantilla",
        "category": "presupuestos",
        "summary": "Hoja de cálculo con partidas típicas y notas metodológicas.",
        "body": "Descargable en formato de hoja de cálculo con partidas de producción, difusión, honorarios, gastos generales y contingencia.",
        "url": None,
        "tags": ["presupuesto", "financiamiento", "gestion"],
        "status": "published",
    },
    {
        "title": "Guía: cómo formular tu primera convocatoria",
        "kind": "guia",
        "category": "formulacion",
        "summary": "Estructura, tono y evidencias que suele pedir un jurado.",
        "body": "Contenido introductorio con checklist final y ejemplos comentados.",
        "url": None,
        "tags": ["formulacion", "convocatorias"],
        "status": "published",
    },
]


DEFAULT_CONFIG = {
    "id": "global",
    "disciplines": ["Música", "Artes escénicas", "Artes visuales", "Literatura", "Audiovisual", "Gestión", "Multidisciplinar"],
    "categories": ["gestion", "financiamiento", "publicos", "sostenibilidad", "formulacion", "marketing", "legal", "presupuestos", "indicadores", "casos"],
    "countries": ["Argentina", "México", "Colombia", "Chile", "Perú", "España", "Uruguay"],
    "cities": ["Buenos Aires", "Ciudad de México", "Bogotá", "Santiago", "Lima", "Madrid", "Barcelona", "Montevideo"],
    "tags": ["arte", "cultura", "comunidad", "juventud", "residencias", "circo", "danza", "artesanía"],
    "states": ["active", "draft", "closed"],
    "conv_types": ["Beca", "Premio", "Residencia", "Fondo", "Convocatoria abierta"],
    "conv_areas": ["Música", "Artes escénicas", "Visuales", "Literatura", "Audiovisual", "Patrimonio", "Multidisciplinar"],
    "conv_modalidades": ["Presencial", "Virtual", "Híbrida"],
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def run_admin_seed(db):
    """
    Idempotent bootstrapping of non-account data:
      - collections seeded only when empty
      - indexes created via idempotent try/except
      - NO modificación de cuentas de usuario, roles, permisos o estados.
    """
    # 1. Sembrar espacios si está vacío
    if await db.spaces.count_documents({}) == 0:
        import uuid
        for s in SEED_SPACES:
            await db.spaces.insert_one({
                **s,
                "id": str(uuid.uuid4()),
                "created_at": _now(),
                "updated_at": _now(),
                "created_by": None,
            })

    # 2. Sembrar recursos si está vacío
    if await db.resources.count_documents({}) == 0:
        import uuid
        for r in SEED_RESOURCES:
            await db.resources.insert_one({
                **r,
                "id": str(uuid.uuid4()),
                "created_at": _now(),
                "updated_at": _now(),
                "created_by": None,
            })

    # 3. Sembrar convocatorias desde seed si está vacío
    if await db.convocatorias.count_documents({}) == 0:
        for c in CONVOCATORIAS_SEED:
            doc = dict(c)
            doc.setdefault("created_at", _now())
            doc.setdefault("updated_at", _now())
            await db.convocatorias.insert_one(doc)

    # 4. Config global
    existing = await db.admin_config.find_one({"id": "global"})
    if not existing:
        await db.admin_config.insert_one({**DEFAULT_CONFIG, "updated_at": _now()})

    # 5. Índices Mongo (idempotentes)
    try:
        await db.users.create_index("id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("admin_role")
        await db.users.create_index("status")
        await db.users.create_index("public_agent.published")
        await db.users.create_index("public_agent.status")
        await db.sessions.create_index("user_id")
        await db.sessions.create_index("updated_at")
        await db.plans.create_index("user_id")
        await db.plans.create_index([("user_id", 1), ("created_at", -1)])
        await db.forum_topics.create_index("category")
        await db.forum_topics.create_index([("updated_at", -1)])
        await db.forum_topics.create_index([("created_at", -1)])
        await db.forum_topics.create_index("author_id")
        await db.forum_replies.create_index("topic_id")
        await db.forum_reports.create_index("status")
        await db.convocatorias.create_index("id", unique=True)
        await db.convocatorias.create_index("status")
        await db.convocatorias.create_index([("updated_at", -1)])
        await db.convocatorias.create_index("close_date")
        await db.resources.create_index([("updated_at", -1)])
        await db.spaces.create_index([("updated_at", -1)])
        await db.admin_activity.create_index([("at", -1)])
        await db.admin_activity.create_index("actor_id")
        await db.admin_activity.create_index("target_type")
        await db.admin_roles.create_index("key", unique=True)
        await db.notifications.create_index("created_at")
        await db.notifications.create_index("required_perm")
        await db.notifications.create_index([("kind", 1), ("target_type", 1), ("target_id", 1)])
        await db.knowledge_documents.create_index("id", unique=True)
        await db.knowledge_documents.create_index("status")
        await db.knowledge_documents.create_index("goal_keys")
        await db.knowledge_documents.create_index([("updated_at", -1)])
        await db.knowledge_chunks.create_index("doc_id")
        await db.knowledge_chunks.create_index("is_published")
        await db.motor_rules.create_index([("goal_key", 1), ("order", 1)])
    except Exception:
        # No romper el startup si los índices ya existen con otra config
        pass

    # 6. Refresh inicial de notificaciones
    try:
        from notifications import refresh_notifications
        await refresh_notifications(db, force=True)
    except Exception:
        pass

    # 7. Semilla inicial de la biblioteca del motor (RAG) solo si vacía
    try:
        if await db.knowledge_documents.count_documents({}) == 0:
            from taxonomy import KNOWLEDGE_SEED
            from rag import chunk_text, bump_version as _bump
            import uuid as _uuid
            for k in KNOWLEDGE_SEED:
                doc_id = str(_uuid.uuid4())
                goal_map = {
                    "sostenibilidad": ["sostenibilidad"],
                    "formulacion": ["financiamiento"],
                    "financiamiento": ["financiamiento"],
                    "publicos": ["publicos"],
                    "gestion": ["organizacion_interna", "sostenibilidad"],
                    "presupuestos": ["financiamiento", "sostenibilidad"],
                    "indicadores": ["organizacion_interna", "sostenibilidad"],
                    "legal": ["organizacion_interna", "espacio_cultural"],
                    "casos": ["sostenibilidad", "financiamiento"],
                }
                goal_keys = goal_map.get(k.get("category"), [])
                doc = {
                    "id": doc_id,
                    "title": k["title"],
                    "kind": "guia",
                    "category": k.get("category", ""),
                    "summary": k.get("summary", ""),
                    "content": k.get("content", ""),
                    "source_url": None,
                    "author": "Equipo Cultora",
                    "goal_keys": goal_keys,
                    "disciplines": [],
                    "countries": [],
                    "maturity": None,
                    "is_authoritative": True,
                    "status": "published",
                    "created_at": _now(),
                    "updated_at": _now(),
                    "created_by": None,
                    "usage_count": 0,
                }
                await db.knowledge_documents.insert_one(doc)
                pieces = chunk_text(doc["content"])
                chunk_docs = []
                for i, txt in enumerate(pieces):
                    chunk_docs.append({
                        "id": str(_uuid.uuid4()),
                        "doc_id": doc_id,
                        "position": i,
                        "text": txt,
                        "token_est": len(txt.split()),
                        "goal_keys": goal_keys,
                        "disciplines": [],
                        "countries": [],
                        "is_authoritative": True,
                        "is_published": True,
                    })
                if chunk_docs:
                    await db.knowledge_chunks.insert_many(chunk_docs)
                await db.knowledge_documents.update_one(
                    {"id": doc_id}, {"$set": {"chunks_count": len(chunk_docs)}}
                )
            await _bump(db)
    except Exception as e:
        print(f"[admin_seed] KB seed failed: {e}")
