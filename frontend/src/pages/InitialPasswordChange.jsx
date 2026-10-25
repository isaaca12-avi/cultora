import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { http } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeSlash, ShieldCheck, SignOut, CheckCircle } from "@phosphor-icons/react";

/**
 * Cambio obligatorio de contraseña en el primer inicio de sesión.
 * Ruta pública protegida por autenticación (no por Protected wrapper, para
 * evitar loops). El backend gatea todos los demás endpoints hasta que
 * must_change_password sea false.
 */
export default function InitialPasswordChange() {
  const { user, loading, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  // Si no está autenticado, mandar a login.
  if (!user) return <Navigate to="/login" replace />;

  // Si ya no requiere cambio, redirigir al destino apropiado.
  if (!user.must_change_password) {
    return <Navigate to={user.is_admin || user.admin_role ? "/admin" : "/dashboard"} replace />;
  }

  const strength = passwordStrength(next);
  const okBasics = next.length >= 12 && strength >= 3 && next === confirm && next !== current;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!okBasics || submitting) return;
    setSubmitting(true);
    try {
      await http.post("/auth/change-initial-password", {
        current_password: current,
        new_password: next,
      });
      toast.success("Contraseña actualizada. Bienvenido a Cultora.");
      await refresh();
      // Redirect según el rol
      nav(user.is_admin || user.admin_role ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : (detail?.message || "No se pudo cambiar la contraseña");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-parchment flex items-center justify-center p-6" data-testid="initial-password-change">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6 text-parchment/60 text-[11px] uppercase tracking-[0.2em]">
          <ShieldCheck size={13} weight="fill" />
          Seguridad · Primer inicio de sesión
        </div>
        <h1 className="font-serif-display text-3xl md:text-4xl leading-tight mb-3">
          Cambia tu contraseña temporal
        </h1>
        <p className="text-parchment/70 text-sm mb-8 leading-relaxed">
          Por seguridad debes definir una nueva contraseña antes de continuar. La
          contraseña temporal quedará inválida después de este paso.
        </p>

        <form onSubmit={onSubmit} className="space-y-4" data-testid="initial-password-form">
          <Field
            label="Contraseña temporal (la que te dieron)"
            value={current}
            onChange={setCurrent}
            show={show}
            testId="input-current-temp"
          />

          <div>
            <Field
              label="Nueva contraseña"
              value={next}
              onChange={setNext}
              show={show}
              testId="input-new-password"
            />
            {next ? <StrengthBar strength={strength} /> : null}
            <ul className="mt-2 space-y-1 text-[11.5px] text-parchment/50">
              <Rule ok={next.length >= 12}>Al menos 12 caracteres</Rule>
              <Rule ok={/[a-z]/.test(next) && /[A-Z]/.test(next)}>Combina mayúsculas y minúsculas</Rule>
              <Rule ok={/\d/.test(next)}>Incluye un dígito</Rule>
              <Rule ok={/[^A-Za-z0-9]/.test(next)}>Incluye un símbolo</Rule>
              <Rule ok={Boolean(current) && next !== current}>Distinta de la temporal</Rule>
            </ul>
          </div>

          <Field
            label="Confirmar nueva contraseña"
            value={confirm}
            onChange={setConfirm}
            show={show}
            testId="input-confirm-password"
            error={confirm && confirm !== next ? "Las contraseñas no coinciden" : null}
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[12px] text-parchment/50 hover:text-parchment/80"
              onClick={() => setShow((v) => !v)}
              data-testid="toggle-show-password"
            >
              {show ? <EyeSlash size={12} /> : <Eye size={12} />}
              {show ? "Ocultar contraseñas" : "Mostrar contraseñas"}
            </button>
            <button
              type="submit"
              disabled={!okBasics || submitting}
              className="bg-terracotta text-parchment px-5 py-2.5 text-[13px] uppercase tracking-[0.15em] rounded-none hover:bg-terracotta/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="submit-initial-password"
            >
              {submitting ? "Guardando…" : "Actualizar y continuar"}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-parchment/10 flex items-center justify-between text-[11.5px] text-parchment/50">
          <span>Sesión: {user.email}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-parchment/80"
            onClick={() => { logout(); nav("/login", { replace: true }); }}
            data-testid="logout-from-initial"
          >
            <SignOut size={12} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Field({ label, value, onChange, show, testId, error }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.15em] text-parchment/50 mb-2">
        {label}
      </label>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-parchment/20 focus:border-terracotta outline-none py-2 text-parchment"
        data-testid={testId}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {error ? <div className="mt-1 text-[11.5px] text-terracotta">{error}</div> : null}
    </div>
  );
}

function Rule({ ok, children }) {
  return (
    <li className="flex items-center gap-1.5">
      {ok ? (
        <CheckCircle size={11} weight="fill" className="text-terracotta" />
      ) : (
        <span className="w-[9px] h-[9px] rounded-full border border-parchment/30" />
      )}
      <span className={ok ? "text-parchment/80" : ""}>{children}</span>
    </li>
  );
}

function passwordStrength(pw = "") {
  let s = 0;
  if (pw.length >= 12) s++;
  if (pw.length >= 16) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

function StrengthBar({ strength }) {
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];
  const colors = ["#ef4444", "#f59e0b", "#f59e0b", "#dcb28f", "#dcb28f"];
  return (
    <div className="mt-2" data-testid="password-strength">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background: i < strength ? colors[strength] : "rgba(233, 227, 214, 0.15)",
            }}
          />
        ))}
      </div>
      <div className="text-[11px] text-parchment/50 mt-1">Fortaleza: {labels[strength]}</div>
    </div>
  );
}
