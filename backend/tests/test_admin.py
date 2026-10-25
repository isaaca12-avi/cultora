"""
Cultora Admin Panel — Backend E2E tests.
Covers: /api/admin/me, /dashboard, /users (list/role/status), RBAC 403,
convocatorias CRUD + duplicate, resources CRUD (soft delete),
spaces CRUD (soft delete), config, activity log, analytics.
"""
import os
import uuid
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
    r = session.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASS})
    assert r.status_code == 200, r.text
    data = r.json()
    STATE["super_id"] = data["user"]["id"]
    return data["token"]


@pytest.fixture(scope="module")
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def probe_user(session):
    """Fresh no-admin user for RBAC tests."""
    email = f"test_probe_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "cultora123", "name": "TEST Probe"})
    assert r.status_code == 200, r.text
    d = r.json()
    STATE["probe_id"] = d["user"]["id"]
    STATE["probe_email"] = email
    STATE["probe_password"] = "cultora123"
    STATE["probe_token"] = d["token"]
    return d


@pytest.fixture(scope="module")
def probe_headers(probe_user):
    return {"Authorization": f"Bearer {probe_user['token']}", "Content-Type": "application/json"}


# --------------------------------------------------------------------
# /api/admin/me + RBAC
# --------------------------------------------------------------------
class TestAdminMe:
    def test_super_me(self, session, super_headers):
        r = session.get(f"{API}/admin/me", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["email"] == SUPER_EMAIL
        assert j["admin_role"] == "superadmin"
        assert j["is_admin"] is True
        assert isinstance(j["permissions"], list)
        assert len(j["permissions"]) > 20
        assert "users.edit_role" in j["permissions"]

    def test_no_admin_me(self, session, probe_headers):
        r = session.get(f"{API}/admin/me", headers=probe_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["is_admin"] is False
        assert j["admin_role"] is None
        assert j["permissions"] == []

    def test_no_admin_403_users(self, session, probe_headers):
        r = session.get(f"{API}/admin/users", headers=probe_headers)
        assert r.status_code == 403


# --------------------------------------------------------------------
# Dashboard
# --------------------------------------------------------------------
class TestDashboard:
    def test_dashboard(self, session, super_headers):
        r = session.get(f"{API}/admin/dashboard", headers=super_headers)
        assert r.status_code == 200
        j = r.json()
        for k in ("metrics", "recent_topics", "recent_activity", "generated_at"):
            assert k in j
        metrics = j["metrics"]
        for mk in ("users_total", "users_new_7d", "users_active_7d",
                   "agents_published", "agents_pending",
                   "forum_topics", "forum_replies", "forum_reports_open",
                   "convocatorias_active", "convocatorias_draft"):
            assert mk in metrics
            assert isinstance(metrics[mk], int), f"{mk} is not int: {metrics[mk]!r}"


# --------------------------------------------------------------------
# Users list + Maria presence
# --------------------------------------------------------------------
class TestUsers:
    def test_list_users_has_maria(self, session, super_headers):
        r = session.get(f"{API}/admin/users", headers=super_headers)
        assert r.status_code == 200
        j = r.json()
        assert isinstance(j["items"], list)
        maria = next((u for u in j["items"] if u["email"] == SUPER_EMAIL), None)
        assert maria is not None, "Maria not present in users list"
        assert maria.get("admin_role") == "superadmin"


# --------------------------------------------------------------------
# Role change + RBAC enforcement + self-protection
# --------------------------------------------------------------------
class TestRolesRBAC:
    def test_promote_probe_to_moderator(self, session, super_headers):
        uid = STATE["probe_id"]
        r = session.put(f"{API}/admin/users/{uid}/role",
                        json={"role": "moderator"}, headers=super_headers)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

    def test_probe_me_now_moderator(self, session, probe_headers):
        r = session.get(f"{API}/admin/me", headers=probe_headers)
        assert r.status_code == 200
        j = r.json()
        assert j["admin_role"] == "moderator"
        assert j["is_admin"] is True
        perms = set(j["permissions"])
        assert "users.view" in perms
        assert "users.edit_role" not in perms
        assert "users.block" not in perms

    def test_moderator_cant_change_role(self, session, probe_headers):
        # try changing Maria's role with moderator → must 403
        r = session.put(f"{API}/admin/users/{STATE['super_id']}/role",
                        json={"role": "admin"}, headers=probe_headers)
        assert r.status_code == 403, r.text

    def test_super_cannot_remove_own_role(self, session, super_headers):
        r = session.put(f"{API}/admin/users/{STATE['super_id']}/role",
                        json={"role": None}, headers=super_headers)
        assert r.status_code == 400
        assert "propio rol" in r.text.lower() or "quitarte" in r.text.lower()

    def test_super_cannot_self_suspend(self, session, super_headers):
        r = session.put(f"{API}/admin/users/{STATE['super_id']}/status",
                        json={"status": "suspended"}, headers=super_headers)
        assert r.status_code == 400

    def test_super_can_suspend_probe(self, session, super_headers):
        # suspend probe, then reactivate to leave clean-ish state
        r = session.put(f"{API}/admin/users/{STATE['probe_id']}/status",
                        json={"status": "suspended", "reason": "TEST"}, headers=super_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "suspended"
        # re-activate
        r2 = session.put(f"{API}/admin/users/{STATE['probe_id']}/status",
                         json={"status": "active"}, headers=super_headers)
        assert r2.status_code == 200


# --------------------------------------------------------------------
# Convocatorias CRUD + status + duplicate
# --------------------------------------------------------------------
class TestConvocatorias:
    def test_create_convocatoria(self, session, super_headers):
        payload = {
            "title": f"TEST Convocatoria {uuid.uuid4().hex[:6]}",
            "entity": "TEST Entidad",
            "country": "Argentina",
            "status": "Borrador",
            "summary": "Prueba automática",
        }
        r = session.post(f"{API}/admin/convocatorias", json=payload, headers=super_headers)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["title"] == payload["title"]
        assert c["status"] == "Borrador"
        assert "id" in c
        STATE["conv_id"] = c["id"]
        STATE["conv_title"] = payload["title"]

    def test_change_status_to_abierta(self, session, super_headers):
        cid = STATE["conv_id"]
        r = session.put(f"{API}/admin/convocatorias/{cid}/status",
                        json={"status": "Abierta"}, headers=super_headers)
        assert r.status_code == 200, r.text
        # verify via GET
        r2 = session.get(f"{API}/admin/convocatorias/{cid}", headers=super_headers)
        assert r2.status_code == 200
        assert r2.json()["status"] == "Abierta"

    def test_duplicate_convocatoria(self, session, super_headers):
        cid = STATE["conv_id"]
        r = session.post(f"{API}/admin/convocatorias/{cid}/duplicate", headers=super_headers)
        assert r.status_code == 200, r.text
        dup = r.json()
        assert dup["status"] == "Borrador"
        assert dup["title"].endswith("(copia)")
        assert dup["id"] != cid
        STATE["conv_dup_id"] = dup["id"]


# --------------------------------------------------------------------
# Resources CRUD (soft delete)
# --------------------------------------------------------------------
class TestResources:
    def test_create_resource(self, session, super_headers):
        payload = {
            "title": f"TEST Recurso {uuid.uuid4().hex[:6]}",
            "kind": "articulo",
            "category": "gestion",
            "summary": "Prueba",
        }
        r = session.post(f"{API}/admin/resources", json=payload, headers=super_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == payload["title"]
        STATE["res_id"] = d["id"]

    def test_update_resource(self, session, super_headers):
        rid = STATE["res_id"]
        payload = {
            "title": f"TEST Recurso Updated {uuid.uuid4().hex[:6]}",
            "kind": "articulo",
            "category": "gestion",
            "summary": "Prueba updated",
        }
        r = session.put(f"{API}/admin/resources/{rid}", json=payload, headers=super_headers)
        assert r.status_code == 200
        STATE["res_updated_title"] = payload["title"]
        # verify via list
        r2 = session.get(f"{API}/admin/resources", headers=super_headers)
        assert r2.status_code == 200
        found = next((x for x in r2.json()["items"] if x["id"] == rid), None)
        assert found is not None
        assert found["title"] == payload["title"]

    def test_delete_resource_soft(self, session, super_headers):
        rid = STATE["res_id"]
        r = session.delete(f"{API}/admin/resources/{rid}", headers=super_headers)
        assert r.status_code == 200
        # should not appear in list any more
        r2 = session.get(f"{API}/admin/resources", headers=super_headers)
        found = next((x for x in r2.json()["items"] if x["id"] == rid), None)
        assert found is None, "soft-deleted resource still visible in list"


# --------------------------------------------------------------------
# Spaces CRUD (soft delete)
# --------------------------------------------------------------------
class TestSpaces:
    def test_create_space(self, session, super_headers):
        payload = {
            "name": f"TEST Espacio {uuid.uuid4().hex[:6]}",
            "city": "Buenos Aires",
            "country": "Argentina",
            "capacity": 50,
        }
        r = session.post(f"{API}/admin/spaces", json=payload, headers=super_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        STATE["space_id"] = d["id"]

    def test_update_space(self, session, super_headers):
        sid = STATE["space_id"]
        payload = {
            "name": f"TEST Espacio Updated {uuid.uuid4().hex[:6]}",
            "city": "CDMX",
            "country": "México",
            "capacity": 120,
        }
        r = session.put(f"{API}/admin/spaces/{sid}", json=payload, headers=super_headers)
        assert r.status_code == 200

    def test_delete_space_soft(self, session, super_headers):
        sid = STATE["space_id"]
        r = session.delete(f"{API}/admin/spaces/{sid}", headers=super_headers)
        assert r.status_code == 200
        r2 = session.get(f"{API}/admin/spaces", headers=super_headers)
        found = next((x for x in r2.json()["items"] if x["id"] == sid), None)
        assert found is None


# --------------------------------------------------------------------
# Config
# --------------------------------------------------------------------
class TestConfig:
    def test_get_config_keys(self, session, super_headers):
        r = session.get(f"{API}/admin/config", headers=super_headers)
        assert r.status_code == 200
        c = r.json()
        for k in ("disciplines", "categories", "countries", "cities", "tags",
                  "states", "conv_types", "conv_areas", "conv_modalidades"):
            assert k in c

    def test_put_config_disciplines(self, session, super_headers):
        new_vals = ["TEST1", "TEST2"]
        r = session.put(f"{API}/admin/config",
                        json={"key": "disciplines", "values": new_vals},
                        headers=super_headers)
        assert r.status_code == 200
        # verify
        r2 = session.get(f"{API}/admin/config", headers=super_headers)
        assert r2.status_code == 200
        assert r2.json()["disciplines"] == new_vals


# --------------------------------------------------------------------
# Activity log
# --------------------------------------------------------------------
class TestActivity:
    def test_activity_lists_recent_actions(self, session, super_headers):
        r = session.get(f"{API}/admin/activity", headers=super_headers)
        assert r.status_code == 200
        j = r.json()
        assert "items" in j
        assert len(j["items"]) >= 1
        first = j["items"][0]
        for k in ("action", "target_type", "actor_name", "at"):
            assert k in first
        actions = {x["action"] for x in j["items"]}
        # Recent actions from previous test classes should have registered
        assert any(a.startswith("convocatoria.") or a.startswith("resource.") or a.startswith("config.") for a in actions)


# --------------------------------------------------------------------
# Analytics
# --------------------------------------------------------------------
class TestAnalytics:
    def test_analytics_shape(self, session, super_headers):
        r = session.get(f"{API}/admin/analytics", headers=super_headers)
        assert r.status_code == 200
        j = r.json()
        assert "real" in j and isinstance(j["real"], dict)
        assert "sample_series" in j and isinstance(j["sample_series"], list) and len(j["sample_series"]) >= 1
        assert "sample_disclaimer" in j and isinstance(j["sample_disclaimer"], str)


# --------------------------------------------------------------------
# Cleanup: revert probe to no role
# --------------------------------------------------------------------
class TestCleanup:
    def test_revert_probe_role(self, session, super_headers):
        r = session.put(f"{API}/admin/users/{STATE['probe_id']}/role",
                        json={"role": None}, headers=super_headers)
        assert r.status_code == 200
