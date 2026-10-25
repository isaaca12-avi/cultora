"""
Cultora Admin Panel — Backend tests for iteration 5 features:
- Server-side pagination on list endpoints
- Global search endpoint (/admin/search)
- Detail endpoints (/admin/agents/{uid}, /admin/forum/topics/{tid})
- Custom roles CRUD (/admin/rbac/roles ...)
- User permission overrides (/admin/users/{uid}/permissions)
- Session invalidation on suspend/blocked (get_current_user 403)
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
    d = r.json()
    STATE["super_id"] = d["user"]["id"]
    return d["token"]


@pytest.fixture(scope="module")
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}


def _register_probe(session, prefix="probe"):
    email = f"test_{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register",
                     json={"email": email, "password": "cultora123", "name": f"TEST {prefix}"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "id": d["user"]["id"], "token": d["token"]}


# ------------------------------------------------------------
# Pagination
# ------------------------------------------------------------
class TestPagination:
    def test_users_pagination(self, session, super_headers):
        r = session.get(f"{API}/admin/users?page=1&limit=5", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("items", "count", "total", "page", "limit", "has_more"):
            assert k in j, f"missing {k}"
        assert j["page"] == 1
        assert j["limit"] == 5
        assert j["total"] >= 1
        assert len(j["items"]) <= 5
        # If total > 5, page=2 should give more items
        if j["total"] > 5:
            r2 = session.get(f"{API}/admin/users?page=2&limit=5", headers=super_headers)
            assert r2.status_code == 200
            j2 = r2.json()
            assert j2["page"] == 2
            # items may or may not be present depending on real data, but no error
            first_ids = {u["id"] for u in j["items"]}
            second_ids = {u["id"] for u in j2["items"]}
            assert first_ids.isdisjoint(second_ids), "page 2 overlaps page 1"

    def test_agents_pagination(self, session, super_headers):
        r = session.get(f"{API}/admin/agents?page=1&limit=5", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("items", "count", "total", "page", "limit", "has_more"):
            assert k in j

    def test_convocatorias_pagination(self, session, super_headers):
        r = session.get(f"{API}/admin/convocatorias?page=1&limit=5", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("items", "count", "total", "page", "limit", "has_more"):
            assert k in j

    def test_forum_topics_pagination(self, session, super_headers):
        r = session.get(f"{API}/admin/forum/topics?page=1&limit=5", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("items", "count", "total", "page", "limit", "has_more"):
            assert k in j

    def test_activity_pagination(self, session, super_headers):
        r = session.get(f"{API}/admin/activity?page=1&limit=5", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("items", "count", "total", "page", "limit", "has_more"):
            assert k in j


# ------------------------------------------------------------
# Global search
# ------------------------------------------------------------
class TestSearch:
    def test_search_finds_maria(self, session, super_headers):
        r = session.get(f"{API}/admin/search?q=maria", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["query"] == "maria"
        assert "results" in j
        types = {x["type"] for x in j["results"]}
        assert "user" in types, f"expected type=user in results, got: {j['results']}"

    def test_search_short_query_returns_empty(self, session, super_headers):
        r = session.get(f"{API}/admin/search?q=x", headers=super_headers)
        assert r.status_code == 200
        j = r.json()
        assert j["results"] == []

    def test_search_two_chars_returns_results(self, session, super_headers):
        r = session.get(f"{API}/admin/search?q=ma", headers=super_headers)
        assert r.status_code == 200
        j = r.json()
        assert isinstance(j["results"], list)

    def test_search_forbidden_for_no_admin(self, session):
        probe = _register_probe(session, "search")
        r = session.get(f"{API}/admin/search?q=maria",
                        headers={"Authorization": f"Bearer {probe['token']}"})
        assert r.status_code == 403


# ------------------------------------------------------------
# Detail endpoints
# ------------------------------------------------------------
class TestDetailEndpoints:
    def test_agent_detail_404(self, session, super_headers):
        r = session.get(f"{API}/admin/agents/nonexistent-uid-xyz", headers=super_headers)
        assert r.status_code == 404

    def test_forum_topic_detail_404(self, session, super_headers):
        r = session.get(f"{API}/admin/forum/topics/nonexistent-tid-xyz", headers=super_headers)
        assert r.status_code == 404

    def test_forum_topic_detail_ok(self, session, super_headers):
        # Grab one existing topic
        r = session.get(f"{API}/admin/forum/topics?limit=1", headers=super_headers)
        assert r.status_code == 200
        items = r.json()["items"]
        if not items:
            pytest.skip("No topics in DB")
        tid = items[0]["id"]
        r2 = session.get(f"{API}/admin/forum/topics/{tid}", headers=super_headers)
        assert r2.status_code == 200
        j = r2.json()
        for k in ("topic", "replies", "history"):
            assert k in j
        assert j["topic"]["id"] == tid


# ------------------------------------------------------------
# RBAC Custom Roles
# ------------------------------------------------------------
class TestCustomRoles:
    def test_list_all_roles_includes_system(self, session, super_headers):
        r = session.get(f"{API}/admin/rbac/roles/all", headers=super_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        roles = j["roles"]
        keys = {x["key"] for x in roles}
        for expected in ("superadmin", "admin", "moderator", "content_editor"):
            assert expected in keys, f"missing system role {expected}"
        # System flag correct
        for r_ in roles:
            if r_["key"] in ("superadmin", "admin", "moderator", "content_editor"):
                assert r_["system"] is True, f"{r_['key']} should be system"
            assert "permissions_count" in r_
            assert "label" in r_

    def test_create_custom_role(self, session, super_headers):
        key = f"test_custom_{uuid.uuid4().hex[:6]}"
        payload = {
            "key": key,
            "label": "TEST Custom Role",
            "description": "Rol de prueba automatizada",
            "permissions": ["users.view", "users.suspend"],
        }
        r = session.post(f"{API}/admin/rbac/roles", json=payload, headers=super_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["key"] == key
        assert d["system"] is False
        assert set(d["permissions"]) == {"users.view", "users.suspend"}
        STATE["custom_role_key"] = key

        # Appears in listing
        r2 = session.get(f"{API}/admin/rbac/roles/all", headers=super_headers)
        listed = next((x for x in r2.json()["roles"] if x["key"] == key), None)
        assert listed is not None
        assert listed["system"] is False

    def test_update_system_role_forbidden(self, session, super_headers):
        r = session.put(f"{API}/admin/rbac/roles/moderator",
                        json={"key": "moderator", "label": "hack", "permissions": []},
                        headers=super_headers)
        assert r.status_code == 400
        r2 = session.delete(f"{API}/admin/rbac/roles/superadmin", headers=super_headers)
        assert r2.status_code == 400

    def test_assign_custom_role_and_snapshot(self, session, super_headers):
        key = STATE["custom_role_key"]
        probe = _register_probe(session, "customrole")
        STATE["role_probe_id"] = probe["id"]
        STATE["role_probe_token"] = probe["token"]

        # Assign custom role
        r = session.put(f"{API}/admin/users/{probe['id']}/role",
                        json={"role": key}, headers=super_headers)
        assert r.status_code == 200, r.text

        # Verify user's /admin/me returns exactly those permissions
        r2 = session.get(f"{API}/admin/me",
                         headers={"Authorization": f"Bearer {probe['token']}"})
        assert r2.status_code == 200, r2.text
        j = r2.json()
        assert j["admin_role"] == key
        assert set(j["permissions"]) == {"users.view", "users.suspend"}

    def test_update_custom_role_resyncs_users(self, session, super_headers):
        key = STATE["custom_role_key"]
        # Update permissions
        payload = {
            "key": key, "label": "TEST Custom Role Updated",
            "description": "updated",
            "permissions": ["users.view", "agents.view", "forum.view"],
        }
        r = session.put(f"{API}/admin/rbac/roles/{key}", json=payload, headers=super_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["users_synced"] >= 1, f"expected users_synced >= 1, got {d}"

        # Verify probe's permissions changed
        r2 = session.get(f"{API}/admin/me",
                         headers={"Authorization": f"Bearer {STATE['role_probe_token']}"})
        j = r2.json()
        assert set(j["permissions"]) == {"users.view", "agents.view", "forum.view"}

    def test_delete_custom_role_with_users_fails(self, session, super_headers):
        key = STATE["custom_role_key"]
        r = session.delete(f"{API}/admin/rbac/roles/{key}", headers=super_headers)
        assert r.status_code == 400, r.text
        assert "usuarios" in r.json().get("detail", "").lower() or "reasigna" in r.json().get("detail", "").lower()

    def test_delete_custom_role_success_after_unassign(self, session, super_headers):
        key = STATE["custom_role_key"]
        # Remove role from probe
        r = session.put(f"{API}/admin/users/{STATE['role_probe_id']}/role",
                        json={"role": None}, headers=super_headers)
        assert r.status_code == 200
        # Now delete
        r2 = session.delete(f"{API}/admin/rbac/roles/{key}", headers=super_headers)
        assert r2.status_code == 200, r2.text
        assert r2.json()["ok"] is True


# ------------------------------------------------------------
# User permission overrides
# ------------------------------------------------------------
class TestPermissionOverrides:
    def test_set_override(self, session, super_headers):
        probe = _register_probe(session, "override")
        STATE["override_probe_id"] = probe["id"]
        STATE["override_probe_token"] = probe["token"]

        # Give the probe a base role first (moderator) so admin_role is set
        r = session.put(f"{API}/admin/users/{probe['id']}/role",
                        json={"role": "moderator"}, headers=super_headers)
        assert r.status_code == 200

        # Now override permissions to just users.view
        r2 = session.put(f"{API}/admin/users/{probe['id']}/permissions",
                         json={"permissions": ["users.view"]}, headers=super_headers)
        assert r2.status_code == 200

        # Verify /admin/me returns exactly ["users.view"]
        r3 = session.get(f"{API}/admin/me",
                         headers={"Authorization": f"Bearer {probe['token']}"})
        assert r3.status_code == 200
        assert r3.json()["permissions"] == ["users.view"]

    def test_clear_override_restores_role(self, session, super_headers):
        pid = STATE["override_probe_id"]
        token = STATE["override_probe_token"]
        r = session.put(f"{API}/admin/users/{pid}/permissions",
                        json={"permissions": None}, headers=super_headers)
        assert r.status_code == 200
        assert r.json()["cleared"] is True

        # Now /admin/me should return moderator permissions (more than 1)
        r2 = session.get(f"{API}/admin/me",
                         headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        perms = set(r2.json()["permissions"])
        assert "users.view" in perms
        assert "forum.view" in perms
        assert len(perms) > 5

        # Cleanup: revert role
        session.put(f"{API}/admin/users/{pid}/role",
                    json={"role": None}, headers=super_headers)


# ------------------------------------------------------------
# Session invalidation on suspend/block
# ------------------------------------------------------------
class TestSessionInvalidation:
    def test_suspended_token_rejected(self, session, super_headers):
        probe = _register_probe(session, "suspend")
        pid, token = probe["id"], probe["token"]

        # Baseline: token works
        r0 = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r0.status_code == 200

        # Suspend the probe
        r1 = session.put(f"{API}/admin/users/{pid}/status",
                        json={"status": "suspended", "reason": "TEST"},
                        headers=super_headers)
        assert r1.status_code == 200

        # Existing token should now be 403 with detail 'Cuenta suspendida'
        r2 = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 403, r2.text
        assert "suspend" in r2.json().get("detail", "").lower()

        # Reactivate: token should work again
        r3 = session.put(f"{API}/admin/users/{pid}/status",
                        json={"status": "active"}, headers=super_headers)
        assert r3.status_code == 200

        r4 = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r4.status_code == 200

    def test_blocked_token_rejected(self, session, super_headers):
        probe = _register_probe(session, "block")
        pid, token = probe["id"], probe["token"]

        r1 = session.put(f"{API}/admin/users/{pid}/status",
                        json={"status": "blocked"}, headers=super_headers)
        assert r1.status_code == 200

        r2 = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 403, r2.text
        assert "bloque" in r2.json().get("detail", "").lower()

        # Cleanup
        session.put(f"{API}/admin/users/{pid}/status",
                   json={"status": "active"}, headers=super_headers)
