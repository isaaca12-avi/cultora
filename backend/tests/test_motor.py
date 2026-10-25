"""
Cultora backend E2E tests for MOTOR DE DECISIÓN (iteration 7).
Covers: KB stats/list/create/search/authorize/delete, rules CRUD + system→custom
migration, questions, simulate (with & without LLM), RAG in real diagnostic flow,
and RBAC (no-admin → 403, content_editor → limited).
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

MARIA_EMAIL = "maria@example.com"
MARIA_PASSWORD = "cultora123"


# -------------------------- Fixtures --------------------------

@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def maria_token(session):
    r = session.post(f"{API}/auth/login",
                     json={"email": MARIA_EMAIL, "password": MARIA_PASSWORD})
    assert r.status_code == 200, f"Login maria failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def maria_headers(maria_token):
    return {"Authorization": f"Bearer {maria_token}", "Content-Type": "application/json"}


def _register(session, prefix):
    email = f"TEST_motor_{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register",
                     json={"email": email, "password": "cultora123", "name": f"TEST {prefix}"})
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="session")
def newbie(session):
    """A brand-new user with no admin role → 403 on admin endpoints."""
    t, u = _register(session, "newbie")
    return {"token": t, "user": u,
            "headers": {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}}


@pytest.fixture(scope="session")
def editor(session, maria_headers):
    """A newly-registered user promoted to content_editor via maria."""
    t, u = _register(session, "editor")
    # maria promotes them
    r = requests.put(
        f"{API}/admin/users/{u['id']}/role",
        json={"role": "content_editor"},
        headers=maria_headers,
    )
    assert r.status_code == 200, f"Promote to content_editor failed: {r.status_code} {r.text}"
    return {"token": t, "user": u,
            "headers": {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}}


STATE = {}


# -------------------------- KB Stats --------------------------

class TestKBStats:
    def test_stats_baseline(self, session, maria_headers):
        r = session.get(f"{API}/admin/motor/kb/stats", headers=maria_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("documents_total", "documents_published", "documents_authoritative",
                  "chunks_indexed", "by_goal"):
            assert k in j, f"missing key {k} in stats"
        assert j["documents_total"] >= 10, f"expected >=10 seeded docs, got {j['documents_total']}"
        assert j["documents_published"] >= 1
        assert isinstance(j["by_goal"], dict)
        # store for downstream comparison
        STATE["initial_total"] = j["documents_total"]
        STATE["initial_chunks"] = j["chunks_indexed"]


# -------------------------- KB List --------------------------

class TestKBList:
    def test_list_pagination(self, session, maria_headers):
        r = session.get(f"{API}/admin/motor/kb/documents?page=1&limit=5", headers=maria_headers)
        assert r.status_code == 200
        j = r.json()
        for k in ("items", "total", "page", "has_more"):
            assert k in j
        assert j["page"] == 1
        assert len(j["items"]) <= 5
        assert j["total"] >= 10
        it = j["items"][0]
        for k in ("title", "kind", "goal_keys", "chunks_count", "status", "is_authoritative"):
            assert k in it, f"missing {k} in item"


# -------------------------- KB Create + Search --------------------------

class TestKBCreateAndSearch:
    def test_create_document(self, session, maria_headers):
        payload = {
            "title": "TEST Guía de diversificación de ingresos culturales",
            "content": (
                "La diversificación de ingresos es la estrategia central para la sostenibilidad "
                "de cualquier proyecto cultural. Un modelo sano combina taquilla, servicios, "
                "convocatorias públicas, alianzas privadas y donaciones. La regla práctica es "
                "no depender más de un 40% de una sola fuente.\n\n"
                "Pasos concretos para diversificar ingresos: 1) mapear todas las fuentes actuales, "
                "2) identificar 2-3 fuentes nuevas viables con el perfil del proyecto, "
                "3) diseñar un flujo de caja a 6-12 meses combinando las fuentes, "
                "4) valorizar el trabajo del equipo con honorarios mínimos.\n\n"
                "Errores comunes: depender de una beca única, no cobrar por servicios de formación, "
                "y no incluir costos de personal en las propuestas."
            ),
            "kind": "guia",
            "category": "sostenibilidad",
            "goal_keys": ["sostenibilidad", "financiamiento"],
            "status": "published",
            "summary": "TEST diversificación",
        }
        r = session.post(f"{API}/admin/motor/kb/documents", json=payload, headers=maria_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == payload["title"]
        assert d["chunks_count"] >= 1
        assert "id" in d
        STATE["kb_doc_id"] = d["id"]

    def test_search_finds_new_doc(self, session, maria_headers):
        # Give the index a moment to invalidate/rebuild
        time.sleep(1.0)
        r = session.post(f"{API}/admin/motor/kb/search",
                         json={"query": "como diversificar ingresos", "top_k": 3},
                         headers=maria_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "results" in j
        assert len(j["results"]) >= 1
        first = j["results"][0]
        for k in ("score", "doc_title", "text"):
            assert k in first, f"missing {k} in search result"
        # At least one result should be about sostenibilidad / diversificar
        titles = " ".join([(x.get("doc_title") or "") for x in j["results"]]).lower()
        assert ("diversif" in titles) or ("sosten" in titles), f"unexpected titles: {titles}"


# -------------------------- KB Authorize + Delete --------------------------

class TestKBAuthorizeDelete:
    def test_authorize(self, session, maria_headers):
        did = STATE["kb_doc_id"]
        r = session.put(f"{API}/admin/motor/kb/documents/{did}/authorize",
                        json={"is_authoritative": True}, headers=maria_headers)
        assert r.status_code == 200
        # verify via GET
        g = session.get(f"{API}/admin/motor/kb/documents/{did}", headers=maria_headers)
        assert g.status_code == 200
        doc = g.json()
        assert doc["is_authoritative"] is True
        chunks = doc.get("chunks", [])
        assert len(chunks) >= 1
        assert all(c["is_authoritative"] for c in chunks), "not all chunks marked authoritative"

    def test_soft_delete(self, session, maria_headers):
        did = STATE["kb_doc_id"]
        r = session.delete(f"{API}/admin/motor/kb/documents/{did}", headers=maria_headers)
        assert r.status_code == 200
        # verify via GET single (should be findable? actually list excludes deleted)
        # The kb_list uses deleted_at filter. Direct GET does not filter, but status should be archived.
        g = session.get(f"{API}/admin/motor/kb/documents/{did}", headers=maria_headers)
        assert g.status_code == 200
        doc = g.json()
        assert doc.get("status") == "archived"
        assert doc.get("deleted_at")
        # chunks should now all be is_published=False
        chunks = doc.get("chunks", [])
        assert all(not c.get("is_published") for c in chunks), "chunks still published after delete"


# -------------------------- Rules --------------------------

class TestRules:
    def test_rules_list_all_has_system(self, session, maria_headers):
        r = session.get(f"{API}/admin/motor/rules", headers=maria_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "rules_by_goal" in j and "goals" in j
        assert "financiamiento" in j["rules_by_goal"]
        fin_rules = j["rules_by_goal"]["financiamiento"]
        assert len(fin_rules) >= 1
        # system fallback should have system:true
        assert any(rr.get("system") is True for rr in fin_rules), \
            "expected some rule to be system:true (fallback taxonomy)"

    def test_rules_create_migrates_system(self, session, maria_headers):
        # Create a custom rule for 'organizacion_interna' (unlikely to have customs already)
        payload = {
            "goal_key": "organizacion_interna",
            "cause_title": "TEST causa custom",
            "cause_detail": "TEST detalle",
            "when": {"decisiones": ["test1", "test2"]},
            "priorities": ["TEST prio 1"],
            "order": 99,
            "active": True,
        }
        r = session.post(f"{API}/admin/motor/rules", json=payload, headers=maria_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d
        STATE["rule_id"] = d["id"]
        # Now GET rules for this goal — system rules should now be migrated to custom (no system:true)
        g = session.get(f"{API}/admin/motor/rules?goal_key=organizacion_interna",
                        headers=maria_headers)
        assert g.status_code == 200
        rules = g.json()["rules"]
        # After migration, custom rules exist and none should have system:true
        assert len(rules) >= 1
        assert all(rr.get("system") is not True for rr in rules), \
            "after first custom rule, system rules should have been migrated to DB"
        assert any(rr["cause_title"] == "TEST causa custom" for rr in rules)

    def test_rules_update(self, session, maria_headers):
        rid = STATE["rule_id"]
        payload = {
            "goal_key": "organizacion_interna",
            "cause_title": "TEST causa custom actualizada",
            "cause_detail": "TEST detalle 2",
            "when": {"decisiones": ["test1"]},
            "priorities": ["TEST prio A"],
            "order": 99,
            "active": True,
        }
        r = session.put(f"{API}/admin/motor/rules/{rid}", json=payload, headers=maria_headers)
        assert r.status_code == 200, r.text
        # verify
        g = session.get(f"{API}/admin/motor/rules?goal_key=organizacion_interna",
                        headers=maria_headers)
        rules = g.json()["rules"]
        found = next((x for x in rules if x["id"] == rid), None)
        assert found is not None
        assert found["cause_title"] == "TEST causa custom actualizada"

    def test_rules_delete(self, session, maria_headers):
        rid = STATE["rule_id"]
        r = session.delete(f"{API}/admin/motor/rules/{rid}", headers=maria_headers)
        assert r.status_code == 200
        # after delete, no longer visible
        g = session.get(f"{API}/admin/motor/rules?goal_key=organizacion_interna",
                        headers=maria_headers)
        rules = g.json()["rules"]
        assert not any(x["id"] == rid for x in rules), "deleted rule still visible"


# -------------------------- Questions --------------------------

class TestQuestions:
    def test_questions_for_financiamiento(self, session, maria_headers):
        r = session.get(f"{API}/admin/motor/questions/financiamiento", headers=maria_headers)
        assert r.status_code == 200
        j = r.json()
        qs = j["questions"]
        assert len(qs) >= 3
        for q in qs:
            for k in ("id", "text"):
                assert k in q


# -------------------------- Simulate --------------------------

class TestSimulate:
    def test_simulate_no_llm(self, session, maria_headers):
        r = session.post(f"{API}/admin/motor/simulate", json={
            "goal_key": "financiamiento",
            "answers": {
                "monto": "necesito 3000 usd para producir un disco",
                "documentos": "no tengo formalización",
                "historial": "nunca postulé antes",
                "aliados": "no tengo aliados",
            },
            "include_rag": True,
            "top_k": 3,
            "run_llm": False,
        }, headers=maria_headers, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("rules_triggered", "priorities", "rag_results", "prompt_preview", "llm_plan"):
            assert k in j, f"missing {k}"
        # at least 2 rules should fire (documentos + historial + aliados)
        assert len(j["rules_triggered"]) >= 2, f"expected >=2 rules, got {len(j['rules_triggered'])}"
        # priorities deduped and non-empty
        assert len(j["priorities"]) >= 1
        assert len(j["priorities"]) == len(set(j["priorities"])), "priorities not deduped"
        # RAG results
        assert isinstance(j["rag_results"], list)
        # prompt is a string
        assert isinstance(j["prompt_preview"], str) and len(j["prompt_preview"]) > 20
        # llm_plan is null
        assert j["llm_plan"] is None

    def test_simulate_with_llm(self, session, maria_headers):
        r = session.post(f"{API}/admin/motor/simulate", json={
            "goal_key": "financiamiento",
            "answers": {
                "monto": "necesito 3000 usd",
                "documentos": "no tengo formalización",
                "historial": "nunca postulé",
            },
            "profile": {"agent_type": "artista", "discipline": "musica"},
            "include_rag": True,
            "top_k": 3,
            "run_llm": True,
        }, headers=maria_headers, timeout=60)
        assert r.status_code == 200, r.text
        j = r.json()
        # If key present and no failure, llm_plan should have expected structure
        if j.get("llm_error"):
            pytest.skip(f"LLM error (env issue): {j['llm_error']}")
        assert j["llm_plan"] is not None, "llm_plan should not be null when run_llm=True"
        plan = j["llm_plan"]
        # Accept either structured JSON or raw text fallback
        if "raw" in plan:
            pytest.fail(f"LLM returned unparsed raw: {plan['raw'][:200]}")
        for k in ("situacion_actual", "lectura_estrategica", "recomendaciones"):
            assert k in plan, f"missing {k} in llm_plan"
        assert isinstance(plan["recomendaciones"], list) and len(plan["recomendaciones"]) >= 1


# -------------------------- Real Diagnostic + RAG --------------------------

class TestDiagnosticRAG:
    def test_full_flow(self, session, maria_headers):
        # Use maria (already superadmin, has profile)
        # Start a new diagnostic session
        r = session.post(f"{API}/diagnostic/start",
                         json={"goal_key": "financiamiento",
                               "goal_text": "TEST necesito financiamiento para mi disco"},
                         headers=maria_headers)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        answers = [
            "TEST necesito 3000 usd para producir un disco",
            "TEST en 3 meses",
            "TEST nunca postulé antes",
            "TEST no tengo formalización",
            "TEST no tengo aliados",
            "TEST solo ingresos de shows en vivo",
        ]
        for a in answers:
            rr = session.post(f"{API}/diagnostic/sessions/{sid}/answer",
                              json={"answer": a}, headers=maria_headers)
            assert rr.status_code == 200, rr.text
        # Generate plan
        rp = session.post(f"{API}/diagnostic/sessions/{sid}/generate-plan",
                          json={}, headers=maria_headers, timeout=120)
        assert rp.status_code == 200, rp.text
        plan = rp.json()
        # Must not fail — narrative present
        assert plan["situacion_actual"].strip() != ""
        assert plan["lectura_estrategica"].strip() != ""


# -------------------------- RBAC --------------------------

class TestRBAC:
    def test_newbie_forbidden(self, session, newbie):
        r = session.get(f"{API}/admin/motor/kb/documents", headers=newbie["headers"])
        assert r.status_code == 403, f"expected 403 for newbie, got {r.status_code}"

    def test_editor_can_view_kb(self, session, editor):
        r = session.get(f"{API}/admin/motor/kb/documents", headers=editor["headers"])
        assert r.status_code == 200, r.text

    def test_editor_can_create_kb(self, session, editor):
        payload = {
            "title": f"TEST editor doc {uuid.uuid4().hex[:6]}",
            "content": "Contenido de prueba del editor de contenido. " * 20,
            "kind": "guia",
            "goal_keys": ["publicos"],
            "status": "draft",
        }
        r = session.post(f"{API}/admin/motor/kb/documents", json=payload, headers=editor["headers"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d
        STATE["editor_doc_id"] = d["id"]

    def test_editor_can_edit_kb(self, session, editor):
        did = STATE["editor_doc_id"]
        payload = {
            "title": f"TEST editor doc EDITED {uuid.uuid4().hex[:6]}",
            "content": "Nuevo contenido reindexado.",
            "kind": "guia",
            "goal_keys": ["publicos"],
            "status": "draft",
        }
        r = session.put(f"{API}/admin/motor/kb/documents/{did}", json=payload, headers=editor["headers"])
        assert r.status_code == 200, r.text

    def test_editor_cannot_edit_rules(self, session, editor):
        payload = {
            "goal_key": "publicos",
            "cause_title": "TEST editor rule",
            "cause_detail": "",
            "when": {"canales": ["test"]},
            "priorities": ["x"],
        }
        r = session.post(f"{API}/admin/motor/rules", json=payload, headers=editor["headers"])
        assert r.status_code == 403, f"expected 403 for editor on rules, got {r.status_code}"

    def test_newbie_cannot_simulate(self, session, newbie):
        r = session.post(f"{API}/admin/motor/simulate",
                         json={"goal_key": "financiamiento", "answers": {}},
                         headers=newbie["headers"])
        assert r.status_code == 403


# -------------------------- Teardown --------------------------

@pytest.fixture(scope="session", autouse=True)
def _cleanup(request, session, maria_headers):
    yield
    # Best-effort: soft-delete TEST docs created
    for k in ("kb_doc_id", "editor_doc_id"):
        did = STATE.get(k)
        if did:
            try:
                session.delete(f"{API}/admin/motor/kb/documents/{did}", headers=maria_headers)
            except Exception:
                pass
