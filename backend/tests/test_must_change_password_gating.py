"""
Cultora — Gating end-to-end de must_change_password sobre el backend real.

Crea un usuario superadmin de prueba directamente en Mongo con
must_change_password=true, y valida:
- El allowlist: /api/auth/me sí, todo lo demás → 403 password_change_required.
- El endpoint POST /api/auth/change-initial-password (validaciones + happy path).
- Post-cambio: gating levantado, y el endpoint sólo aplica al primer login.
- Login con vieja vs nueva contraseña.

Cleanup: elimina el usuario y logs administrativos que creó (no toca a otros).
"""
import os
import sys
import time
import uuid
import asyncio
import re
from datetime import datetime, timezone

import bcrypt
import pytest
import pytest_asyncio
import requests

# Añadir backend/ al sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from motor.motor_asyncio import AsyncIOMotorClient

# BASE_URL público (idéntico al que ve el usuario en el frontend).
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fallback a variables locales del frontend
    fe_env = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
    if os.path.exists(fe_env):
        for line in open(fe_env):
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break
assert BASE_URL, "REACT_APP_BACKEND_URL no configurado"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TIMESTAMP = int(time.time())
TEST_EMAIL = f"bootstrap-test-{TIMESTAMP}@cultora.io"
TEMP_PASSWORD = "InitialTemp!2026X"        # 12+, mayús, minús, dígito, símbolo
NEW_PASSWORD = "NuevaPassRobusta!99"       # 12+, mayús, minús, dígito, símbolo


@pytest_asyncio.fixture(scope="module")
async def db():
    client = AsyncIOMotorClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest_asyncio.fixture(scope="module")
async def seeded_user(db):
    """Crea el usuario de prueba en Mongo con must_change_password=true."""
    pw_hash = bcrypt.hashpw(TEMP_PASSWORD.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": user_id,
        "email": TEST_EMAIL,
        "name": "Bootstrap Test Superadmin",
        "password_hash": pw_hash,
        "created_at": now,
        "profile": {},
        "admin_role": "superadmin",
        "status": "active",
        "must_change_password": True,
    }
    await db.users.insert_one(doc)
    yield {"id": user_id, "email": TEST_EMAIL}
    # Cleanup
    await db.users.delete_one({"id": user_id})
    await db.admin_activity.delete_many({"actor_id": user_id})


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Estado compartido entre tests (module scope)
_state = {"token": None}


@pytest.mark.asyncio
async def test_01_login_returns_token_and_must_change_flag(seeded_user, session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": TEST_EMAIL, "password": TEMP_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
    assert data["user"]["email"] == TEST_EMAIL
    assert data["user"]["must_change_password"] is True
    assert data["user"]["is_admin"] is True
    _state["token"] = data["token"]


@pytest.mark.asyncio
async def test_02_gate_allows_auth_me(session):
    tok = _state["token"]
    r = session.get(f"{BASE_URL}/api/auth/me",
                    headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == TEST_EMAIL
    assert body["must_change_password"] is True


@pytest.mark.asyncio
async def test_03_gate_blocks_admin_users(session):
    tok = _state["token"]
    r = session.get(f"{BASE_URL}/api/admin/users",
                    headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403, r.text
    detail = r.json().get("detail")
    # detail puede venir como dict (spec del test) o string en algunas versiones
    assert isinstance(detail, dict), f"detail no es dict: {detail!r}"
    assert detail.get("code") == "password_change_required"


@pytest.mark.asyncio
async def test_04_gate_blocks_dashboard_summary(session):
    tok = _state["token"]
    r = session.get(f"{BASE_URL}/api/dashboard/summary",
                    headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403, r.text
    detail = r.json().get("detail")
    assert isinstance(detail, dict)
    assert detail.get("code") == "password_change_required"


@pytest.mark.asyncio
async def test_05_gate_blocks_plans(session):
    tok = _state["token"]
    r = session.get(f"{BASE_URL}/api/plans",
                    headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403, r.text
    detail = r.json().get("detail")
    assert isinstance(detail, dict)
    assert detail.get("code") == "password_change_required"


@pytest.mark.asyncio
async def test_06_change_password_wrong_current(session):
    tok = _state["token"]
    r = session.post(
        f"{BASE_URL}/api/auth/change-initial-password",
        headers={"Authorization": f"Bearer {tok}"},
        json={"current_password": "wrong-temp-pass!!X", "new_password": NEW_PASSWORD},
    )
    assert r.status_code == 400, r.text
    detail = r.json().get("detail")
    assert "temporal" in str(detail).lower() and "incorrecta" in str(detail).lower()


@pytest.mark.asyncio
async def test_07_change_password_same_as_current(session):
    tok = _state["token"]
    r = session.post(
        f"{BASE_URL}/api/auth/change-initial-password",
        headers={"Authorization": f"Bearer {tok}"},
        json={"current_password": TEMP_PASSWORD, "new_password": TEMP_PASSWORD},
    )
    assert r.status_code == 400, r.text
    detail = r.json().get("detail")
    assert "distinta" in str(detail).lower()


@pytest.mark.asyncio
async def test_08_change_password_too_short_returns_422(session):
    tok = _state["token"]
    r = session.post(
        f"{BASE_URL}/api/auth/change-initial-password",
        headers={"Authorization": f"Bearer {tok}"},
        json={"current_password": TEMP_PASSWORD, "new_password": "short"},
    )
    assert r.status_code == 422, r.text


@pytest.mark.asyncio
async def test_09_change_password_no_symbol_returns_400(session):
    tok = _state["token"]
    r = session.post(
        f"{BASE_URL}/api/auth/change-initial-password",
        headers={"Authorization": f"Bearer {tok}"},
        json={"current_password": TEMP_PASSWORD, "new_password": "Password12345"},
    )
    assert r.status_code == 400, r.text
    detail = r.json().get("detail")
    assert "s" in str(detail).lower()  # menciona símbolo
    assert "símbolo" in str(detail).lower() or "simbolo" in str(detail).lower()


@pytest.mark.asyncio
async def test_10_change_password_happy_path(session):
    tok = _state["token"]
    r = session.post(
        f"{BASE_URL}/api/auth/change-initial-password",
        headers={"Authorization": f"Bearer {tok}"},
        json={"current_password": TEMP_PASSWORD, "new_password": NEW_PASSWORD},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is True
    assert "changed_at" in body and isinstance(body["changed_at"], str)
    # La respuesta debe incluir un JWT nuevo tras la rotación de session_version.
    assert "token" in body and isinstance(body["token"], str) and body["token"].count(".") == 2
    _state["token"] = body["token"]   # el token viejo quedó revocado
    # La respuesta NO debe contener ni la contraseña actual ni la nueva ni el hash.
    raw = r.text
    assert TEMP_PASSWORD not in raw
    assert NEW_PASSWORD not in raw
    assert "password_hash" not in raw
    assert "$2b$" not in raw  # bcrypt prefix


@pytest.mark.asyncio
async def test_11_post_change_me_flag_is_false(session):
    tok = _state["token"]
    r = session.get(f"{BASE_URL}/api/auth/me",
                    headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    assert r.json().get("must_change_password") is False


@pytest.mark.asyncio
async def test_12_post_change_admin_users_no_longer_blocked_by_gate(session):
    """Ya no debe ser 403 password_change_required — puede ser 200 o 403 por
    permisos, pero NUNCA con code=password_change_required."""
    tok = _state["token"]
    r = session.get(f"{BASE_URL}/api/admin/users",
                    headers={"Authorization": f"Bearer {tok}"})
    if r.status_code == 403:
        detail = r.json().get("detail")
        code = detail.get("code") if isinstance(detail, dict) else None
        assert code != "password_change_required", (
            f"El gate sigue activo después del cambio: {detail!r}"
        )
    # Casos aceptables: 200 (superadmin) o 403 por permiso distinto
    assert r.status_code in (200, 403), r.text


@pytest.mark.asyncio
async def test_13_change_password_second_time_rejected(session):
    tok = _state["token"]
    r = session.post(
        f"{BASE_URL}/api/auth/change-initial-password",
        headers={"Authorization": f"Bearer {tok}"},
        json={"current_password": NEW_PASSWORD, "new_password": "OtraPassword!2026"},
    )
    assert r.status_code == 400, r.text
    detail = r.json().get("detail")
    assert "primer" in str(detail).lower() or "sólo aplica" in str(detail).lower() or "solo aplica" in str(detail).lower()


@pytest.mark.asyncio
async def test_14_login_with_new_password_ok(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": TEST_EMAIL, "password": NEW_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["must_change_password"] is False
    assert "token" in data


@pytest.mark.asyncio
async def test_15_login_with_old_password_fails(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": TEST_EMAIL, "password": TEMP_PASSWORD})
    assert r.status_code == 401, r.text
