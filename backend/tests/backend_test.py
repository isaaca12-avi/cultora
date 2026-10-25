"""
Cultora backend E2E tests via public URL.
Covers: health, auth (register/login/me), profile, goals catalog, diagnostic flow,
plan generation (LLM), plans, task tracking, knowledge base, dashboard summary.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://diagnostico-arte.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Shared test state
STATE = {}


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_user(session):
    """Create a unique test user for this run."""
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    password = "cultora123"
    name = "TEST Maria"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    STATE["token"] = data["token"]
    STATE["user"] = data["user"]
    STATE["email"] = email
    STATE["password"] = password
    return data


@pytest.fixture(scope="session")
def auth_headers(test_user):
    return {"Authorization": f"Bearer {test_user['token']}", "Content-Type": "application/json"}


# --------------------------------------------------------------------
# Health
# --------------------------------------------------------------------
class TestHealth:
    def test_health(self, session):
        r = session.get(f"{API}/health")
        assert r.status_code == 200
        j = r.json()
        assert j["status"] == "ok"
        assert j["service"] == "cultora"


# --------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------
class TestAuth:
    def test_register(self, test_user):
        assert "token" in test_user
        assert isinstance(test_user["token"], str) and len(test_user["token"]) > 20
        u = test_user["user"]
        assert u["email"] == STATE["email"]
        assert u["name"] == "TEST Maria"
        assert u["profile_complete"] is False
        assert "id" in u

    def test_register_duplicate(self, session):
        r = session.post(f"{API}/auth/register", json={
            "email": STATE["email"], "password": "cultora123", "name": "dup"
        })
        assert r.status_code == 409

    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": STATE["email"], "password": STATE["password"]})
        assert r.status_code == 200
        j = r.json()
        assert j["user"]["email"] == STATE["email"]
        assert "token" in j

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": STATE["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        j = r.json()
        assert j["email"] == STATE["email"]


# --------------------------------------------------------------------
# Profile
# --------------------------------------------------------------------
class TestProfile:
    def test_put_profile(self, session, auth_headers):
        payload = {
            "agent_type": "artista",
            "discipline": "musica",
            "stage": "inicio",
            "territory": "Buenos Aires",
            "team_size": "2-5",
            "monthly_income": "0-500",
            "audience_base": "pequeña",
            "formalized": "informal",
            "bio": "TEST proyecto musical independiente",
        }
        r = session.put(f"{API}/profile", json=payload, headers=auth_headers)
        assert r.status_code == 200
        j = r.json()
        assert j["profile_complete"] is True

    def test_get_profile(self, session, auth_headers):
        r = session.get(f"{API}/profile", headers=auth_headers)
        assert r.status_code == 200
        j = r.json()
        assert j["agent_type"] == "artista"
        assert j["discipline"] == "musica"
        assert j["stage"] == "inicio"
        assert j["territory"] == "Buenos Aires"


# --------------------------------------------------------------------
# Goals catalog
# --------------------------------------------------------------------
class TestGoals:
    def test_catalog(self, session):
        r = session.get(f"{API}/goals/catalog")
        assert r.status_code == 200
        j = r.json()
        keys = {g["key"] for g in j}
        expected = {"vender_entradas", "financiamiento", "sostenibilidad", "publicos", "organizacion_interna", "espacio_cultural"}
        assert expected.issubset(keys)
        assert len(j) >= 6


# --------------------------------------------------------------------
# Diagnostic flow + Plan generation (LLM)
# --------------------------------------------------------------------
class TestDiagnosticAndPlan:
    def test_start_diagnostic(self, session, auth_headers):
        r = session.post(f"{API}/diagnostic/start", json={
            "goal_key": "vender_entradas",
            "goal_text": "TEST Quiero llenar mi próximo concierto en 3 semanas"
        }, headers=auth_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["status"] == "in_progress"
        assert j["current_index"] == 0
        assert len(j["questions"]) == 6
        STATE["session_id"] = j["id"]

    def test_answer_questions(self, session, auth_headers):
        sid = STATE["session_id"]
        answers = [
            "Concierto de música indie, sala de 200 personas, entrada a $15",
            "Estamos vendiendo aprox 40% del aforo hasta ahora",
            "Solo Instagram. No he probado otros canales",
            "No lo conozco muy bien, jóvenes entre 20 y 35 supongo",
            "Tengo 2 semanas hasta el concierto",
            "El principal obstáculo es que no llega la información a suficiente gente",
        ]
        for i, ans in enumerate(answers):
            r = session.post(f"{API}/diagnostic/sessions/{sid}/answer",
                             json={"answer": ans}, headers=auth_headers)
            assert r.status_code == 200, f"answer {i} failed: {r.text}"
            j = r.json()
            expected_idx = i + 1
            assert j["current_index"] == expected_idx
        # Now should be ready_for_plan
        assert j["status"] == "ready_for_plan"

    def test_generate_plan(self, session, auth_headers):
        sid = STATE["session_id"]
        r = session.post(f"{API}/diagnostic/sessions/{sid}/generate-plan",
                         json={}, headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        plan = r.json()
        STATE["plan_id"] = plan["id"]

        # Structure checks
        for k in ("situacion_actual", "lectura_estrategica", "causas", "prioridades", "action_items", "indicators"):
            assert k in plan, f"missing key {k}"

        # LLM must produce non-empty narrative
        assert plan["situacion_actual"].strip() != ""
        assert plan["lectura_estrategica"].strip() != ""

        # Action items >= 5
        assert len(plan["action_items"]) >= 5

        # Rules should detect at least one cause: Instagram-only + 40% aforo => 2 rules trigger
        assert len(plan["causas"]) >= 1

        # Prioridades non-empty
        assert len(plan["prioridades"]) >= 1

        # LLM call actually happened: narrative should not equal generic fallback text
        generic_fallback = "Diagnóstico completado. Se analizaron las respuestas y el perfil del agente cultural."
        # This is a soft assertion — if this fails, LLM fell back
        if plan["situacion_actual"].strip() == generic_fallback:
            pytest.fail(f"LLM appears to have fallen back to generic text: {plan['situacion_actual']}")

    def test_session_status_after_plan(self, session, auth_headers):
        sid = STATE["session_id"]
        r = session.get(f"{API}/diagnostic/sessions/{sid}", headers=auth_headers)
        assert r.status_code == 200
        s = r.json()
        assert s["status"] == "plan_generated"
        assert s["plan_id"] == STATE["plan_id"]


# --------------------------------------------------------------------
# Plans + Task tracking
# --------------------------------------------------------------------
class TestPlansAndTasks:
    def test_list_plans(self, session, auth_headers):
        r = session.get(f"{API}/plans", headers=auth_headers)
        assert r.status_code == 200
        plans = r.json()
        assert any(p["id"] == STATE["plan_id"] for p in plans)

    def test_get_plan(self, session, auth_headers):
        r = session.get(f"{API}/plans/{STATE['plan_id']}", headers=auth_headers)
        assert r.status_code == 200
        p = r.json()
        assert p["id"] == STATE["plan_id"]
        assert len(p["action_items"]) >= 5
        STATE["item_id"] = p["action_items"][0]["id"]

    def test_update_item_in_progress(self, session, auth_headers):
        r = session.put(
            f"{API}/plans/{STATE['plan_id']}/items/{STATE['item_id']}",
            json={"status": "in_progress", "note": "TEST arrancando"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        p = r.json()
        item = next(i for i in p["action_items"] if i["id"] == STATE["item_id"])
        assert item["status"] == "in_progress"
        assert item["note"] == "TEST arrancando"

    def test_update_item_done(self, session, auth_headers):
        r = session.put(
            f"{API}/plans/{STATE['plan_id']}/items/{STATE['item_id']}",
            json={"status": "done", "note": "TEST hecho"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        p = r.json()
        item = next(i for i in p["action_items"] if i["id"] == STATE["item_id"])
        assert item["status"] == "done"


# --------------------------------------------------------------------
# Knowledge base
# --------------------------------------------------------------------
class TestKnowledge:
    def test_list_docs(self, session):
        r = session.get(f"{API}/knowledge/documents")
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) == 10

    def test_list_by_category(self, session):
        r = session.get(f"{API}/knowledge/documents", params={"category": "financiamiento"})
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        assert all(d["category"] == "financiamiento" for d in docs)

    def test_get_doc(self, session):
        r = session.get(f"{API}/knowledge/documents/kb-001")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "kb-001"
        assert "content" in d and len(d["content"]) > 50

    def test_get_doc_404(self, session):
        r = session.get(f"{API}/knowledge/documents/kb-does-not-exist")
        assert r.status_code == 404


# --------------------------------------------------------------------
# Dashboard summary
# --------------------------------------------------------------------
class TestDashboard:
    def test_summary(self, session, auth_headers):
        r = session.get(f"{API}/dashboard/summary", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("sessions_count", "plans_count", "tasks_total", "tasks_done",
                  "tasks_in_progress", "tasks_pending", "completion_rate", "upcoming", "recent_plans"):
            assert k in d
        assert d["sessions_count"] >= 1
        assert d["plans_count"] >= 1
        assert d["tasks_done"] >= 1
        assert 0.0 <= d["completion_rate"] <= 1.0
