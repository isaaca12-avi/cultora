import axios from "axios";
import { toast } from "sonner";

const rawBase = (process.env.REACT_APP_BACKEND_URL || "").trim();
const fallbackBase = process.env.NODE_ENV === "development" ? "http://localhost:8001" : "";
const BASE = rawBase && rawBase !== "undefined" ? rawBase.replace(/\/+$/, "") : fallbackBase;
export const API = `${BASE}/api`;

let lastUnavailableAt = 0;
function notifyUnavailable() {
  const now = Date.now();
  if (now - lastUnavailableAt < 15000) return;
  lastUnavailableAt = now;
  toast.error("No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.");
}

function isHtmlPayload(data) {
  return typeof data === "string" && /^\s*<(?:!doctype|html)/i.test(data.slice(0, 200));
}

function backendUnavailable() {
  const err = new Error("El servidor del API no está disponible.");
  err.isBackendUnavailable = true;
  err.response = {
    status: 0,
    data: {
      detail: "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.",
    },
  };
  if (process.env.NODE_ENV === "development") {
    console.warn("[Cultora] Respuesta no JSON del API. Revisa REACT_APP_BACKEND_URL y el backend.");
  }
  notifyUnavailable();
  return err;
}

export const http = axios.create({ baseURL: API });

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("cultora_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Interceptor de respuesta: maneja códigos estructurados devueltos por el backend.
// - password_change_required → redirect a /cambiar-password-inicial (respeta contexto actual).
// - session_expired / session_revoked / invalid_token → logout local + redirect a /login.
// - account_blocked / account_suspended → logout local + redirect a /login con motivo.
http.interceptors.response.use(
  (r) => {
    // Si el servidor devolvió HTML (p. ej. el fallback SPA), no es una respuesta de API válida.
    if (isHtmlPayload(r?.data)) {
      return Promise.reject(backendUnavailable());
    }
    // Rotación de token: si el backend devolvió un token nuevo en la respuesta, reemplaza el local.
    try {
      const t = r?.data?.token;
      if (t && typeof t === "string" && t.split(".").length === 3) {
        localStorage.setItem("cultora_token", t);
      }
    } catch (_) {}
    return r;
  },
  (err) => {
    try {
      if (!err?.response) notifyUnavailable();
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const code = typeof detail === "object" ? detail?.code : null;
      const path = window.location.pathname;
      if (status === 403 && code === "password_change_required") {
        if (path !== "/cambiar-password-inicial" && path !== "/login") {
          window.location.replace("/cambiar-password-inicial");
        }
      } else if (status === 401 && (code === "session_expired" || code === "session_revoked" || code === "invalid_token")) {
        localStorage.removeItem("cultora_token");
        if (path !== "/login" && path !== "/registro" && path !== "/") {
          const reason = code === "session_expired" ? "expired" : code === "session_revoked" ? "revoked" : "invalid";
          window.location.replace(`/login?reason=${reason}`);
        }
      } else if (status === 403 && (code === "account_blocked" || code === "account_suspended")) {
        localStorage.removeItem("cultora_token");
        if (path !== "/login") {
          window.location.replace(`/login?reason=${code}`);
        }
      }
      // Los componentes muestran el detalle directamente; evita objetos/arrays como hijos de React.
      if (detail && typeof detail === "object" && !Array.isArray(detail) && err?.response?.data) {
        if (typeof detail.message === "string" && detail.message.trim()) {
          err.response.data.detail = detail.message;
        } else if (err.response.data.detail === detail) {
          err.response.data.detail = "No se pudo completar la operación.";
        }
      } else if (Array.isArray(detail) && err?.response?.data) {
        const first = detail.find((d) => typeof d?.msg === "string");
        err.response.data.detail = first?.msg || "Revisa los datos e inténtalo de nuevo.";
      }
    } catch (_) {}
    return Promise.reject(err);
  },
);

export const auth = {
  register: (data) => http.post("/auth/register", data).then((r) => r.data),
  login: (data) => http.post("/auth/login", data).then((r) => r.data),
  me: () => http.get("/auth/me").then((r) => r.data),
  forgotPassword: (email) => http.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token, new_password) =>
    http.post("/auth/reset-password", { token, new_password }).then((r) => r.data),
  verifyEmail: (token) => http.post("/auth/verify-email", { token }).then((r) => r.data),
  resendVerification: () => http.post("/auth/resend-verification").then((r) => r.data),
};

export const profile = {
  get: () => http.get("/profile").then((r) => r.data),
  save: (data) => http.put("/profile", data).then((r) => r.data),
};

export const goals = {
  catalog: () => http.get("/goals/catalog").then((r) => r.data),
};

export const diagnostic = {
  start: (goal_key, goal_text) => http.post("/diagnostic/start", { goal_key, goal_text }).then((r) => r.data),
  list: () => http.get("/diagnostic/sessions").then((r) => r.data),
  get: (id) => http.get(`/diagnostic/sessions/${id}`).then((r) => r.data),
  answer: (id, answer) => http.post(`/diagnostic/sessions/${id}/answer`, { answer }).then((r) => r.data),
  generate: (id) => http.post(`/diagnostic/sessions/${id}/generate-plan`).then((r) => r.data),
};

export const plans = {
  list: () => http.get("/plans").then((r) => r.data),
  get: (id) => http.get(`/plans/${id}`).then((r) => r.data),
  updateItem: (planId, itemId, payload) =>
    http.put(`/plans/${planId}/items/${itemId}`, payload).then((r) => r.data),
  feedback: (planId, payload) => http.post(`/plans/${planId}/feedback`, payload).then((r) => r.data),
};

export const knowledge = {
  list: (category) => http.get("/knowledge/documents", { params: category ? { category } : {} }).then((r) => r.data),
  categories: () => http.get("/knowledge/categories").then((r) => r.data),
  get: (id) => http.get(`/knowledge/documents/${id}`).then((r) => r.data),
};

export const dashboard = {
  summary: () => http.get("/dashboard/summary").then((r) => r.data),
};

export const agents = {
  filters: () => http.get("/agents/filters").then((r) => r.data),
  list: (params) => http.get("/agents", { params }).then((r) => r.data),
  get: (id) => http.get(`/agents/${id}`).then((r) => r.data),
  save: (id) => http.post(`/agents/${id}/save`).then((r) => r.data),
  unsave: (id) => http.delete(`/agents/${id}/save`).then((r) => r.data),
  saved: () => http.get("/agents/saved").then((r) => r.data),
  mine: () => http.get("/agents/mine").then((r) => r.data),
  saveMine: (payload) => http.put("/agents/mine", payload).then((r) => r.data),
  unpublishMine: () => http.delete("/agents/mine").then((r) => r.data),
};

export const forum = {
  meta: () => http.get("/forum/meta").then((r) => r.data),
  list: (params) => http.get("/forum/topics", { params }).then((r) => r.data),
  get: (id) => http.get(`/forum/topics/${id}`).then((r) => r.data),
  create: (payload) => http.post("/forum/topics", payload).then((r) => r.data),
  reply: (id, body) => http.post(`/forum/topics/${id}/replies`, { body }).then((r) => r.data),
};

export const convocatorias = {
  filters: () => http.get("/convocatorias/filters").then((r) => r.data),
  list: (params) => http.get("/convocatorias", { params }).then((r) => r.data),
  get: (id) => http.get(`/convocatorias/${id}`).then((r) => r.data),
  recommendations: (force) => http.get("/convocatorias/recommendations", { params: force ? { force: true } : {} }).then((r) => r.data),
};
