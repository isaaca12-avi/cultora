"""
Cultora — Plataforma inteligente de gestión cultural.
Backend FastAPI + MongoDB + Emergent LLM (GPT-5.2).
"""
import os
import uuid
import json
import re
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Any, Dict

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import jwt
import bcrypt

from emergentintegrations.llm.chat import LlmChat, UserMessage

from taxonomy import (
    GOAL_CATALOG,
    DIAGNOSTIC_QUESTIONS,
    DECISION_RULES,
    KNOWLEDGE_SEED,
    PLAN_TEMPLATES,
)
from agents_seed import AGENTS_SEED, get_agent, filter_options
from forum_seed import FORUM_SEED, FORUM_CATEGORIES, KINDS as FORUM_KINDS
from convocatorias_seed import CONVOCATORIAS_SEED, get_convocatoria, convocatorias_filter_options
from admin_router import build_admin_router
from admin_seed import run_admin_seed
from admin_bootstrap import run_admin_bootstrap, BootstrapConfigError
from rag import search as kb_search, format_context_block
from security_lib import (
    validate_jwt_secret_or_die,
    admin_password_policy,
    user_password_policy,
    PasswordPolicyError,
    rate_limiter,
    rl_key,
    bump_session_version,
    INITIAL_SESSION_VERSION,
    anonymize_ip,
    summarize_user_agent,
)

# --------------------------------------------------------------------
# Setup
# --------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
CULTORA_ENV = os.environ.get("CULTORA_ENV", "development").strip().lower()
JWT_SECRET = os.environ.get("JWT_SECRET", "").strip()
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "24"))
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LLM_MODEL = "gpt-5.2"
LLM_PROVIDER = "openai"

# Aborta el arranque si el secreto es débil en entornos production/staging.
validate_jwt_secret_or_die(JWT_SECRET, CULTORA_ENV)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Cultora API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("cultora")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# --------------------------------------------------------------------
# Models
# --------------------------------------------------------------------
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    created_at: str
    profile_complete: bool = False
    admin_role: Optional[str] = None
    is_admin: bool = False
    must_change_password: bool = False


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    token: str
    user: UserPublic


class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    agent_type: Optional[str] = None       # artista, colectivo, compañía, espacio, organización
    discipline: Optional[str] = None       # música, artes escénicas, visuales, literatura, audiovisual, gestión, otro
    stage: Optional[str] = None            # idea, inicio, consolidación, madurez
    territory: Optional[str] = None        # ciudad / país
    team_size: Optional[str] = None        # solo, 2-5, 6-15, 15+
    monthly_income: Optional[str] = None   # sin ingresos, 0-500, 500-2000, 2000-8000, 8000+
    audience_base: Optional[str] = None    # ninguna, pequeña, media, grande
    channels: List[str] = Field(default_factory=list)  # instagram, mailing, web, prensa, boca a boca
    formalized: Optional[str] = None       # informal, autónomo, ong, empresa
    bio: Optional[str] = None


class DiagnosticStartIn(BaseModel):
    goal_key: str
    goal_text: Optional[str] = None


class DiagnosticAnswerIn(BaseModel):
    answer: str


class UpdateItemIn(BaseModel):
    status: Optional[Literal["pending", "in_progress", "done"]] = None
    note: Optional[str] = None


# --------------------------------------------------------------------
# Auth helpers
# --------------------------------------------------------------------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str, session_version: int = INITIAL_SESSION_VERSION) -> str:
    payload = {
        "sub": user_id,
        "sv": int(session_version or INITIAL_SESSION_VERSION),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Dict[str, Any]:
    if not creds:
        raise HTTPException(status_code=401, detail={"code": "no_token", "message": "Falta token"})
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail={"code": "session_expired", "message": "Sesión expirada"})
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail={"code": "invalid_token", "message": "Token inválido"})
    user_id = payload.get("sub")
    token_sv = payload.get("sv")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail={"code": "invalid_token", "message": "Usuario no encontrado"})
    current_sv = int(user.get("session_version") or INITIAL_SESSION_VERSION)
    # Cualquier token sin sv o con sv < actual queda invalidado por revocación.
    if token_sv is None or int(token_sv) < current_sv:
        raise HTTPException(
            status_code=401,
            detail={"code": "session_revoked", "message": "Sesión revocada. Iniciá sesión de nuevo."},
        )
    # Session invalidation: cuentas suspendidas o bloqueadas no pueden usar la plataforma
    status_val = user.get("status", "active")
    if status_val == "blocked":
        raise HTTPException(status_code=403, detail={"code": "account_blocked", "message": "Cuenta bloqueada"})
    if status_val == "suspended":
        raise HTTPException(status_code=403, detail={"code": "account_suspended", "message": "Cuenta suspendida"})
    # Gate por must_change_password: sólo permitir un allowlist mientras esté activo.
    if user.get("must_change_password"):
        allowed_paths = {
            "/api/auth/me",
            "/api/auth/change-initial-password",
            "/api/auth/logout",
        }
        if request.url.path not in allowed_paths:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "password_change_required",
                    "message": "Debes cambiar tu contraseña inicial antes de continuar",
                },
            )
    return user


def user_to_public(u: Dict[str, Any]) -> UserPublic:
    profile = u.get("profile") or {}
    complete = bool(profile.get("agent_type") and profile.get("discipline") and profile.get("stage"))
    role = u.get("admin_role")
    return UserPublic(
        id=u["id"],
        email=u["email"],
        name=u["name"],
        created_at=u["created_at"],
        profile_complete=complete,
        admin_role=role,
        is_admin=bool(role),
        must_change_password=bool(u.get("must_change_password")),
    )


# --------------------------------------------------------------------
# LLM helper
# --------------------------------------------------------------------
def build_llm(session_id: str, system_message: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(LLM_PROVIDER, LLM_MODEL)


def _client_meta(request: Request) -> Dict[str, Optional[str]]:
    """Devuelve IP anonimizada + UA resumido para auditoría."""
    ip = None
    try:
        # Respetar X-Forwarded-For si el ingress lo popula, con verificación básica.
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            ip = fwd.split(",")[0].strip()
        elif request.client:
            ip = request.client.host
    except Exception:
        pass
    return {
        "ip": anonymize_ip(ip),
        "user_agent": summarize_user_agent(request.headers.get("user-agent")),
    }


async def _audit(action: str, *, request: Request, actor: Optional[Dict] = None,
                 target_id: Optional[str] = None, target_type: str = "user",
                 result: str = "success", meta: Optional[Dict] = None) -> None:
    """Registra un evento de seguridad. Nunca guarda passwords, tokens ni hashes."""
    meta_clean = dict(meta or {})
    for forbidden in ("password", "new_password", "current_password", "token",
                       "password_hash", "authorization", "secret"):
        meta_clean.pop(forbidden, None)
    doc = {
        "id": new_id(),
        "at": now_iso(),
        "action": action,
        "result": result,
        "actor_id": (actor or {}).get("id"),
        "actor_email": (actor or {}).get("email"),
        "actor_role": (actor or {}).get("admin_role"),
        "target_id": target_id,
        "target_type": target_type,
        "meta": {**_client_meta(request), **meta_clean},
    }
    try:
        await db.admin_activity.insert_one(doc)
    except Exception:
        pass


def _check_rate_limit(request: Request, prefix: str, *, max_events: int, window: int,
                       extra_key: Optional[str] = None) -> None:
    """Aplica rate limit por IP (+ opcional key adicional como email o user_id).
    Respeta X-Forwarded-For si viene desde el ingress, con fallback a request.client."""
    ip = None
    try:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            ip = fwd.split(",")[0].strip()
        elif request.client:
            ip = request.client.host
    except Exception:
        pass
    ip = ip or "unknown"
    key = rl_key(prefix, ip, extra_key or "")
    allowed, retry = rate_limiter.check(key, max_events=max_events, window_seconds=window)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={"code": "rate_limited", "message": "Demasiados intentos. Esperá un momento."},
            headers={"Retry-After": str(retry)},
        )


# --------------------------------------------------------------------
# Auth routes
# --------------------------------------------------------------------
@api.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn, request: Request):
    _check_rate_limit(request, "register", max_events=5, window=600, extra_key=body.email.lower())
    exists = await db.users.find_one({"email": body.email.lower()})
    if exists:
        raise HTTPException(status_code=409, detail="Email ya registrado")
    # Política de contraseña mínima para usuarios comunes
    try:
        user_password_policy(body.password)
    except PasswordPolicyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    user_doc = {
        "id": new_id(),
        "email": body.email.lower(),
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
        "profile": {},
        "session_version": INITIAL_SESSION_VERSION,
        "status": "active",
    }
    await db.users.insert_one(user_doc)
    await _audit("auth.register", request=request, actor=user_doc, target_id=user_doc["id"])
    return TokenOut(
        token=make_token(user_doc["id"], INITIAL_SESSION_VERSION),
        user=user_to_public(user_doc),
    )


@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn, request: Request):
    email = body.email.lower()
    _check_rate_limit(request, "login", max_events=10, window=300, extra_key=email)
    u = await db.users.find_one({"email": email})
    if not u or not verify_password(body.password, u["password_hash"]):
        # Registrar intento fallido sin exponer si el email existe
        await _audit("auth.login", request=request, result="failed",
                     meta={"reason": "invalid_credentials", "attempted_email": email})
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if u.get("status") == "blocked":
        await _audit("auth.login", request=request, actor=u, result="blocked",
                     meta={"reason": "account_blocked"})
        raise HTTPException(status_code=403, detail={"code": "account_blocked", "message": "Cuenta bloqueada"})
    if u.get("status") == "suspended":
        await _audit("auth.login", request=request, actor=u, result="suspended",
                     meta={"reason": "account_suspended"})
        raise HTTPException(status_code=403, detail={"code": "account_suspended", "message": "Cuenta suspendida"})
    sv = int(u.get("session_version") or INITIAL_SESSION_VERSION)
    await _audit("auth.login", request=request, actor=u, target_id=u["id"], result="success")
    return TokenOut(token=make_token(u["id"], sv), user=user_to_public(u))


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return user_to_public(user)


@api.post("/auth/logout")
async def logout(request: Request, user: dict = Depends(get_current_user)):
    """Logout del cliente actual. No revoca otros tokens (para eso está logout-all).
    Se mantiene por trazabilidad y consistencia semántica; el cliente debe borrar el token."""
    await _audit("auth.logout", request=request, actor=user, target_id=user["id"])
    return {"ok": True}


@api.post("/auth/logout-all")
async def logout_all(request: Request, user: dict = Depends(get_current_user)):
    """Invalida TODOS los JWT del usuario (bump session_version)."""
    new_sv = await bump_session_version(db, user["id"])
    await _audit("auth.logout_all", request=request, actor=user, target_id=user["id"],
                  meta={"new_session_version": new_sv})
    return {"ok": True}


class ChangeInitialPasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=200)


@api.post("/auth/change-initial-password")
async def change_initial_password(body: ChangeInitialPasswordIn, request: Request,
                                  user: dict = Depends(get_current_user)):
    _check_rate_limit(request, "change-init", max_events=5, window=300, extra_key=user["id"])
    # Sólo válido cuando la cuenta requiere cambio inicial.
    if not user.get("must_change_password"):
        raise HTTPException(
            status_code=400,
            detail="Este endpoint sólo aplica al primer inicio de sesión.",
        )
    full = await db.users.find_one({"id": user["id"]})
    if not full or not full.get("password_hash"):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not verify_password(body.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="La contraseña temporal es incorrecta")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser distinta de la temporal")
    # Política dependiente del rol: admins exigen política más estricta
    try:
        if user.get("admin_role"):
            admin_password_policy(body.new_password, forbid=[body.current_password])
        else:
            user_password_policy(body.new_password, forbid=[body.current_password])
    except PasswordPolicyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    new_hash = hash_password(body.new_password)
    # Rotar session_version → invalida cualquier token previo, incluido el de esta request.
    new_sv = int(full.get("session_version") or INITIAL_SESSION_VERSION) + 1
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "must_change_password": False,
                "password_changed_at": now_iso(),
                "session_version": new_sv,
            }
        },
    )
    # Emitir JWT nuevo con el sv actualizado.
    new_token = make_token(user["id"], new_sv)
    await _audit("password.initial_changed", request=request, actor=user, target_id=user["id"])
    return {"ok": True, "changed_at": now_iso(), "token": new_token}


# --------------------------------------------------------------------
# Profile
# --------------------------------------------------------------------
@api.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return user.get("profile") or {}


@api.put("/profile", response_model=UserPublic)
async def put_profile(body: Profile, user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile": body.model_dump()}})
    u = await db.users.find_one({"id": user["id"]})
    return user_to_public(u)


# --------------------------------------------------------------------
# Goals catalog
# --------------------------------------------------------------------
@api.get("/goals/catalog")
async def goals_catalog():
    return GOAL_CATALOG


# --------------------------------------------------------------------
# Diagnostic session
# --------------------------------------------------------------------
@api.post("/diagnostic/start")
async def diagnostic_start(body: DiagnosticStartIn, user: dict = Depends(get_current_user)):
    if body.goal_key not in DIAGNOSTIC_QUESTIONS:
        raise HTTPException(status_code=400, detail="Objetivo no soportado")

    catalog_entry = next((g for g in GOAL_CATALOG if g["key"] == body.goal_key), None)
    questions = DIAGNOSTIC_QUESTIONS[body.goal_key]
    session = {
        "id": new_id(),
        "user_id": user["id"],
        "goal_key": body.goal_key,
        "goal_title": catalog_entry["title"] if catalog_entry else body.goal_key,
        "goal_text": (body.goal_text or "").strip(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "status": "in_progress",  # in_progress | ready_for_plan | plan_generated
        "questions": questions,
        "answers": [],
        "current_index": 0,
        "plan_id": None,
    }
    await db.sessions.insert_one(session)
    return _clean_session(session)


@api.get("/diagnostic/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    docs = await db.sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api.get("/diagnostic/sessions/{session_id}")
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    s = await db.sessions.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return s


@api.post("/diagnostic/sessions/{session_id}/answer")
async def answer(session_id: str, body: DiagnosticAnswerIn, user: dict = Depends(get_current_user)):
    s = await db.sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if s["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Diagnóstico ya finalizado")

    idx = s["current_index"]
    if idx >= len(s["questions"]):
        raise HTTPException(status_code=400, detail="No hay más preguntas")

    q = s["questions"][idx]
    s["answers"].append({
        "question_id": q["id"],
        "question": q["text"],
        "answer": body.answer.strip(),
        "at": now_iso(),
    })
    s["current_index"] = idx + 1
    s["updated_at"] = now_iso()
    if s["current_index"] >= len(s["questions"]):
        s["status"] = "ready_for_plan"

    await db.sessions.replace_one({"id": session_id}, s)
    return _clean_session(s)


@api.post("/diagnostic/sessions/{session_id}/generate-plan")
async def generate_plan(session_id: str, user: dict = Depends(get_current_user)):
    s = await db.sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if s["status"] == "plan_generated" and s.get("plan_id"):
        plan = await db.plans.find_one({"id": s["plan_id"]}, {"_id": 0})
        if plan:
            return plan
    if s["status"] == "in_progress":
        raise HTTPException(status_code=400, detail="Termina el diagnóstico antes de generar el plan")

    profile = (await db.users.find_one({"id": user["id"]}) or {}).get("profile") or {}
    plan = await _build_plan(user_id=user["id"], session=s, profile=profile)
    await db.plans.insert_one(plan)
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"status": "plan_generated", "plan_id": plan["id"], "updated_at": now_iso()}},
    )
    plan.pop("_id", None)
    return plan


def _clean_session(s: Dict[str, Any]) -> Dict[str, Any]:
    s = dict(s)
    s.pop("_id", None)
    return s


# --------------------------------------------------------------------
# Decision engine + Plan builder
# --------------------------------------------------------------------
def _apply_rules(goal_key: str, answers: List[Dict[str, Any]], profile: Dict[str, Any]) -> Dict[str, Any]:
    """Apply rule-based decision engine to derive causes, priorities, and template."""
    ans_map = {a["question_id"]: a["answer"].lower() for a in answers}
    triggered_causes: List[Dict[str, str]] = []
    priorities: List[str] = []

    rules = DECISION_RULES.get(goal_key, [])
    for r in rules:
        cond = r["when"]
        match = True
        for key, keywords in cond.items():
            if key == "profile":
                val = (profile.get(keywords["field"]) or "").lower()
                if not any(k in val for k in keywords["match"]):
                    match = False
                    break
            else:
                val = ans_map.get(key, "")
                if not any(k in val for k in keywords):
                    match = False
                    break
        if match:
            triggered_causes.append({"title": r["cause_title"], "detail": r["cause_detail"]})
            priorities.extend(r.get("priorities", []))

    # Deduplicate priorities preserving order
    seen = set()
    priorities = [p for p in priorities if not (p in seen or seen.add(p))]
    return {"causes": triggered_causes, "priorities": priorities}


async def _build_plan(user_id: str, session: Dict[str, Any], profile: Dict[str, Any]) -> Dict[str, Any]:
    goal_key = session["goal_key"]
    engine = _apply_rules(goal_key, session["answers"], profile)
    template = PLAN_TEMPLATES.get(goal_key, {"tasks": [], "indicators": []})

    # Ask LLM to personalize narrative + tailor recommended actions
    context_lines = [f"- {a['question']}: {a['answer']}" for a in session["answers"]]
    profile_lines = [f"- {k}: {v}" for k, v in profile.items() if v]
    causes_lines = [f"- {c['title']}" for c in engine["causes"]] or ["- (sin causas específicas detectadas)"]
    priorities_lines = [f"- {p}" for p in engine["priorities"]] or ["- (ver plantilla base)"]

    # RAG: recuperar contexto de la biblioteca
    rag_chunks = []
    rag_block = ""
    try:
        query_text = " ".join([a.get("answer") or "" for a in session["answers"]])[:2000]
        if query_text.strip():
            rag_chunks = await kb_search(db, query_text, top_k=5, goal_key=goal_key)
            rag_block = format_context_block(rag_chunks)
    except Exception:
        rag_chunks = []
        rag_block = ""

    system_msg = (
        "Eres un consultor senior en gestión cultural. Escribes en español claro, cercano y sin jerga académica. "
        "Tu tono es directo, respetuoso y orientado a la acción. NUNCA usas emojis. "
        "Respondes SOLO con JSON válido, sin texto adicional. "
        "Si te proporcionan MATERIAL DE REFERENCIA, úsalo con prioridad y cita como '[Fuente N]' cuando corresponda."
    )
    user_prompt = f"""
Analiza este caso y devuelve un JSON con las claves exactamente:
"situacion_actual" (string, 2-3 frases),
"lectura_estrategica" (string, 3-4 frases explicando causas y contexto),
"recomendaciones" (array de 3-5 strings accionables, muy concretos, adaptados al caso).

OBJETIVO DEL USUARIO: {session['goal_title']}
Descripción libre del usuario: "{session.get('goal_text') or '(no proporcionada)'}"

PERFIL DEL AGENTE CULTURAL:
{chr(10).join(profile_lines) or '- (perfil incompleto)'}

RESPUESTAS DEL DIAGNÓSTICO:
{chr(10).join(context_lines)}

CAUSAS DETECTADAS POR EL MOTOR DE REGLAS:
{chr(10).join(causes_lines)}

PRIORIDADES ESTRATÉGICAS SUGERIDAS:
{chr(10).join(priorities_lines)}

{rag_block}

Recuerda: responde ÚNICAMENTE con JSON, sin ```json ni ningún envoltorio.
""".strip()

    narrative = {
        "situacion_actual": "Diagnóstico completado. Se analizaron las respuestas y el perfil del agente cultural.",
        "lectura_estrategica": "Se identificaron áreas de trabajo prioritarias en base al motor de decisión especializado.",
        "recomendaciones": [t["title"] for t in template["tasks"][:4]],
    }
    try:
        chat = build_llm(session_id=f"plan-{session['id']}", system_message=system_msg)
        resp = await chat.send_message(UserMessage(text=user_prompt))
        # Best effort extract JSON
        text = resp if isinstance(resp, str) else str(resp)
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            parsed = json.loads(m.group(0))
            if isinstance(parsed, dict):
                narrative.update({k: parsed[k] for k in ("situacion_actual", "lectura_estrategica", "recomendaciones") if k in parsed})
    except Exception as e:
        logger.warning(f"LLM plan generation fallback: {e}")

    # Build action items from template + AI recommendations
    action_items: List[Dict[str, Any]] = []
    for i, t in enumerate(template["tasks"]):
        action_items.append({
            "id": new_id(),
            "title": t["title"],
            "detail": t["detail"],
            "priority": t.get("priority", "media"),
            "due_in_days": t.get("due_in_days", 14),
            "status": "pending",
            "note": "",
            "order": i,
            "source": "template",
        })
    for i, rec in enumerate(narrative["recomendaciones"][:5]):
        # only include AI recs that don't overlap templates
        title = rec[:120]
        if any(title.lower() in a["title"].lower() or a["title"].lower() in title.lower() for a in action_items):
            continue
        action_items.append({
            "id": new_id(),
            "title": title,
            "detail": "Recomendación personalizada según tu diagnóstico.",
            "priority": "alta" if i == 0 else "media",
            "due_in_days": 7 if i == 0 else 21,
            "status": "pending",
            "note": "",
            "order": len(action_items),
            "source": "ai",
        })

    plan = {
        "id": new_id(),
        "user_id": user_id,
        "session_id": session["id"],
        "goal_key": goal_key,
        "goal_title": session["goal_title"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "situacion_actual": narrative["situacion_actual"],
        "lectura_estrategica": narrative["lectura_estrategica"],
        "causas": engine["causes"],
        "prioridades": engine["priorities"],
        "recomendaciones": narrative["recomendaciones"],
        "action_items": action_items,
        "indicators": template["indicators"],
        "related_docs": _related_docs(goal_key),
    }
    return plan


def _related_docs(goal_key: str) -> List[Dict[str, str]]:
    docs = KNOWLEDGE_SEED
    tag_map = {
        "vender_entradas": ["publicos", "marketing", "sostenibilidad"],
        "financiamiento": ["financiamiento", "formulacion"],
        "sostenibilidad": ["sostenibilidad", "presupuestos", "indicadores"],
        "publicos": ["publicos", "marketing"],
        "organizacion_interna": ["gestion", "indicadores"],
        "espacio_cultural": ["gestion", "legal", "sostenibilidad"],
    }
    tags = set(tag_map.get(goal_key, []))
    related = [
        {"id": d["id"], "title": d["title"], "category": d["category"], "summary": d["summary"]}
        for d in docs if set(d.get("tags", [])) & tags
    ]
    return related[:5]


# --------------------------------------------------------------------
# Plans
# --------------------------------------------------------------------
@api.get("/plans")
async def list_plans(user: dict = Depends(get_current_user)):
    docs = await db.plans.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api.get("/plans/{plan_id}")
async def get_plan(plan_id: str, user: dict = Depends(get_current_user)):
    doc = await db.plans.find_one({"id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    return doc


@api.put("/plans/{plan_id}/items/{item_id}")
async def update_item(plan_id: str, item_id: str, body: UpdateItemIn, user: dict = Depends(get_current_user)):
    doc = await db.plans.find_one({"id": plan_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    items = doc.get("action_items", [])
    updated = False
    for it in items:
        if it["id"] == item_id:
            if body.status is not None:
                it["status"] = body.status
            if body.note is not None:
                it["note"] = body.note
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    await db.plans.update_one({"id": plan_id}, {"$set": {"action_items": items, "updated_at": now_iso()}})

    # Progress update log
    await db.progress_updates.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "plan_id": plan_id,
        "item_id": item_id,
        "status": body.status,
        "note": body.note,
        "at": now_iso(),
    })
    doc = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    return doc


# --------------------------------------------------------------------
# Knowledge base
# --------------------------------------------------------------------
@api.get("/knowledge/documents")
async def list_docs(category: Optional[str] = None):
    docs = KNOWLEDGE_SEED
    if category:
        docs = [d for d in docs if d["category"] == category]
    return [{"id": d["id"], "title": d["title"], "category": d["category"], "summary": d["summary"], "tags": d["tags"]} for d in docs]


@api.get("/knowledge/categories")
async def list_categories():
    cats = {}
    for d in KNOWLEDGE_SEED:
        cats[d["category"]] = cats.get(d["category"], 0) + 1
    return [{"key": k, "count": v} for k, v in sorted(cats.items())]


@api.get("/knowledge/documents/{doc_id}")
async def get_doc(doc_id: str):
    for d in KNOWLEDGE_SEED:
        if d["id"] == doc_id:
            return d
    raise HTTPException(status_code=404, detail="Documento no encontrado")


# --------------------------------------------------------------------
# Dashboard summary
# --------------------------------------------------------------------
@api.get("/dashboard/summary")
async def dashboard(user: dict = Depends(get_current_user)):
    plans = await db.plans.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    sessions = await db.sessions.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    total_items = 0
    done = 0
    in_progress = 0
    pending = 0
    upcoming = []
    for p in plans:
        for it in p.get("action_items", []):
            total_items += 1
            if it["status"] == "done":
                done += 1
            elif it["status"] == "in_progress":
                in_progress += 1
            else:
                pending += 1
                if len(upcoming) < 5:
                    upcoming.append({
                        "plan_id": p["id"],
                        "plan_title": p["goal_title"],
                        "item_id": it["id"],
                        "title": it["title"],
                        "priority": it["priority"],
                    })
    return {
        "sessions_count": len(sessions),
        "plans_count": len(plans),
        "tasks_total": total_items,
        "tasks_done": done,
        "tasks_in_progress": in_progress,
        "tasks_pending": pending,
        "completion_rate": (done / total_items) if total_items else 0.0,
        "upcoming": upcoming,
        "recent_plans": [{"id": p["id"], "goal_title": p["goal_title"], "created_at": p["created_at"]} for p in plans[:5]],
    }


# --------------------------------------------------------------------
# Agents directory
# --------------------------------------------------------------------
def _agent_matches(agent: Dict[str, Any], q: str, filters: Dict[str, Any]) -> bool:
    if q:
        haystack = " ".join([
            agent.get("name", ""), agent.get("role", ""), agent.get("discipline", ""),
            agent.get("city", ""), agent.get("organization") or "", agent.get("bio", ""),
        ] + list(agent.get("capabilities", [])) + list(agent.get("interests", []))).lower()
        for token in q.lower().split():
            if token not in haystack:
                return False
    for key in ("city", "discipline", "role", "agent_type", "availability"):
        v = filters.get(key)
        if v and agent.get(key) != v:
            return False
    caps = filters.get("capabilities")
    if caps:
        needed = [c for c in caps if c]
        agent_caps = set(agent.get("capabilities", []))
        if not all(c in agent_caps for c in needed):
            return False
    ints = filters.get("interests")
    if ints:
        needed = [c for c in ints if c]
        agent_ints = set(agent.get("interests", []))
        if not all(c in agent_ints for c in needed):
            return False
    return True


def _agent_card(a: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": a["id"],
        "name": a["name"],
        "role": a["role"],
        "agent_type": a["agent_type"],
        "discipline": a["discipline"],
        "city": a["city"],
        "organization": a.get("organization"),
        "availability": a["availability"],
        "capabilities": a.get("capabilities", []),
        "photo": a.get("photo"),
    }


class PublicAgentIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    role: Optional[str] = None
    agent_type: Optional[str] = "Persona"
    discipline: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    organization: Optional[str] = None
    availability: Optional[str] = "Disponible"
    years: Optional[int] = 0
    website: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    capabilities: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    offers: Optional[str] = None
    offers_tags: List[str] = Field(default_factory=list)
    needs: Optional[str] = None
    needs_tags: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    bio: Optional[str] = None
    photo: Optional[str] = None


def _user_agent_to_seed_shape(user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert a user's public_agent + user fields into the AGENTS_SEED shape."""
    pa = user.get("public_agent") or {}
    if not pa.get("published"):
        return None
    return {
        "id": f"user-{user['id']}",
        "name": pa.get("name") or user.get("name") or "",
        "role": pa.get("role") or "",
        "agent_type": pa.get("agent_type") or "Persona",
        "discipline": pa.get("discipline") or "",
        "city": pa.get("city") or "",
        "neighborhood": pa.get("neighborhood") or "",
        "organization": pa.get("organization"),
        "availability": pa.get("availability") or "Disponible",
        "years": pa.get("years") or 0,
        "email": user.get("email"),
        "website": pa.get("website"),
        "socials": {
            k: v for k, v in {"instagram": pa.get("instagram"), "linkedin": pa.get("linkedin")}.items() if v
        },
        "capabilities": pa.get("capabilities", []),
        "interests": pa.get("interests", []),
        "offers": pa.get("offers") or "",
        "offers_tags": pa.get("offers_tags", []),
        "needs": pa.get("needs") or "",
        "needs_tags": pa.get("needs_tags", []),
        "projects": pa.get("projects", []),
        "bio": pa.get("bio") or "",
        "photo": pa.get("photo"),
        "is_user_created": True,
        "owner_user_id": user["id"],
    }


async def _all_agents() -> List[Dict[str, Any]]:
    result = list(AGENTS_SEED)
    user_docs = await db.users.find({"public_agent.published": True}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in user_docs:
        conv = _user_agent_to_seed_shape(u)
        if conv:
            result.insert(0, conv)  # user-created agents appear first
    return result


@api.get("/agents/filters")
async def agents_filters():
    return filter_options()


@api.get("/agents")
async def list_agents(
    q: Optional[str] = None,
    city: Optional[str] = None,
    discipline: Optional[str] = None,
    role: Optional[str] = None,
    agent_type: Optional[str] = None,
    availability: Optional[str] = None,
    capabilities: Optional[str] = None,  # csv
    interests: Optional[str] = None,     # csv
):
    filters = {
        "city": city, "discipline": discipline, "role": role,
        "agent_type": agent_type, "availability": availability,
        "capabilities": [c.strip() for c in (capabilities or "").split(",") if c.strip()],
        "interests": [c.strip() for c in (interests or "").split(",") if c.strip()],
    }
    all_agents = await _all_agents()
    results = [_agent_card(a) for a in all_agents if _agent_matches(a, q or "", filters)]
    return {"count": len(results), "items": results}


@api.get("/agents/saved")
async def saved_agents(user: dict = Depends(get_current_user)):
    saved_ids = user.get("saved_agents") or []
    all_agents = await _all_agents()
    items = [_agent_card(a) for a in all_agents if a["id"] in saved_ids]
    return {"count": len(items), "items": items}


@api.get("/agents/mine")
async def get_my_agent(user: dict = Depends(get_current_user)):
    pa = user.get("public_agent") or {}
    return {
        "published": bool(pa.get("published")),
        "profile": pa,
        "agent_id": f"user-{user['id']}" if pa.get("published") else None,
    }


@api.put("/agents/mine")
async def upsert_my_agent(body: PublicAgentIn, user: dict = Depends(get_current_user)):
    data = body.model_dump()
    data["published"] = True
    data["updated_at"] = now_iso()
    if not user.get("public_agent"):
        data["created_at"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": {"public_agent": data}})
    return {"published": True, "profile": data, "agent_id": f"user-{user['id']}"}


@api.delete("/agents/mine")
async def unpublish_my_agent(user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"public_agent.published": False}})
    return {"published": False}


async def _find_agent_anywhere(agent_id: str) -> Optional[Dict[str, Any]]:
    if agent_id.startswith("user-"):
        uid = agent_id.replace("user-", "", 1)
        u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        if u:
            return _user_agent_to_seed_shape(u)
        return None
    return get_agent(agent_id)


@api.get("/agents/{agent_id}")
async def get_agent_detail(agent_id: str, user: dict = Depends(get_current_user)):
    a = await _find_agent_anywhere(agent_id)
    if not a:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    saved_ids = user.get("saved_agents") or []
    out = dict(a)
    out["saved"] = agent_id in saved_ids
    out["is_own"] = a.get("owner_user_id") == user["id"]
    return out


@api.post("/agents/{agent_id}/save")
async def save_agent(agent_id: str, user: dict = Depends(get_current_user)):
    a = await _find_agent_anywhere(agent_id)
    if not a:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    saved = set(user.get("saved_agents") or [])
    saved.add(agent_id)
    await db.users.update_one({"id": user["id"]}, {"$set": {"saved_agents": list(saved)}})
    return {"saved": True, "count": len(saved)}


@api.delete("/agents/{agent_id}/save")
async def unsave_agent(agent_id: str, user: dict = Depends(get_current_user)):
    saved = [x for x in (user.get("saved_agents") or []) if x != agent_id]
    await db.users.update_one({"id": user["id"]}, {"$set": {"saved_agents": saved}})
    return {"saved": False, "count": len(saved)}


# --------------------------------------------------------------------
# Convocatorias
# --------------------------------------------------------------------
def _conv_matches(c: Dict[str, Any], q: str, f: Dict[str, Any]) -> bool:
    if q:
        blob = " ".join([
            c.get("title", ""), c.get("entity", ""), c.get("country", ""),
            c.get("summary", ""), " ".join(c.get("types", [])),
            " ".join(c.get("areas", [])), " ".join(c.get("tags", [])),
        ]).lower()
        for tok in q.lower().split():
            if tok not in blob:
                return False
    if f.get("status") and c["status"] != f["status"]:
        return False
    if f.get("country") and c["country"] != f["country"]:
        return False
    if f.get("modalidad") and c["modalidad"] != f["modalidad"]:
        return False
    if f.get("type") and f["type"] not in c["types"]:
        return False
    if f.get("area") and f["area"] not in c["areas"]:
        return False
    if f.get("proponent") and f["proponent"] not in c["proponents"]:
        return False
    if f.get("amount_min") is not None and c.get("amount_max", 0) < f["amount_min"]:
        return False
    if f.get("amount_max") is not None and c.get("amount_min", 0) > f["amount_max"]:
        return False
    return True


def _conv_card(c: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": c["id"],
        "title": c["title"],
        "status": c["status"],
        "entity": c["entity"],
        "country": c["country"],
        "types": c["types"],
        "areas": c["areas"],
        "close_date": c.get("close_date"),
        "open_date": c.get("open_date"),
        "amount_min": c.get("amount_min"),
        "amount_max": c.get("amount_max"),
        "moneda": c.get("moneda"),
        "modalidad": c.get("modalidad"),
        "summary": c.get("summary"),
    }


@api.get("/convocatorias/filters")
async def convocatorias_filters():
    return convocatorias_filter_options()


@api.get("/convocatorias/recommendations")
async def convocatorias_recommendations(
    force: bool = False,
    user: dict = Depends(get_current_user),
):
    profile = user.get("profile") or {}
    if not profile.get("discipline"):
        return {"has_profile": False, "recommendations": []}

    cached = user.get("conv_recommendations") or {}
    if not force and cached.get("generated_at"):
        try:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(cached["generated_at"])
            if age < timedelta(hours=6) and cached.get("items"):
                return {"has_profile": True, "cached": True, "recommendations": cached["items"]}
        except Exception:
            pass

    sess = await db.sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(3)
    active_goals = [s.get("goal_title") for s in sess if s.get("goal_title")]

    candidates = [c for c in CONVOCATORIAS_SEED if c["status"] != "Cerrada"]
    summary = [{
        "id": c["id"], "title": c["title"], "status": c["status"], "country": c["country"],
        "types": c["types"], "areas": c["areas"], "proponents": c["proponents"],
        "summary": (c.get("summary") or "")[:200], "close_date": c.get("close_date"),
    } for c in candidates]

    system_msg = (
        "Eres consejero experto en convocatorias culturales iberoamericanas. "
        "Recomiendas las convocatorias más pertinentes según perfil y objetivos del usuario. "
        "Escribe en español claro, cercano y sin jerga académica. Nunca uses emojis. "
        "Responde SOLO con JSON válido, sin texto adicional ni ```json."
    )
    profile_lines = "\n".join(f"- {k}: {v}" for k, v in profile.items() if v)
    prompt = (
        "Analiza el perfil y objetivos del usuario y elige las 4 convocatorias más pertinentes. "
        "Devuelve exclusivamente JSON:\n"
        '{"recommendations": [{"id": "cv-xxx", "reason": "2 frases explicando por qué es pertinente"}, ...]}\n\n'
        f"PERFIL:\n{profile_lines or '(perfil incompleto)'}\n\n"
        "OBJETIVOS ACTIVOS:\n" + ("\n".join(f"- {g}" for g in active_goals) if active_goals else "(sin objetivos activos)") + "\n\n"
        f"CONVOCATORIAS:\n{json.dumps(summary, ensure_ascii=False)}"
    )

    items: List[Dict[str, Any]] = []
    try:
        chat = build_llm(session_id=f"conv-recs-{user['id']}", system_message=system_msg)
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            parsed = json.loads(m.group(0))
            recs = (parsed or {}).get("recommendations") or []
            for r in recs[:4]:
                c = get_convocatoria(r.get("id", ""))
                if not c:
                    continue
                items.append({**_conv_card(c), "reason": (r.get("reason") or "").strip()})
    except Exception as e:
        logger.warning(f"Rec LLM failure: {e}")

    if not items:
        disc = (profile.get("discipline") or "").lower()
        territory = (profile.get("territory") or "").lower()
        scored = []
        for c in candidates:
            score = 0
            if disc and any(disc in a.lower() for a in c["areas"]):
                score += 3
            if territory and territory.split(",")[0].strip() in c["country"].lower():
                score += 2
            scored.append((score, c))
        scored.sort(key=lambda x: -x[0])
        for _, c in scored[:4]:
            items.append({**_conv_card(c), "reason": "Coincide con tu disciplina y contexto."})

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"conv_recommendations": {"generated_at": now_iso(), "items": items}}},
    )
    return {"has_profile": True, "cached": False, "recommendations": items}


@api.get("/convocatorias")
async def list_convocatorias(
    q: Optional[str] = None,
    status: Optional[str] = None,  # noqa: F811
    country: Optional[str] = None,
    type: Optional[str] = None,
    area: Optional[str] = None,
    proponent: Optional[str] = None,
    modalidad: Optional[str] = None,
    amount_min: Optional[int] = None,
    amount_max: Optional[int] = None,
    sort: Optional[str] = "close_date",
):
    filters = {
        "status": status, "country": country, "type": type, "area": area,
        "proponent": proponent, "modalidad": modalidad,
        "amount_min": amount_min, "amount_max": amount_max,
    }
    items = [c for c in CONVOCATORIAS_SEED if _conv_matches(c, q or "", filters)]
    if sort == "amount":
        items.sort(key=lambda x: x.get("amount_max") or 0, reverse=True)
    elif sort == "title":
        items.sort(key=lambda x: x["title"])
    elif sort == "country":
        items.sort(key=lambda x: x["country"])
    elif sort == "open_date":
        items.sort(key=lambda x: x.get("open_date") or "", reverse=True)
    else:  # close_date default
        items.sort(key=lambda x: x.get("close_date") or "9999-12-31")
    return {"count": len(items), "items": [_conv_card(c) for c in items]}


@api.get("/convocatorias/{cid}")
async def get_convocatoria_detail(cid: str):
    c = get_convocatoria(cid)
    if not c:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    return c


# --------------------------------------------------------------------
# Forum
# --------------------------------------------------------------------
class ForumTopicIn(BaseModel):
    category: str
    kind: str
    title: str = Field(min_length=6, max_length=180)
    body: str = Field(min_length=10)
    tags: List[str] = Field(default_factory=list)


class ForumReplyIn(BaseModel):
    body: str = Field(min_length=2)


async def _seed_forum_if_empty():
    count = await db.forum_topics.count_documents({})
    if count > 0:
        # ensure featured flag is applied even to existing seed
        featured_titles = {s["title"] for s in FORUM_SEED if s.get("featured")}
        if featured_titles:
            await db.forum_topics.update_many(
                {"title": {"$in": list(featured_titles)}, "is_seed": True},
                {"$set": {"featured": True}},
            )
        return
    for s in FORUM_SEED:
        topic_id = new_id()
        topic_doc = {
            "id": topic_id,
            "category": s["category"],
            "kind": s["kind"],
            "title": s["title"],
            "body": s["body"],
            "author_id": None,
            "author_name": s["author"],
            "tags": s.get("tags", []),
            "featured": bool(s.get("featured")),
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "replies_count": len(s.get("replies", [])),
            "is_seed": True,
        }
        await db.forum_topics.insert_one(topic_doc)
        for r in s.get("replies", []):
            await db.forum_replies.insert_one({
                "id": new_id(),
                "topic_id": topic_id,
                "author_id": None,
                "author_name": r["author"],
                "body": r["body"],
                "created_at": now_iso(),
                "is_seed": True,
            })


@app.on_event("startup")
async def on_startup():
    await _seed_forum_if_empty()
    await run_admin_seed(db)
    # Bootstrap seguro del primer superadmin (controlado por variables de entorno).
    try:
        await run_admin_bootstrap(db)
    except BootstrapConfigError as e:
        logger.error("Admin bootstrap: configuración inválida — %s", e)
        raise
    # Migraciones de seguridad idempotentes.
    try:
        from migrations import run_security_migrations
        from admin_permissions import PERMISSIONS, ROLE_DEFINITIONS
        await run_security_migrations(
            db,
            valid_permissions=[p["key"] for p in PERMISSIONS],
            valid_system_roles=list(ROLE_DEFINITIONS.keys()),
        )
    except Exception as e:
        logger.warning("Security migrations no ejecutadas: %s", e)
    try:
        from storage import init_storage
        init_storage()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Object storage init failed: {e}")


@api.get("/forum/meta")
async def forum_meta():
    counts = {}
    for c in FORUM_CATEGORIES:
        counts[c["key"]] = await db.forum_topics.count_documents({"category": c["key"]})
    return {
        "categories": [{**c, "count": counts.get(c["key"], 0)} for c in FORUM_CATEGORIES],
        "kinds": FORUM_KINDS,
    }


@api.get("/forum/topics")
async def list_topics(
    category: Optional[str] = None,
    kind: Optional[str] = None,
    q: Optional[str] = None,
    sort: Optional[str] = "recent",
    featured: Optional[bool] = None,
    limit: int = 200,
):
    query: Dict[str, Any] = {}
    if category:
        query["category"] = category
    if kind:
        query["kind"] = kind
    if featured is True:
        query["featured"] = True
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"body": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.forum_topics.find(query, {"_id": 0})
    if sort == "most_replied":
        cursor = cursor.sort("replies_count", -1)
    else:
        cursor = cursor.sort("updated_at", -1)
    items = await cursor.to_list(max(1, min(limit, 500)))
    return {"count": len(items), "items": items}


@api.post("/forum/topics")
async def create_topic(body: ForumTopicIn, user: dict = Depends(get_current_user)):
    valid_cats = {c["key"] for c in FORUM_CATEGORIES}
    valid_kinds = {k["key"] for k in FORUM_KINDS}
    if body.category not in valid_cats:
        raise HTTPException(status_code=400, detail="Categoría no válida")
    if body.kind not in valid_kinds:
        raise HTTPException(status_code=400, detail="Tipo no válido")
    doc = {
        "id": new_id(),
        "category": body.category,
        "kind": body.kind,
        "title": body.title.strip(),
        "body": body.body.strip(),
        "author_id": user["id"],
        "author_name": user["name"],
        "tags": [t.strip() for t in body.tags if t.strip()][:6],
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "replies_count": 0,
    }
    await db.forum_topics.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/forum/topics/{topic_id}")
async def get_topic(topic_id: str):
    t = await db.forum_topics.find_one({"id": topic_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tema no encontrado")
    replies = await db.forum_replies.find({"topic_id": topic_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"topic": t, "replies": replies}


@api.post("/forum/topics/{topic_id}/replies")
async def create_reply(topic_id: str, body: ForumReplyIn, user: dict = Depends(get_current_user)):
    t = await db.forum_topics.find_one({"id": topic_id})
    if not t:
        raise HTTPException(status_code=404, detail="Tema no encontrado")
    reply = {
        "id": new_id(),
        "topic_id": topic_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "body": body.body.strip(),
        "created_at": now_iso(),
    }
    await db.forum_replies.insert_one(reply)
    reply.pop("_id", None)
    await db.forum_topics.update_one(
        {"id": topic_id},
        {"$inc": {"replies_count": 1}, "$set": {"updated_at": now_iso()}},
    )
    return reply


# --------------------------------------------------------------------
# Health
# --------------------------------------------------------------------
@api.get("/health")
async def health():
    return {"status": "ok", "service": "cultora", "time": now_iso()}


# --------------------------------------------------------------------
# App wiring — CORS + security headers
# --------------------------------------------------------------------
app.include_router(api)
app.include_router(build_admin_router(db, get_current_user))


def _parse_cors_origins() -> List[str]:
    """Lee CORS_ORIGINS del entorno. En production/staging no permite '*'."""
    raw = (os.environ.get("CORS_ORIGINS") or "").strip()
    if not raw:
        if CULTORA_ENV in ("production", "staging"):
            raise RuntimeError(
                "CORS_ORIGINS es obligatorio en production/staging. "
                "Configura una lista blanca de orígenes separada por comas."
            )
        return ["*"]
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if CULTORA_ENV in ("production", "staging") and "*" in origins:
        raise RuntimeError("CORS_ORIGINS='*' no está permitido en production/staging.")
    return origins


_CORS_ORIGINS = _parse_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["Retry-After"],
    max_age=600,
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    # Encabezados de seguridad razonables para una API + SPA React.
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer-when-downgrade")
    response.headers.setdefault("Permissions-Policy",
                                "geolocation=(), microphone=(), camera=(), payment=()")
    # Antiframing: la app no se embebe en iframes salvo el propio origen.
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    # CSP defensiva: aplica sólo a responses HTML (no rompe la SPA cargando el HTML raíz).
    # Se deja permisiva para inline styles (Tailwind runtime) y las fuentes externas ya usadas.
    ctype = response.headers.get("content-type", "")
    if "text/html" in ctype:
        response.headers.setdefault(
            "Content-Security-Policy",
            (
                "default-src 'self'; "
                "img-src 'self' data: blob: https:; "
                "font-src 'self' data: https:; "
                "style-src 'self' 'unsafe-inline' https:; "
                "script-src 'self' 'unsafe-inline' https:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'self'; "
                "base-uri 'self'; "
                "form-action 'self';"
            ),
        )
    return response


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
