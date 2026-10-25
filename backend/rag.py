"""
Cultora — Motor RAG (Retrieval-Augmented Generation) para el motor de decisión.

Diseño:
- Búsqueda semántica sobre `knowledge_chunks` usando TF-IDF (sklearn).
  Provider-agnostic: la interfaz `search(query, filters, top_k)` no depende de TF-IDF y
  se puede reemplazar por embeddings vectoriales (OpenAI text-embedding-3-small) sin
  cambiar el resto del código.
- Chunking simple por palabras con solapamiento, respetando límites por párrafo.
- Índice se reconstruye en memoria bajo demanda; se invalida cuando cambia un documento.

Modelo de datos:
  knowledge_documents: {id, title, kind, category, goal_keys[], disciplines[], countries[],
                        maturity, is_authoritative, status(draft|published|archived), summary,
                        source_url, author, content, chunks_count, created_at, updated_at,
                        usage_count, deleted_at?}
  knowledge_chunks:    {id, doc_id, position, text, token_est,
                        goal_keys[], disciplines[], countries[], is_authoritative}
"""
import re
from typing import Any, Dict, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel


# --------------------------------------------------------------------
# Chunking
# --------------------------------------------------------------------
_SP_STOPWORDS = [
    "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las", "por",
    "un", "para", "con", "no", "una", "su", "al", "lo", "como", "más", "pero",
    "sus", "le", "ya", "o", "este", "sí", "porque", "esta", "entre", "cuando",
    "muy", "sin", "sobre", "también", "me", "hasta", "hay", "donde", "quien",
    "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra",
    "otros", "ese", "eso", "ante", "ellos", "e", "esto", "mí", "antes",
    "algunos", "qué", "unos", "yo", "otro", "otras", "otra", "él", "tanto",
    "esa", "estos", "mucho", "quienes", "nada", "muchos", "cual", "poco",
    "ella", "estar", "estas", "algunas", "algo", "nosotros", "mi", "mis",
    "tú", "te", "ti", "tu", "tus", "ellas", "nosotras", "vosotros", "vosotras",
    "os", "mío", "mía", "míos", "mías", "tuyo", "tuya", "tuyos", "tuyas",
    "suyo", "suya", "suyos", "suyas", "nuestro", "nuestra", "nuestros", "nuestras",
    "vuestro", "vuestra", "vuestros", "vuestras", "esos", "esas", "estoy",
    "estás", "está", "estamos", "estáis", "están",
]


def chunk_text(text: str, max_words: int = 350, overlap: int = 40) -> List[str]:
    """Fragmenta un texto en chunks de ~max_words palabras con solapamiento."""
    text = (text or "").strip()
    if not text:
        return []
    # Preservar párrafos: primero unir por párrafo, luego dividir si superan max_words
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: List[str] = []
    buf: List[str] = []
    buf_words = 0
    for para in paragraphs:
        words = para.split()
        if buf_words + len(words) <= max_words:
            buf.append(para)
            buf_words += len(words)
        else:
            # Vaciar buffer
            if buf:
                chunks.append("\n\n".join(buf))
                buf = []
                buf_words = 0
            # Si el párrafo mismo es demasiado grande, sub-fragmentarlo
            if len(words) > max_words:
                step = max_words - overlap
                for i in range(0, len(words), step):
                    piece = " ".join(words[i:i + max_words])
                    if piece:
                        chunks.append(piece)
            else:
                buf = [para]
                buf_words = len(words)
    if buf:
        chunks.append("\n\n".join(buf))
    return chunks


# --------------------------------------------------------------------
# Índice en memoria
# --------------------------------------------------------------------
_INDEX: Dict[str, Any] = {
    "version": 0,
    "vectorizer": None,
    "matrix": None,
    "chunks": [],   # lista de dicts con {id, doc_id, text, filters...}
}

_DB_VERSION_KEY = "kb_index_version"


async def _current_version(db) -> int:
    doc = await db.admin_config.find_one({"id": "_kb_version"}, {"version": 1, "_id": 0})
    return int(doc.get("version", 0)) if doc else 0


async def bump_version(db) -> int:
    """Se llama después de cualquier cambio en documentos publicados."""
    r = await db.admin_config.find_one_and_update(
        {"id": "_kb_version"},
        {"$inc": {"version": 1}},
        upsert=True,
        return_document=True,
    )
    return int(r.get("version", 1))


async def _rebuild(db) -> None:
    """Reconstruye el índice TF-IDF con los chunks publicados."""
    chunks = await db.knowledge_chunks.find(
        {"is_published": True},
        {"_id": 0},
    ).to_list(20000)
    if not chunks:
        _INDEX.update(vectorizer=None, matrix=None, chunks=[])
        return
    texts = [c["text"] for c in chunks]
    vec = TfidfVectorizer(
        stop_words=_SP_STOPWORDS,
        strip_accents="unicode",
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.9,
        sublinear_tf=True,
        lowercase=True,
    )
    mat = vec.fit_transform(texts)
    _INDEX.update(vectorizer=vec, matrix=mat, chunks=chunks)


async def ensure_fresh(db) -> None:
    ver = await _current_version(db)
    if ver != _INDEX["version"] or _INDEX["vectorizer"] is None:
        await _rebuild(db)
        _INDEX["version"] = ver


async def search(
    db,
    query: str,
    top_k: int = 5,
    goal_key: Optional[str] = None,
    disciplines: Optional[List[str]] = None,
    countries: Optional[List[str]] = None,
    only_authoritative: bool = False,
) -> List[Dict[str, Any]]:
    """Busca los top-K chunks más relevantes con filtros opcionales.
    Devuelve chunks enriquecidos con score y título del documento."""
    await ensure_fresh(db)
    if _INDEX["vectorizer"] is None or not (query or "").strip():
        return []
    qv = _INDEX["vectorizer"].transform([query])
    sims = linear_kernel(qv, _INDEX["matrix"]).flatten()

    # aplicar filtros
    candidates = []
    for i, c in enumerate(_INDEX["chunks"]):
        if goal_key and goal_key not in (c.get("goal_keys") or []):
            continue
        if disciplines:
            cd = set(c.get("disciplines") or [])
            if not cd.intersection(disciplines):
                continue
        if countries:
            cc = set(c.get("countries") or [])
            if not cc.intersection(countries):
                continue
        if only_authoritative and not c.get("is_authoritative"):
            continue
        candidates.append((i, sims[i]))

    candidates.sort(key=lambda x: x[1], reverse=True)
    results = []
    doc_ids = set()
    for i, score in candidates:
        if score <= 0:
            continue
        c = _INDEX["chunks"][i]
        # Diversidad: max 2 chunks por doc
        if list(doc_ids).count(c["doc_id"]) >= 2:
            continue
        doc_ids.add(c["doc_id"])
        results.append({**c, "score": float(round(score, 4))})
        if len(results) >= top_k:
            break

    # Fallback: si el filtro por goal_key/discipline/country dejó 0 resultados,
    # reintentar SIN filtros (respetando only_authoritative).
    if not results and (goal_key or disciplines or countries):
        for i, score in sorted(enumerate(sims), key=lambda x: x[1], reverse=True):
            if score <= 0:
                continue
            c = _INDEX["chunks"][i]
            if only_authoritative and not c.get("is_authoritative"):
                continue
            if list(doc_ids).count(c["doc_id"]) >= 2:
                continue
            doc_ids.add(c["doc_id"])
            results.append({**c, "score": float(round(score, 4)), "fallback": True})
            if len(results) >= top_k:
                break

    # Enriquecer con título del doc
    if results:
        docs = await db.knowledge_documents.find(
            {"id": {"$in": [r["doc_id"] for r in results]}},
            {"_id": 0, "id": 1, "title": 1, "source_url": 1, "author": 1},
        ).to_list(len(results))
        by_id = {d["id"]: d for d in docs}
        for r in results:
            d = by_id.get(r["doc_id"], {})
            r["doc_title"] = d.get("title")
            r["doc_source_url"] = d.get("source_url")
            r["doc_author"] = d.get("author")
    return results


def format_context_block(chunks: List[Dict[str, Any]]) -> str:
    """Formatea chunks recuperados para inyectar en un prompt de LLM."""
    if not chunks:
        return ""
    lines = ["MATERIAL DE REFERENCIA DE LA BIBLIOTECA CULTORA:"]
    for i, c in enumerate(chunks, 1):
        src = c.get("doc_title") or f"doc {c.get('doc_id','')}"
        lines.append(f"\n[Fuente {i}] {src}")
        lines.append(c["text"])
    lines.append("\n\nCita las fuentes cuando corresponda usando '[Fuente N]'. "
                 "No inventes datos que no estén en el material.")
    return "\n".join(lines)
