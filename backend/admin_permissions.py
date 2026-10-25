"""
Cultora — Sistema de permisos (RBAC) para Panel Administrativo.

Diseño:
- Cada acción es un permiso granular independiente (recurso.accion).
- Los roles son SOLO agrupaciones de permisos, nunca lógica hardcoded.
- Es posible crear roles nuevos sin tocar código, agregándolos al catálogo o vía config.
- La UI decide qué mostrar según los permisos del usuario, no según el nombre del rol.
"""
from typing import Dict, List, Set


# --------------------------------------------------------------------
# Catálogo de permisos (fuente única de verdad)
# --------------------------------------------------------------------
PERMISSIONS: List[Dict[str, str]] = [
    # Usuarios
    {"key": "users.view", "module": "users", "label": "Ver usuarios"},
    {"key": "users.edit_role", "module": "users", "label": "Cambiar rol de usuario"},
    {"key": "users.suspend", "module": "users", "label": "Suspender usuario"},
    {"key": "users.reactivate", "module": "users", "label": "Reactivar usuario"},
    {"key": "users.block", "module": "users", "label": "Bloquear usuario"},

    # Agentes (directorio público)
    {"key": "agents.view", "module": "agents", "label": "Ver agentes"},
    {"key": "agents.edit", "module": "agents", "label": "Editar agente"},
    {"key": "agents.approve", "module": "agents", "label": "Aprobar agente"},
    {"key": "agents.request_correction", "module": "agents", "label": "Solicitar corrección"},
    {"key": "agents.suspend", "module": "agents", "label": "Suspender agente"},
    {"key": "agents.hide", "module": "agents", "label": "Ocultar agente"},
    {"key": "agents.verify", "module": "agents", "label": "Verificar agente"},
    {"key": "agents.handle_reports", "module": "agents", "label": "Gestionar reportes"},

    # Foro
    {"key": "forum.view", "module": "forum", "label": "Ver foro"},
    {"key": "forum.edit", "module": "forum", "label": "Editar publicaciones"},
    {"key": "forum.close", "module": "forum", "label": "Cerrar discusiones"},
    {"key": "forum.delete", "module": "forum", "label": "Eliminar spam"},
    {"key": "forum.handle_reports", "module": "forum", "label": "Revisar reportes"},
    {"key": "forum.suspend_participation", "module": "forum", "label": "Suspender participación"},
    {"key": "forum.pin", "module": "forum", "label": "Fijar publicaciones"},
    {"key": "forum.moderation_history", "module": "forum", "label": "Ver historial de moderación"},

    # Convocatorias
    {"key": "convocatorias.view", "module": "convocatorias", "label": "Ver convocatorias"},
    {"key": "convocatorias.create", "module": "convocatorias", "label": "Crear convocatoria"},
    {"key": "convocatorias.edit", "module": "convocatorias", "label": "Editar convocatoria"},
    {"key": "convocatorias.duplicate", "module": "convocatorias", "label": "Duplicar"},
    {"key": "convocatorias.publish", "module": "convocatorias", "label": "Publicar"},
    {"key": "convocatorias.close", "module": "convocatorias", "label": "Cerrar"},
    {"key": "convocatorias.archive", "module": "convocatorias", "label": "Archivar"},
    {"key": "convocatorias.schedule", "module": "convocatorias", "label": "Programar publicación"},

    # Recursos (biblioteca / documentos)
    {"key": "resources.view", "module": "resources", "label": "Ver recursos"},
    {"key": "resources.create", "module": "resources", "label": "Crear recurso"},
    {"key": "resources.edit", "module": "resources", "label": "Editar recurso"},
    {"key": "resources.delete", "module": "resources", "label": "Eliminar recurso"},

    # Espacios culturales
    {"key": "spaces.view", "module": "spaces", "label": "Ver espacios"},
    {"key": "spaces.create", "module": "spaces", "label": "Crear espacio"},
    {"key": "spaces.edit", "module": "spaces", "label": "Editar espacio"},
    {"key": "spaces.delete", "module": "spaces", "label": "Eliminar espacio"},

    # Analíticas
    {"key": "analytics.view", "module": "analytics", "label": "Ver analíticas"},

    # Configuración
    {"key": "config.view", "module": "config", "label": "Ver configuración"},
    {"key": "config.edit", "module": "config", "label": "Editar configuración"},

    # Actividad / bitácora
    {"key": "activity.view", "module": "activity", "label": "Ver bitácora"},

    # Motor de decisión / Biblioteca (RAG)
    {"key": "engine.kb.view", "module": "motor", "label": "Ver biblioteca del motor"},
    {"key": "engine.kb.create", "module": "motor", "label": "Agregar documento a la biblioteca"},
    {"key": "engine.kb.edit", "module": "motor", "label": "Editar documentos"},
    {"key": "engine.kb.delete", "module": "motor", "label": "Eliminar documentos"},
    {"key": "engine.kb.authorize", "module": "motor", "label": "Marcar como autoritativo"},
    {"key": "engine.rules.view", "module": "motor", "label": "Ver reglas del motor"},
    {"key": "engine.rules.edit", "module": "motor", "label": "Editar reglas del motor"},
    {"key": "engine.simulate", "module": "motor", "label": "Simular diagnósticos"},
]

ALL_PERMISSION_KEYS: Set[str] = {p["key"] for p in PERMISSIONS}


# --------------------------------------------------------------------
# Roles predefinidos (agrupaciones editables)
# --------------------------------------------------------------------
def _all() -> List[str]:
    return list(ALL_PERMISSION_KEYS)


ROLE_DEFINITIONS: Dict[str, Dict] = {
    "superadmin": {
        "key": "superadmin",
        "label": "Superadmin",
        "description": "Acceso total y gestión de roles.",
        "system": True,
        "permissions": _all(),
    },
    "admin": {
        "key": "admin",
        "label": "Admin",
        "description": "Administración operativa completa (excepto gestión de roles).",
        "system": True,
        "permissions": [p for p in _all() if p not in {"users.edit_role", "users.block"}],
    },
    "moderator": {
        "key": "moderator",
        "label": "Moderador",
        "description": "Modera foro y agentes; suspende usuarios y contenido.",
        "system": True,
        "permissions": [
            "users.view", "users.suspend", "users.reactivate",
            "agents.view", "agents.request_correction", "agents.suspend", "agents.hide", "agents.handle_reports",
            "forum.view", "forum.edit", "forum.close", "forum.delete", "forum.handle_reports",
            "forum.suspend_participation", "forum.pin", "forum.moderation_history",
            "activity.view",
        ],
    },
    "content_editor": {
        "key": "content_editor",
        "label": "Editor de Contenido",
        "description": "Edita convocatorias, recursos, espacios y biblioteca del motor.",
        "system": True,
        "permissions": [
            "convocatorias.view", "convocatorias.create", "convocatorias.edit",
            "convocatorias.duplicate", "convocatorias.publish", "convocatorias.close",
            "convocatorias.archive", "convocatorias.schedule",
            "resources.view", "resources.create", "resources.edit", "resources.delete",
            "spaces.view", "spaces.create", "spaces.edit", "spaces.delete",
            "engine.kb.view", "engine.kb.create", "engine.kb.edit", "engine.kb.delete",
            "engine.simulate",
            "activity.view",
        ],
    },
}


def permissions_for_role(role_key: str) -> Set[str]:
    role = ROLE_DEFINITIONS.get(role_key)
    if not role:
        return set()
    return set(role["permissions"])


def get_role_info(role_key: str) -> Dict:
    return ROLE_DEFINITIONS.get(role_key) or {}
