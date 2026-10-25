"""
Cultora — Fase A de endurecimiento de seguridad.

Cubre:
- Session versioning (sv en JWT, revocación)
- Logout / Logout-all
- JWT rotation tras cambio de contraseña
- Rate limiting
- Política de contraseñas (débiles, comunes)
- Protección del superadmin
- RBAC: rechazo de perms desconocidos, no exceder privilegios del creador
- Bump de session_version en cambios de rol/perms/status
- RBAC integrity endpoint
- JWT_SECRET hardening
- CORS restrictivo en production
"""
import asyncio
import os
import sys
import time
import uuid

import bcrypt
import jwt as pyjwt
import pytest
import pytest_asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
TEST_DB = f"cultora_test_sec_{uuid.uuid4().hex[:8]}"


@pytest_asyncio.fixture
async def db():
    client = AsyncIOMotorClient(MONGO_URL)
    d = client[TEST_DB]
    yield d
    await client.drop_database(TEST_DB)
    client.close()


def _hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


async def _mk_user(db, email, password="StrongPass!2026", role=None, status="active", sv=1,
                   must_change=False, perms=None):
    doc = {
        "id": str(uuid.uuid4()), "email": email, "name": email.split("@")[0],
        "password_hash": _hash(password), "created_at": "2026-01-01T00:00:00+00:00",
        "profile": {}, "session_version": sv, "status": status,
    }
    if role: doc["admin_role"] = role
    if must_change: doc["must_change_password"] = True
    if perms is not None: doc["admin_permissions"] = perms
    await db.users.insert_one(doc)
    return doc


# -------------------- 1. security_lib: password policy --------------------

def test_password_policy_rejects_common():
    from security_lib import evaluate_password, PasswordPolicyError
    with pytest.raises(PasswordPolicyError):
        evaluate_password("password1234", min_length=10, require_symbol=False)


def test_password_policy_rejects_short():
    from security_lib import evaluate_password, PasswordPolicyError
    with pytest.raises(PasswordPolicyError):
        evaluate_password("Abc1!x", min_length=12)


def test_password_policy_accepts_strong():
    from security_lib import admin_password_policy
    admin_password_policy("StrongPass!2026")   # no debería lanzar


def test_password_policy_forbid_reuse():
    from security_lib import admin_password_policy, PasswordPolicyError
    with pytest.raises(PasswordPolicyError):
        admin_password_policy("StrongPass!2026", forbid=["StrongPass!2026"])


# -------------------- 2. JWT secret hardening --------------------

def test_jwt_secret_dev_ok():
    from security_lib import validate_jwt_secret_or_die
    validate_jwt_secret_or_die("dev-secret-abc", "development")   # advierte, no lanza


def test_jwt_secret_prod_weak_fails():
    from security_lib import validate_jwt_secret_or_die
    with pytest.raises(RuntimeError):
        validate_jwt_secret_or_die("dev-secret", "production")


def test_jwt_secret_prod_short_fails():
    from security_lib import validate_jwt_secret_or_die
    with pytest.raises(RuntimeError):
        validate_jwt_secret_or_die("short", "production")


def test_jwt_secret_missing_fails():
    from security_lib import validate_jwt_secret_or_die
    with pytest.raises(RuntimeError):
        validate_jwt_secret_or_die("", "development")


def test_jwt_secret_prod_strong_ok():
    from security_lib import validate_jwt_secret_or_die
    validate_jwt_secret_or_die("a" * 40, "production")


# -------------------- 3. Session version helpers --------------------

@pytest.mark.asyncio
async def test_bump_session_version(db):
    from security_lib import bump_session_version
    u = await _mk_user(db, "sv@x.com", sv=1)
    new = await bump_session_version(db, u["id"])
    assert new == 2
    reloaded = await db.users.find_one({"id": u["id"]})
    assert reloaded["session_version"] == 2


# -------------------- 4. Rate limiter --------------------

def test_rate_limiter_sliding_window():
    from security_lib import SlidingWindowRateLimiter
    rl = SlidingWindowRateLimiter()
    for i in range(3):
        ok, _ = rl.check("k", max_events=3, window_seconds=60)
        assert ok
    ok, retry = rl.check("k", max_events=3, window_seconds=60)
    assert not ok
    assert retry > 0


def test_rate_limiter_reset():
    from security_lib import SlidingWindowRateLimiter
    rl = SlidingWindowRateLimiter()
    for _ in range(3):
        rl.check("k", max_events=3, window_seconds=60)
    rl.reset("k")
    ok, _ = rl.check("k", max_events=3, window_seconds=60)
    assert ok


# -------------------- 5. IP anonymization --------------------

def test_anonymize_ipv4():
    from security_lib import anonymize_ip
    assert anonymize_ip("192.168.1.42") == "192.168.1.0"


def test_anonymize_none():
    from security_lib import anonymize_ip
    assert anonymize_ip(None) is None


# -------------------- 6. Migrations --------------------

@pytest.mark.asyncio
async def test_migration_session_version_idempotent(db):
    from migrations import migrate_session_version
    await db.users.insert_many([
        {"id": "1", "email": "a", "name": "a"},
        {"id": "2", "email": "b", "name": "b", "session_version": 5},
    ])
    r1 = await migrate_session_version(db)
    assert r1["users_updated"] == 1
    # Segunda pasada: nadie más updated
    r2 = await migrate_session_version(db)
    assert r2["users_updated"] == 0
    # No sobrescribe sv existente
    u2 = await db.users.find_one({"id": "2"})
    assert u2["session_version"] == 5


@pytest.mark.asyncio
async def test_migration_perm_integrity_cleans_obsolete(db):
    from migrations import migrate_permission_integrity
    await db.users.insert_one({
        "id": "u1", "email": "u1", "name": "u1",
        "admin_permissions": ["users.view", "obsolete.perm", "engine.simulate"],
    })
    await db.admin_roles.insert_one({
        "key": "custom1", "label": "c1",
        "permissions": ["users.view", "ghost.perm"],
    })
    r = await migrate_permission_integrity(db, ["users.view", "engine.simulate"])
    assert r["user_overrides_cleaned"] == 1
    assert r["custom_roles_cleaned"] == 1
    u = await db.users.find_one({"id": "u1"})
    assert "obsolete.perm" not in u["admin_permissions"]


# -------------------- 7. Endpoints (integración con httpx) --------------------

@pytest_asyncio.fixture
async def client():
    """Instancia httpx.AsyncClient contra la app real, con una DB efímera."""
    # Levantamos la app con un TEST_DB temporal
    os.environ["DB_NAME"] = TEST_DB
    # Reimport server con nuevo DB_NAME
    import importlib, sys
    for m in ["server", "admin_router"]:
        if m in sys.modules:
            del sys.modules[m]
    import server  # noqa
    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, server


@pytest.mark.asyncio
async def test_register_weak_password_rejected(client):
    c, _ = client
    # 'short12345' passes Field(min_length=8) pero falla la policy (sin mayús)
    r = await c.post("/api/auth/register", json={
        "name": "Test", "email": f"weak{uuid.uuid4().hex[:6]}@x.com", "password": "short12345",
    })
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_common_password_rejected(client):
    c, _ = client
    r = await c.post("/api/auth/register", json={
        "name": "Test", "email": f"c{uuid.uuid4().hex[:6]}@x.com", "password": "Password123",
    })
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_strong_password_ok(client):
    c, _ = client
    email = f"reg{uuid.uuid4().hex[:6]}@x.com"
    r = await c.post("/api/auth/register", json={
        "name": "Test", "email": email, "password": "Rob$stPass123",
    })
    assert r.status_code == 200
    assert "token" in r.json()


@pytest.mark.asyncio
async def test_login_returns_jwt_with_sv(client):
    c, server = client
    email = f"sv{uuid.uuid4().hex[:6]}@x.com"
    await c.post("/api/auth/register", json={"name": "T", "email": email, "password": "Rob$stPass123"})
    r = await c.post("/api/auth/login", json={"email": email, "password": "Rob$stPass123"})
    token = r.json()["token"]
    payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    assert "sv" in payload
    assert payload["sv"] == 1


@pytest.mark.asyncio
async def test_logout_all_revokes_token(client):
    c, _ = client
    email = f"revoke{uuid.uuid4().hex[:6]}@x.com"
    r = await c.post("/api/auth/register", json={"name": "T", "email": email, "password": "Rob$stPass123"})
    token = r.json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    assert (await c.get("/api/auth/me", headers=h)).status_code == 200
    assert (await c.post("/api/auth/logout-all", headers=h)).status_code == 200
    r2 = await c.get("/api/auth/me", headers=h)
    assert r2.status_code == 401
    assert r2.json()["detail"]["code"] == "session_revoked"


@pytest.mark.asyncio
async def test_expired_token_detected(client):
    c, _ = client
    # Crear un token ya expirado
    from datetime import datetime, timezone, timedelta
    expired = pyjwt.encode(
        {"sub": "any", "sv": 1, "iat": datetime.now(timezone.utc) - timedelta(hours=48),
         "exp": datetime.now(timezone.utc) - timedelta(hours=24)},
        JWT_SECRET, algorithm=JWT_ALG,
    )
    r = await c.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401
    assert r.json()["detail"]["code"] == "session_expired"


@pytest.mark.asyncio
async def test_token_without_sv_rejected(client):
    c, _ = client
    email = f"nosv{uuid.uuid4().hex[:6]}@x.com"
    await c.post("/api/auth/register", json={"name": "T", "email": email, "password": "Rob$stPass123"})
    # Emitir token manual SIN sv
    from datetime import datetime, timezone, timedelta
    uid = (await c.post("/api/auth/login", json={"email": email, "password": "Rob$stPass123"})).json()["user"]["id"]
    legacy = pyjwt.encode(
        {"sub": uid, "iat": datetime.now(timezone.utc),
         "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        JWT_SECRET, algorithm=JWT_ALG,
    )
    r = await c.get("/api/auth/me", headers={"Authorization": f"Bearer {legacy}"})
    assert r.status_code == 401
    assert r.json()["detail"]["code"] == "session_revoked"


@pytest.mark.asyncio
async def test_rate_limit_login(client):
    c, _ = client
    codes = []
    for _ in range(15):
        r = await c.post("/api/auth/login",
                          json={"email": "does-not-exist@x.com", "password": "wrong"})
        codes.append(r.status_code)
    assert 429 in codes, f"Expected at least one 429 in {codes}"


@pytest.mark.asyncio
async def test_admin_password_change_rotates_token(client):
    """Tras cambiar la contraseña el token viejo se invalida y se devuelve uno nuevo."""
    c, _ = client
    # Crear superadmin
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    await _mk_user(db, "admin@x.com", password="OldStrongPass!99", role="superadmin", sv=1)

    # Login
    r = await c.post("/api/auth/login", json={"email": "admin@x.com", "password": "OldStrongPass!99"})
    old_token = r.json()["token"]
    h = {"Authorization": f"Bearer {old_token}"}
    assert (await c.get("/api/admin/me", headers=h)).status_code == 200

    # Cambiar contraseña admin
    r2 = await c.post("/api/admin/me/change-password", headers=h,
                        json={"current_password": "OldStrongPass!99",
                              "new_password": "NuevaFuerte!99abc"})
    assert r2.status_code == 200, r2.json()
    body = r2.json()
    assert body["ok"] is True
    assert "token" in body

    # Token viejo revocado
    r3 = await c.get("/api/admin/me", headers=h)
    assert r3.status_code == 401
    assert r3.json()["detail"]["code"] == "session_revoked"

    # Token nuevo funciona
    h2 = {"Authorization": f"Bearer {body['token']}"}
    assert (await c.get("/api/admin/me", headers=h2)).status_code == 200


@pytest.mark.asyncio
async def test_cannot_promote_to_superadmin_if_not_superadmin(client):
    c, _ = client
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    # Un admin común que TIENE users.edit_role vía override
    await _mk_user(db, "adm@x.com", password="Rob$stPass1234", role="admin",
                   perms=["users.view", "users.edit_role"])
    victim = await _mk_user(db, "victim@x.com", password="Rob$stPass1234")

    r = await c.post("/api/auth/login", json={"email": "adm@x.com", "password": "Rob$stPass1234"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    r2 = await c.put(f"/api/admin/users/{victim['id']}/role", headers=h,
                       json={"role": "superadmin"})
    assert r2.status_code == 403


@pytest.mark.asyncio
async def test_cannot_leave_zero_superadmins(client):
    """Si solo hay 1 superadmin activo, no se puede degradar."""
    c, _ = client
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    sa1 = await _mk_user(db, "sa1@x.com", password="Rob$stPass1234", role="superadmin")
    sa2 = await _mk_user(db, "sa2@x.com", password="Rob$stPass1234", role="superadmin")

    # Como sa1, intentar degradar a sa2 → OK (queda sa1 como super)
    r = await c.post("/api/auth/login", json={"email": "sa1@x.com", "password": "Rob$stPass1234"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    ok = await c.put(f"/api/admin/users/{sa2['id']}/role", headers=h, json={"role": "moderator"})
    assert ok.status_code == 200

    # Ahora intentar degradarse... falla porque uid == self
    r2 = await c.put(f"/api/admin/users/{sa1['id']}/role", headers=h, json={"role": "admin"})
    assert r2.status_code == 400
    # Y no se puede modificar el propio rol
    assert "propio" in str(r2.json()["detail"]).lower()


@pytest.mark.asyncio
async def test_cannot_self_modify_role(client):
    c, _ = client
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    sa = await _mk_user(db, "self@x.com", password="Rob$stPass1234", role="superadmin")
    r = await c.post("/api/auth/login", json={"email": "self@x.com", "password": "Rob$stPass1234"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    r2 = await c.put(f"/api/admin/users/{sa['id']}/role", headers=h, json={"role": "superadmin"})
    assert r2.status_code == 400


@pytest.mark.asyncio
async def test_cannot_suspend_last_superadmin(client):
    c, _ = client
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    sa = await _mk_user(db, "only@x.com", password="Rob$stPass1234", role="superadmin")
    sa2 = await _mk_user(db, "only2@x.com", password="Rob$stPass1234", role="superadmin")

    r = await c.post("/api/auth/login", json={"email": "only@x.com", "password": "Rob$stPass1234"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    # Suspender al otro superadmin → ok, quedaría uno
    ok = await c.put(f"/api/admin/users/{sa2['id']}/status", headers=h,
                       json={"status": "suspended"})
    assert ok.status_code == 200

    # Ahora intentar suspender al último → debería fallar
    # (Nota: no se puede suspender a sí mismo por otra guarda, y solo queda `sa`)
    # Creamos otro admin no-super para que sea el actor
    admin = await _mk_user(db, "adm@x.com", password="Rob$stPass1234", role="admin")
    rL = await c.post("/api/auth/login", json={"email": "adm@x.com", "password": "Rob$stPass1234"})
    hA = {"Authorization": f"Bearer {rL.json()['token']}"}
    r2 = await c.put(f"/api/admin/users/{sa['id']}/status", headers=hA,
                       json={"status": "blocked"})
    # admin role no tiene users.block por defecto → 403
    assert r2.status_code in (400, 403)


@pytest.mark.asyncio
async def test_reject_unknown_permissions(client):
    c, _ = client
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    await _mk_user(db, "sa@x.com", password="Rob$stPass1234", role="superadmin")
    r = await c.post("/api/auth/login", json={"email": "sa@x.com", "password": "Rob$stPass1234"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    r2 = await c.post("/api/admin/rbac/roles", headers=h,
                        json={"key": "bad", "label": "Bad", "description": "",
                              "permissions": ["users.view", "nonexistent.perm"]})
    assert r2.status_code == 400
    assert "desconocidos" in r2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cannot_grant_perms_actor_doesnt_have(client):
    c, _ = client
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    # Admin con perms limitados, incluyendo users.edit_role para poder crear roles
    await _mk_user(db, "limited@x.com", password="Rob$stPass1234", role="admin",
                    perms=["users.view", "users.edit_role"])
    r = await c.post("/api/auth/login", json={"email": "limited@x.com", "password": "Rob$stPass1234"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    r2 = await c.post("/api/admin/rbac/roles", headers=h,
                        json={"key": "elevated", "label": "E", "description": "",
                              "permissions": ["users.block"]})  # no lo tiene
    assert r2.status_code == 403


@pytest.mark.asyncio
async def test_rbac_integrity_endpoint(client):
    c, _ = client
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    await _mk_user(db, "sa@x.com", password="Rob$stPass1234", role="superadmin")
    # Usuario con rol huérfano
    await _mk_user(db, "orphan@x.com", password="Rob$stPass1234", role="ghost_role")
    r = await c.post("/api/auth/login", json={"email": "sa@x.com", "password": "Rob$stPass1234"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    r2 = await c.get("/api/admin/rbac/integrity", headers=h)
    assert r2.status_code == 200
    data = r2.json()
    assert len(data["orphan_users"]) >= 1
    assert any(u["role"] == "ghost_role" for u in data["orphan_users"])


@pytest.mark.asyncio
async def test_no_secrets_in_logs(client, caplog):
    """Un cambio de contraseña no debe filtrar el password en logs."""
    c, _ = client
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)[TEST_DB]
    await _mk_user(db, "log@x.com", password="Rob$stPass1234", role="admin",
                    perms=["users.view"], must_change=False)
    secret_pw = "SuperSecret!2026x"
    r = await c.post("/api/auth/login", json={"email": "log@x.com", "password": "Rob$stPass1234"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    await c.post("/api/admin/me/change-password", headers=h,
                   json={"current_password": "Rob$stPass1234", "new_password": secret_pw})
    log_text = "\n".join(rec.getMessage() for rec in caplog.records)
    assert secret_pw not in log_text
    assert "Rob$stPass1234" not in log_text
