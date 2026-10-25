"""
Cultora Admin Panel — Backend tests for iteration 6 (Notifications module).

Coverage:
- Auto-population at startup (kind=users.recent_registrations exists for maria)
- Notification schema fields
- unread_only filter
- unread-count endpoint
- POST /{nid}/read marks as read for current user
- POST /{nid}/dismiss removes from user's view
- POST /mark-all-read
- RBAC: no-admin user gets 403
- Segmentación por permiso: content_editor sees only notifs whose required_perm they have
- Auto-generation of convocatoria.expiring for close_date within 7 days
- Idempotencia: calling list N times doesn't duplicate
"""
import os
import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

SUPER_EMAIL = "maria@example.com"
SUPER_PASS = "cultora123"

STATE = {}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def super_token(session):
    r = session.post(f"{API}/auth/login",
                     json={"email": SUPER_EMAIL, "password": SUPER_PASS})
    assert r.status_code == 200, r.text
    d = r.json()
    STATE["super_id"] = d["user"]["id"]
    return d["token"]


@pytest.fixture(scope="module")
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}


def _register_probe(session, prefix="probe"):
    email = f"test_notif_{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register",
                     json={"email": email, "password": "cultora123", "name": f"TEST {prefix}"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "id": d["user"]["id"], "token": d["token"]}


# ---------------------------------------------------------------
# Listing basics
# ---------------------------------------------------------------
class TestListEndpoint:
    def test_list_returns_expected_shape(self, session, super_headers):
        r = session.get(f"{API}/admin/notifications", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("count", "unread", "items"):
            assert k in j, f"missing {k}"
        assert isinstance(j["items"], list)
        assert isinstance(j["count"], int)
        assert isinstance(j["unread"], int)
        STATE["initial_count"] = j["count"]
        STATE["initial_unread"] = j["unread"]
        STATE["items"] = j["items"]

    def test_at_least_one_notification_recent_registrations(self, session, super_headers):
        """Registrar un usuario (fuerza refresh de recent_registrations),
        y luego verificar que existe la notif kind=users.recent_registrations.
        Nota: el refresh tiene cache de 60s, pero admin_seed la creó al startup."""
        _register_probe(session, "seed")
        # Give the cache a chance to be reset by triggering a list call
        r = session.get(f"{API}/admin/notifications?limit=100", headers=super_headers)
        assert r.status_code == 200
        kinds = {n["kind"] for n in r.json()["items"]}
        assert "users.recent_registrations" in kinds, f"Expected users.recent_registrations in {kinds}"

    def test_notification_schema_fields(self, session, super_headers):
        r = session.get(f"{API}/admin/notifications?limit=100", headers=super_headers)
        items = r.json()["items"]
        assert len(items) > 0, "Need at least one notif to check schema"
        n = items[0]
        expected = {"id", "kind", "title", "subtitle", "url", "required_perm",
                    "target_type", "target_id", "created_at", "read_by",
                    "dismissed_by", "is_read"}
        missing = expected - set(n.keys())
        assert not missing, f"missing fields: {missing}. got: {list(n.keys())}"
        assert isinstance(n["read_by"], list)
        assert isinstance(n["dismissed_by"], list)
        assert isinstance(n["is_read"], bool)

    def test_unread_only_filter(self, session, super_headers):
        r_all = session.get(f"{API}/admin/notifications?limit=100", headers=super_headers)
        r_unread = session.get(f"{API}/admin/notifications?unread_only=true&limit=100",
                               headers=super_headers)
        assert r_all.status_code == 200
        assert r_unread.status_code == 200
        for n in r_unread.json()["items"]:
            assert n["is_read"] is False, f"unread_only returned read notif {n['id']}"

    def test_unread_count_endpoint(self, session, super_headers):
        r = session.get(f"{API}/admin/notifications/unread-count", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "unread" in j
        assert isinstance(j["unread"], int)
        # Coincide con el badge del popover (list.unread)
        list_r = session.get(f"{API}/admin/notifications", headers=super_headers)
        assert list_r.json()["unread"] == j["unread"]


# ---------------------------------------------------------------
# Read / Dismiss / Mark-all-read
# ---------------------------------------------------------------
class TestReadAndDismiss:
    def test_mark_as_read(self, session, super_headers):
        # Registrar un fresh probe con superadmin role to avoid cross-contamination
        probe = _register_probe(session, "read")
        session.put(f"{API}/admin/users/{probe['id']}/role",
                    json={"role": "superadmin"}, headers=super_headers)
        pheaders = {"Authorization": f"Bearer {probe['token']}"}

        r0 = session.get(f"{API}/admin/notifications?limit=100", headers=pheaders)
        assert r0.status_code == 200, r0.text
        items = r0.json()["items"]
        if not items:
            pytest.skip("No notifs to mark as read")
        # Find one that's unread
        target = next((n for n in items if not n["is_read"]), None)
        if not target:
            pytest.skip("All notifs already read for this probe")
        unread_before = r0.json()["unread"]

        r1 = session.post(f"{API}/admin/notifications/{target['id']}/read", headers=pheaders)
        assert r1.status_code == 200, r1.text
        assert r1.json()["ok"] is True

        # Verificar que is_read=true y unread se decrementa
        r2 = session.get(f"{API}/admin/notifications?limit=100", headers=pheaders)
        j2 = r2.json()
        after = next((n for n in j2["items"] if n["id"] == target["id"]), None)
        assert after is not None
        assert after["is_read"] is True
        assert j2["unread"] == unread_before - 1

        # Cleanup
        session.put(f"{API}/admin/users/{probe['id']}/role",
                    json={"role": None}, headers=super_headers)

    def test_dismiss_removes_from_next_list(self, session, super_headers):
        probe = _register_probe(session, "dismiss")
        session.put(f"{API}/admin/users/{probe['id']}/role",
                    json={"role": "superadmin"}, headers=super_headers)
        pheaders = {"Authorization": f"Bearer {probe['token']}"}

        r0 = session.get(f"{API}/admin/notifications?limit=100", headers=pheaders)
        items = r0.json()["items"]
        if not items:
            pytest.skip("No notifs to dismiss")
        target = items[0]

        r1 = session.post(f"{API}/admin/notifications/{target['id']}/dismiss", headers=pheaders)
        assert r1.status_code == 200, r1.text

        r2 = session.get(f"{API}/admin/notifications?limit=100", headers=pheaders)
        ids = {n["id"] for n in r2.json()["items"]}
        assert target["id"] not in ids, "Dismissed notif still visible"

        session.put(f"{API}/admin/users/{probe['id']}/role",
                    json={"role": None}, headers=super_headers)

    def test_mark_all_read(self, session, super_headers):
        probe = _register_probe(session, "markall")
        session.put(f"{API}/admin/users/{probe['id']}/role",
                    json={"role": "superadmin"}, headers=super_headers)
        pheaders = {"Authorization": f"Bearer {probe['token']}"}

        r0 = session.get(f"{API}/admin/notifications?limit=100", headers=pheaders)
        unread_before = r0.json()["unread"]

        r1 = session.post(f"{API}/admin/notifications/mark-all-read", headers=pheaders)
        assert r1.status_code == 200, r1.text
        j = r1.json()
        assert j["ok"] is True
        assert "modified" in j
        # Should have marked all initial unread as read (>= unread_before if there were any)
        if unread_before > 0:
            assert j["modified"] == unread_before

        r2 = session.get(f"{API}/admin/notifications/unread-count", headers=pheaders)
        assert r2.json()["unread"] == 0

        session.put(f"{API}/admin/users/{probe['id']}/role",
                    json={"role": None}, headers=super_headers)


# ---------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------
class TestRBAC:
    def test_no_admin_gets_403(self, session):
        probe = _register_probe(session, "noadmin")
        headers = {"Authorization": f"Bearer {probe['token']}"}
        r = session.get(f"{API}/admin/notifications", headers=headers)
        assert r.status_code == 403, r.text

    def test_content_editor_segmentation(self, session, super_headers):
        """content_editor tiene convocatorias.edit pero NO users.view.
        Solo debe ver notifs con required_perm en su set (ej. convocatoria.expiring).
        NO debe ver users.recent_registrations (required_perm=users.view)."""
        probe = _register_probe(session, "editor")
        pid, ptoken = probe["id"], probe["token"]

        r = session.put(f"{API}/admin/users/{pid}/role",
                        json={"role": "content_editor"}, headers=super_headers)
        assert r.status_code == 200, r.text

        pheaders = {"Authorization": f"Bearer {ptoken}"}
        me = session.get(f"{API}/admin/me", headers=pheaders).json()
        perms = set(me["permissions"])
        assert "convocatorias.edit" in perms
        assert "users.view" not in perms

        r2 = session.get(f"{API}/admin/notifications?limit=100", headers=pheaders)
        assert r2.status_code == 200, r2.text
        items = r2.json()["items"]
        for n in items:
            assert n["required_perm"] in perms, \
                f"content_editor saw notif with required_perm={n['required_perm']} not in {perms}"
            assert n["required_perm"] != "users.view"

        # Cleanup
        session.put(f"{API}/admin/users/{pid}/role",
                    json={"role": None}, headers=super_headers)


# ---------------------------------------------------------------
# Auto-generation / idempotency
# ---------------------------------------------------------------
class TestAutoGeneration:
    def test_convocatoria_expiring_generated(self, session, super_headers):
        """Crear una convocatoria con close_date en 3 días y status=Abierta.
        Como el cache tiene TTL 60s, hacemos una técnica: creamos la convocatoria,
        y luego consultamos varias veces. Al pasar el TTL o al reiniciar, aparece.
        Para test dentro de la sesión: si _LAST_REFRESH global no está seteado (o expirado),
        el primer list la crea. Si está fresh, esperamos 61s O confiamos en que
        el próximo list la genere.
        """
        today = datetime.now(timezone.utc)
        close_date = (today + timedelta(days=3)).date().isoformat()
        open_date = today.date().isoformat()

        payload = {
            "title": f"TEST Convocatoria expiring {uuid.uuid4().hex[:6]}",
            "entity": "TEST Entidad",
            "country": "Argentina",
            "status": "Abierta",
            "summary": "Test para verificar autogen de notificacion",
            "open_date": open_date,
            "close_date": close_date,
            "types": ["Beca"],
            "areas": ["Música"],
        }
        r = session.post(f"{API}/admin/convocatorias", json=payload, headers=super_headers)
        assert r.status_code == 200, r.text
        conv = r.json()
        STATE["expiring_conv_id"] = conv["id"]

        # Esperar >60s para que expire el TTL del cache, luego re-listar
        # (Estrategia alternativa: si el test pasa antes, ganamos tiempo)
        # Primer intento inmediato:
        r1 = session.get(f"{API}/admin/notifications?limit=100", headers=super_headers)
        kinds = [(n["kind"], n.get("target_id")) for n in r1.json()["items"]]
        found = any(k == "convocatoria.expiring" and tid == conv["id"] for k, tid in kinds)
        if not found:
            # Esperar 61s y reintentar (TTL de cache)
            time.sleep(62)
            r2 = session.get(f"{API}/admin/notifications?limit=100", headers=super_headers)
            kinds = [(n["kind"], n.get("target_id")) for n in r2.json()["items"]]
            found = any(k == "convocatoria.expiring" and tid == conv["id"] for k, tid in kinds)
        assert found, f"Expected convocatoria.expiring notif for {conv['id']}, got kinds: {kinds}"

    def test_idempotency_no_duplicates(self, session, super_headers):
        """Llamar GET /notifications múltiples veces NO duplica notificaciones.
        Verificamos que la lista de (kind, target_type, target_id) sea única
        y que el count no crezca artificialmente."""
        # Warm up
        r1 = session.get(f"{API}/admin/notifications?limit=100", headers=super_headers)
        assert r1.status_code == 200
        j1 = r1.json()
        items1 = j1["items"]
        # Verificar idempotencia interna: no debe haber duplicados de (kind, target_type, target_id)
        keys = [(n["kind"], n.get("target_type"), n.get("target_id"))
                for n in items1 if n.get("target_id") is not None]
        assert len(keys) == len(set(keys)), f"Duplicate (kind,target_type,target_id) in items: {keys}"

        # Llamar N veces más — el count no debe explotar
        for _ in range(5):
            r = session.get(f"{API}/admin/notifications?limit=100", headers=super_headers)
            assert r.status_code == 200
            jj = r.json()
            # Puede aumentar en 1 si aparece una nueva convocatoria/agente entre calls,
            # pero no debe duplicar. Verificamos que la cardinalidad de keys sea igual a items
            kk = [(n["kind"], n.get("target_type"), n.get("target_id"))
                  for n in jj["items"] if n.get("target_id") is not None]
            assert len(kk) == len(set(kk)), "Duplicates appeared after multiple list calls"


# ---------------------------------------------------------------
# Cleanup at end of module (best-effort)
# ---------------------------------------------------------------
@pytest.fixture(scope="module", autouse=True)
def _module_cleanup(session, super_token):
    yield
    # Delete the test convocatoria if created (via status Archivada or leave it)
    cid = STATE.get("expiring_conv_id")
    if cid:
        try:
            session.put(f"{API}/admin/convocatorias/{cid}/status",
                        json={"status": "Archivada"},
                        headers={"Authorization": f"Bearer {super_token}"})
        except Exception:
            pass
