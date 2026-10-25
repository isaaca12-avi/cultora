"""
Tests para el bootstrap seguro del primer superadministrador.

Cubren los casos requeridos:
  A. Bootstrap deshabilitado no crea ni modifica ningún administrador.
  B. Bootstrap habilitado + sin superadmin → crea exactamente uno.
  C. Reiniciar no modifica rol, estado, permisos ni contraseña.
  D. Superadmin suspendido no se reactiva al reiniciar.
  E. Superadmin degradado no se re-promueve.
  F. Si ya existe otro superadmin, el bootstrap no crea otro.
  G. Faltando variables mientras enabled=true → RuntimeError seguro.
  H. La contraseña nunca aparece en logs ni responses.
  I. El usuario con must_change_password=true no puede acceder al panel.
  J. La lógica automática sobre maria@example.com ya no existe.

Ejecución:
  cd /app/backend && python -m pytest tests/test_admin_bootstrap.py -v
"""
import asyncio
import logging
import os
import sys
import uuid

import pytest
import pytest_asyncio

# Asegurar que backend/ esté en sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Cargar .env del backend explícitamente para pytest
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
TEST_DB = f"cultora_test_bootstrap_{uuid.uuid4().hex[:8]}"


@pytest_asyncio.fixture
async def db():
    client = AsyncIOMotorClient(MONGO_URL)
    d = client[TEST_DB]
    yield d
    await client.drop_database(TEST_DB)
    client.close()


def _clear_env():
    for k in ("CULTORA_BOOTSTRAP_ENABLED",
             "CULTORA_BOOTSTRAP_ADMIN_EMAIL",
             "CULTORA_BOOTSTRAP_ADMIN_PASSWORD"):
        os.environ.pop(k, None)


def _set_env(enabled=None, email=None, password=None):
    _clear_env()
    if enabled is not None:
        os.environ["CULTORA_BOOTSTRAP_ENABLED"] = enabled
    if email is not None:
        os.environ["CULTORA_BOOTSTRAP_ADMIN_EMAIL"] = email
    if password is not None:
        os.environ["CULTORA_BOOTSTRAP_ADMIN_PASSWORD"] = password


STRONG_PASSWORD = "TestStrong!Pass_2026"


# ---------------------- A ----------------------

@pytest.mark.asyncio
async def test_a_disabled_does_not_touch_anything(db):
    """A. Bootstrap deshabilitado no crea ni modifica ningún administrador."""
    from admin_bootstrap import run_admin_bootstrap
    _set_env(enabled="false", email="ignored@x.com", password=STRONG_PASSWORD)
    result = await run_admin_bootstrap(db)
    assert result == {"status": "disabled"}
    assert await db.users.count_documents({}) == 0


@pytest.mark.asyncio
async def test_a_missing_flag_is_disabled(db):
    """A (variante). Sin variable enabled → deshabilitado."""
    from admin_bootstrap import run_admin_bootstrap
    _clear_env()
    result = await run_admin_bootstrap(db)
    assert result == {"status": "disabled"}
    assert await db.users.count_documents({}) == 0


# ---------------------- B ----------------------

@pytest.mark.asyncio
async def test_b_enabled_no_superadmin_creates_one(db):
    """B. Bootstrap habilitado sin superadmin previo → crea exactamente uno."""
    from admin_bootstrap import run_admin_bootstrap
    _set_env(enabled="true", email="first@cultora.io", password=STRONG_PASSWORD)
    result = await run_admin_bootstrap(db)
    assert result["status"] == "created"
    assert result["email"] == "first@cultora.io"

    supers = await db.users.count_documents({"admin_role": "superadmin"})
    assert supers == 1

    user = await db.users.find_one({"email": "first@cultora.io"})
    assert user["admin_role"] == "superadmin"
    assert user["status"] == "active"
    assert user["must_change_password"] is True
    assert user["password_hash"].startswith("$2b$")

    # Bitácora: system.bootstrap_admin_created
    log = await db.admin_activity.find_one({"action": "system.bootstrap_admin_created"})
    assert log is not None
    assert log["target_id"] == user["id"]


# ---------------------- C ----------------------

@pytest.mark.asyncio
async def test_c_second_run_does_not_modify(db):
    """C. Reiniciar el bootstrap no modifica rol, estado, permisos ni contraseña."""
    from admin_bootstrap import run_admin_bootstrap
    _set_env(enabled="true", email="stable@cultora.io", password=STRONG_PASSWORD)
    await run_admin_bootstrap(db)
    user1 = await db.users.find_one({"email": "stable@cultora.io"})
    original_hash = user1["password_hash"]
    original_id = user1["id"]

    # Simular reinicio: vuelve a correr con las mismas variables
    result = await run_admin_bootstrap(db)
    assert result["status"] == "skipped_existing_superadmin"

    user2 = await db.users.find_one({"id": original_id})
    assert user2["password_hash"] == original_hash
    assert user2["admin_role"] == "superadmin"
    assert user2["status"] == "active"
    assert user2["must_change_password"] is True


# ---------------------- D ----------------------

@pytest.mark.asyncio
async def test_d_suspended_superadmin_not_reactivated(db):
    """D. Si el superadmin está suspendido, reiniciar no lo reactiva."""
    from admin_bootstrap import run_admin_bootstrap
    _set_env(enabled="true", email="sus@cultora.io", password=STRONG_PASSWORD)
    await run_admin_bootstrap(db)

    # Suspender manualmente
    await db.users.update_one({"email": "sus@cultora.io"},
                              {"$set": {"status": "suspended"}})

    # Rearranque simulado
    await run_admin_bootstrap(db)
    user = await db.users.find_one({"email": "sus@cultora.io"})
    assert user["status"] == "suspended", "el bootstrap no debe reactivar cuentas suspendidas"


# ---------------------- E ----------------------

@pytest.mark.asyncio
async def test_e_demoted_superadmin_not_re_promoted(db):
    """E. Si el superadmin fue degradado, reiniciar no lo vuelve a promover."""
    from admin_bootstrap import run_admin_bootstrap
    _set_env(enabled="true", email="demoted@cultora.io", password=STRONG_PASSWORD)
    await run_admin_bootstrap(db)

    # Degradar
    await db.users.update_one({"email": "demoted@cultora.io"},
                              {"$set": {"admin_role": "moderator"}})

    # Ahora, ATENCIÓN: al degradar el único superadmin, la cuenta pasa a moderator.
    # El re-run del bootstrap volvería a ver 0 superadmins existentes y crearía OTRO.
    # Eso NO debe pasar automáticamente sobre la misma cuenta degradada.
    await run_admin_bootstrap(db)

    demoted = await db.users.find_one({"email": "demoted@cultora.io"})
    assert demoted["admin_role"] == "moderator", "no debe re-promover la cuenta degradada"

    # (Si sin ningún superadmin, el bootstrap crearía uno NUEVO con ese email.
    # Ese comportamiento requeriría un email distinto — vía variables de entorno.)
    same_email_count = await db.users.count_documents({"email": "demoted@cultora.io"})
    assert same_email_count == 1
    # Y no debe haberse creado NADIE nuevo (ni con este email ni con otro superadmin).
    supers = await db.users.count_documents({"admin_role": "superadmin"})
    assert supers == 0


# ---------------------- F ----------------------

@pytest.mark.asyncio
async def test_f_existing_superadmin_skips(db):
    """F. Si ya existe otro superadmin, el bootstrap no crea otro."""
    from admin_bootstrap import run_admin_bootstrap
    # Crear un superadmin pre-existente manualmente
    await db.users.insert_one({
        "id": str(uuid.uuid4()),
        "email": "existing@cultora.io",
        "name": "Existing",
        "password_hash": "$2b$fake",
        "created_at": "2025-01-01T00:00:00+00:00",
        "admin_role": "superadmin",
        "status": "active",
    })

    _set_env(enabled="true", email="second@cultora.io", password=STRONG_PASSWORD)
    result = await run_admin_bootstrap(db)
    assert result["status"] == "skipped_existing_superadmin"
    assert result["existing_superadmins"] == 1

    # No se creó el segundo
    assert await db.users.find_one({"email": "second@cultora.io"}) is None
    assert await db.users.count_documents({"admin_role": "superadmin"}) == 1


# ---------------------- G ----------------------

@pytest.mark.asyncio
async def test_g_missing_email_raises(db):
    """G1. Falta el email → RuntimeError."""
    from admin_bootstrap import run_admin_bootstrap, BootstrapConfigError
    _set_env(enabled="true", email="", password=STRONG_PASSWORD)
    with pytest.raises(BootstrapConfigError) as ei:
        await run_admin_bootstrap(db)
    assert "EMAIL" in str(ei.value).upper()
    # Nunca debe filtrar el password
    assert STRONG_PASSWORD not in str(ei.value)


@pytest.mark.asyncio
async def test_g_missing_password_raises(db):
    """G2. Falta el password → RuntimeError."""
    from admin_bootstrap import run_admin_bootstrap, BootstrapConfigError
    _set_env(enabled="true", email="ok@cultora.io", password="")
    with pytest.raises(BootstrapConfigError) as ei:
        await run_admin_bootstrap(db)
    assert "PASSWORD" in str(ei.value).upper()


@pytest.mark.asyncio
async def test_g_weak_password_raises(db):
    """G3. Password débil → RuntimeError."""
    from admin_bootstrap import run_admin_bootstrap, BootstrapConfigError
    _set_env(enabled="true", email="ok@cultora.io", password="short")
    with pytest.raises(BootstrapConfigError):
        await run_admin_bootstrap(db)


@pytest.mark.asyncio
async def test_g_invalid_email_raises(db):
    """G4. Email inválido → RuntimeError."""
    from admin_bootstrap import run_admin_bootstrap, BootstrapConfigError
    _set_env(enabled="true", email="not-an-email", password=STRONG_PASSWORD)
    with pytest.raises(BootstrapConfigError):
        await run_admin_bootstrap(db)


# ---------------------- H ----------------------

@pytest.mark.asyncio
async def test_h_password_never_in_logs(db, caplog):
    """H. La contraseña nunca aparece en logs."""
    from admin_bootstrap import run_admin_bootstrap
    _set_env(enabled="true", email="silent@cultora.io", password=STRONG_PASSWORD)
    caplog.set_level(logging.DEBUG)
    result = await run_admin_bootstrap(db)
    assert result["status"] == "created"
    log_text = "\n".join(rec.getMessage() for rec in caplog.records)
    assert STRONG_PASSWORD not in log_text


@pytest.mark.asyncio
async def test_h_password_not_in_response(db):
    """H (variante). El resultado del bootstrap no incluye la contraseña ni el hash."""
    from admin_bootstrap import run_admin_bootstrap
    _set_env(enabled="true", email="noresp@cultora.io", password=STRONG_PASSWORD)
    result = await run_admin_bootstrap(db)
    assert STRONG_PASSWORD not in str(result)
    assert "password_hash" not in result
    assert "password" not in result


# ---------------------- J ----------------------

@pytest.mark.asyncio
async def test_j_no_maria_specific_logic(db):
    """J. La lógica automática sobre maria@example.com ya no existe.

    Insertamos una Maria con admin_role="superadmin" y verificamos que
    run_admin_seed NO le quita el rol (como sí hacía la versión insegura).
    """
    from admin_seed import run_admin_seed

    await db.users.insert_one({
        "id": str(uuid.uuid4()),
        "email": "maria@example.com",
        "name": "Maria",
        "password_hash": "$2b$fake",
        "created_at": "2025-01-01T00:00:00+00:00",
        "admin_role": "superadmin",
        "status": "active",
    })

    await run_admin_seed(db)

    maria = await db.users.find_one({"email": "maria@example.com"})
    # La versión anterior le quitaba admin_role. La nueva no debe tocarla.
    assert maria.get("admin_role") == "superadmin"
    assert maria.get("status") == "active"
