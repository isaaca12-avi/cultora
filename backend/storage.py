"""Emergent Object Storage — thin wrapper para persistir archivos originales de la biblioteca."""
from __future__ import annotations
import logging
import os
import uuid
from typing import Optional, Tuple

import requests

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
APP_NAME = "cultora"

_storage_key: Optional[str] = None
logger = logging.getLogger(__name__)


class StorageError(RuntimeError):
    """Error genérico del object storage."""


def init_storage(force: bool = False) -> Optional[str]:
    """Inicializa la sesión de object storage. Devuelve None si no hay EMERGENT_LLM_KEY."""
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY no está configurada — object storage deshabilitado")
        return None
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30,
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Object storage inicializado")
        return _storage_key
    except Exception as e:
        logger.error(f"No se pudo inicializar object storage: {e}")
        _storage_key = None
        return None


def is_available() -> bool:
    return bool(_storage_key or init_storage())


def _mime_for(ext: str) -> str:
    ext = (ext or "").lower().lstrip(".")
    return {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain",
        "md": "text/markdown",
        "markdown": "text/markdown",
    }.get(ext, "application/octet-stream")


def build_path(user_id: str, ext: str) -> str:
    """Path convention: cultora/kb/{user_id}/{uuid}.{ext}"""
    ext = (ext or "").lower().lstrip(".") or "bin"
    return f"{APP_NAME}/kb/{user_id}/{uuid.uuid4()}.{ext}"


def put_bytes(path: str, data: bytes, extension: str) -> dict:
    """Sube un blob. Devuelve {path, size, etag}."""
    key = init_storage()
    if not key:
        raise StorageError("Object storage no disponible")
    mime = _mime_for(extension)
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": mime},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        # Sesión expiró — refrescar y reintentar 1 vez
        init_storage(force=True)
        key = _storage_key
        if not key:
            raise StorageError("Object storage sesión inválida")
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": mime},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> Tuple[bytes, str]:
    """Descarga un blob. Devuelve (bytes, content_type)."""
    key = init_storage()
    if not key:
        raise StorageError("Object storage no disponible")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=120,
    )
    if resp.status_code == 403:
        init_storage(force=True)
        key = _storage_key
        if not key:
            raise StorageError("Object storage sesión inválida")
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=120,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
