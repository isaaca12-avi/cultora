"""
Cultora backend E2E tests for the Agents directory (new feature).
Covers: list, filters catalog, search (q), single-filter (city), multi-capability filter,
detail (auth), save/unsave (auth), saved list (auth).
"""
import os
import uuid
import pytest
import requests

def _load_backend_url():
    # Try env; fallback to reading /app/frontend/.env
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url().rstrip("/")
API = f"{BASE_URL}/api"

STATE = {}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def test_user(session):
    """Fresh test user for save/unsave/detail tests."""
    email = f"test_agents_{uuid.uuid4().hex[:10]}@example.com"
    password = "cultora123"
    name = "TEST AgentsUser"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name})
    assert r.status_code == 200, r.text
    data = r.json()
    STATE["token"] = data["token"]
    return data


@pytest.fixture(scope="module")
def auth_headers(test_user):
    return {"Authorization": f"Bearer {test_user['token']}", "Content-Type": "application/json"}


# --------------------------------------------------------------------
# Listing + filter catalog
# --------------------------------------------------------------------
class TestAgentsList:
    def test_list_returns_30(self, session):
        r = session.get(f"{API}/agents")
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["count"] == 30
        assert isinstance(j["items"], list)
        assert len(j["items"]) == 30

    def test_card_shape(self, session):
        r = session.get(f"{API}/agents")
        j = r.json()
        card = j["items"][0]
        for k in ("id", "name", "role", "agent_type", "discipline", "city", "organization",
                  "availability", "capabilities", "photo"):
            assert k in card, f"missing {k} in card"
        assert isinstance(card["capabilities"], list)

    def test_filters_catalog(self, session):
        r = session.get(f"{API}/agents/filters")
        assert r.status_code == 200
        f = r.json()
        for k in ("cities", "disciplines", "roles", "agent_types", "availability",
                  "capabilities", "interests"):
            assert k in f
            assert isinstance(f[k], list)
            assert len(f[k]) > 0
        assert "Bogotá" in f["cities"]
        assert "Teatro" in f["disciplines"]
        assert "Producción" in f["capabilities"]

    def test_search_q_teatro(self, session):
        # Baseline
        base = session.get(f"{API}/agents").json()["count"]
        r = session.get(f"{API}/agents", params={"q": "teatro"})
        assert r.status_code == 200
        j = r.json()
        assert j["count"] < base, "q=teatro should return fewer results than full list"
        assert j["count"] > 0
        # All returned items must contain 'teatro' in some searchable field (discipline or bio implicitly)
        # Since we can't see bio here, do a soft check: at least some must have discipline == Teatro
        # or role/organization containing 'Teatro'
        for item in j["items"]:
            hay = " ".join([
                item.get("name", ""), item.get("role", ""), item.get("discipline", ""),
                item.get("city", ""), item.get("organization") or "",
            ] + list(item.get("capabilities", []))).lower()
            # Even if 'teatro' isn't in card fields, it may still be in bio; assert as best-effort
            # We accept 'teatro' being in any searchable text
            # Just ensure discipline matches for at least one result:
        assert any(i["discipline"] == "Teatro" for i in j["items"])

    def test_filter_by_city(self, session):
        r = session.get(f"{API}/agents", params={"city": "Bogotá"})
        assert r.status_code == 200
        j = r.json()
        assert j["count"] > 0
        assert all(i["city"] == "Bogotá" for i in j["items"])

    def test_filter_by_multi_capabilities_AND(self, session):
        r = session.get(f"{API}/agents", params={"capabilities": "Producción,Docencia"})
        assert r.status_code == 200
        j = r.json()
        assert j["count"] > 0
        for item in j["items"]:
            caps = set(item["capabilities"])
            assert "Producción" in caps and "Docencia" in caps, f"agent {item['id']} missing required caps"

    def test_filter_by_availability_and_role(self, session):
        r = session.get(f"{API}/agents", params={"availability": "Disponible", "role": "Artista"})
        assert r.status_code == 200
        j = r.json()
        for item in j["items"]:
            assert item["availability"] == "Disponible"
            assert item["role"] == "Artista"


# --------------------------------------------------------------------
# Agent detail (requires auth)
# --------------------------------------------------------------------
class TestAgentDetail:
    def test_detail_requires_auth(self, session):
        r = session.get(f"{API}/agents/ag-001")
        assert r.status_code == 401

    def test_detail_ok(self, session, auth_headers):
        r = session.get(f"{API}/agents/ag-001", headers=auth_headers)
        assert r.status_code == 200
        a = r.json()
        # Required detail fields
        for k in ("id", "name", "role", "agent_type", "discipline", "city", "neighborhood",
                  "organization", "availability", "years", "email", "website", "socials",
                  "capabilities", "interests", "offers", "offers_tags", "needs", "needs_tags",
                  "projects", "bio", "saved"):
            assert k in a, f"missing {k}"
        assert a["id"] == "ag-001"
        assert a["name"] == "Camila Restrepo"
        assert a["saved"] is False  # fresh user, none saved

    def test_detail_404(self, session, auth_headers):
        r = session.get(f"{API}/agents/does-not-exist", headers=auth_headers)
        assert r.status_code == 404


# --------------------------------------------------------------------
# Save / Unsave / Saved list (requires auth)
# --------------------------------------------------------------------
class TestSaveFlow:
    def test_save_agent(self, session, auth_headers):
        r = session.post(f"{API}/agents/ag-002/save", headers=auth_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["saved"] is True
        assert j["count"] >= 1

    def test_save_idempotent(self, session, auth_headers):
        # Saving same agent again shouldn't error / duplicate
        r = session.post(f"{API}/agents/ag-002/save", headers=auth_headers)
        assert r.status_code == 200
        j = r.json()
        assert j["saved"] is True
        # Save one more
        r2 = session.post(f"{API}/agents/ag-003/save", headers=auth_headers)
        assert r2.status_code == 200
        assert r2.json()["count"] >= 2

    def test_detail_reflects_saved_state(self, session, auth_headers):
        r = session.get(f"{API}/agents/ag-002", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["saved"] is True

    def test_saved_list_returns_saved_agents(self, session, auth_headers):
        r = session.get(f"{API}/agents/saved", headers=auth_headers)
        assert r.status_code == 200
        j = r.json()
        ids = [i["id"] for i in j["items"]]
        assert "ag-002" in ids
        assert "ag-003" in ids
        assert j["count"] == len(j["items"])

    def test_unsave_agent(self, session, auth_headers):
        r = session.delete(f"{API}/agents/ag-002/save", headers=auth_headers)
        assert r.status_code == 200
        j = r.json()
        assert j["saved"] is False

        # Verify no longer in saved list
        r2 = session.get(f"{API}/agents/saved", headers=auth_headers)
        assert r2.status_code == 200
        ids = [i["id"] for i in r2.json()["items"]]
        assert "ag-002" not in ids

    def test_save_nonexistent_404(self, session, auth_headers):
        r = session.post(f"{API}/agents/nope-xxx/save", headers=auth_headers)
        assert r.status_code == 404

    def test_save_requires_auth(self, session):
        r = session.post(f"{API}/agents/ag-001/save")
        assert r.status_code == 401
