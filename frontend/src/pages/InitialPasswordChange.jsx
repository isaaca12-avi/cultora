import React, { useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { http } from "@/lib/api";
import { AuthShell } from "./Login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Eye, EyeSlash, ShieldCheck, SignOut } from "@phosphor-icons/react";

/**
 * Cambio obligatorio de contraseña en el primer inicio de sesión.
 * El backend gatea todos los demás endpoints hasta que must_change_password sea false.
 */
export default function InitialPasswordChange() {
  const { user, loading, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = Boolean(user?.is_admin || user?.admin_role);
  const minLength = isAdmin ? 12 : 10;
  const rules = useMemo(
    () => [
      { key: "length", label: `Al menos ${minLength} caracteres`, ok: next.length >= minLength },
      {
        key: "case",
        label: "Mayúsculas y minúsculas",
        ok: /[a-z]/.test(next) && /[A-Z]/.test(next),
      },
      { key: "digit", label: "Un número", ok: /\d/.test(next) },
      ...(isAdmin ? [{ key: "symbol", label: "Un símbolo", ok: /[^A-Za-z0-9]/.test(next) }] : []),
      { key: "different", label: "Distinta de la temporal", ok: Boolean(current) && next !== current },
    ],
    [next, current, minLength, isAdmin]
  );
  const okBasics = rules.every((r) => r.ok) && next === confirm && next.length > 0;

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) {
    return <Navigate to={user.is_admin || user.admin_role ? "/admin" : "/dashboard"} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!okBasics || submitting) return;
    setSubmitting(true);
    try {
      const res = await http.post("/auth/change-initial-password", {
        current_password: current,
        new_password: next,
      });
      if (res?.data?.token) localStorage.setItem("cultora_token", res.data.token);
      toast.success("Contraseña actualizada. Bienvenido a Cultora.");
      await refresh();
      nav(user.is_admin || user.admin_role ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : detail?.message || "No se pudo cambiar la contraseña";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Cambia tu contraseña temporal"
      subtitle="Por seguridad debes definir una nueva contraseña antes de continuar."
    >
      <div
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-terracotta/15 bg-terracotta/5 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta"
        data-testid="initial-password-change"
      >
        <ShieldCheck size={12} weight="fill" />
        Primer inicio de sesión
      </div>

      <form onSubmit={onSubmit} className="space-y-4" data-testid="initial-password-form">
        <Field
          label="Contraseña temporal"
          value={current}
          onChange={setCurrent}
          show={show}
          testId="input-current-temp"
          autoComplete="current-password"
        />
        <Field
          label="Nueva contraseña"
          value={next}
          onChange={setNext}
          show={show}
          testId="input-new-password"
          autoComplete="new-password"
        />

        {next ? <StrengthBar value={next} /> : null}

        <ul className="grid gap-1.5 rounded-xl border border-obsidian/8 bg-white p-3.5 sm:grid-cols-2">
          {rules.map((r) => (
            <li key={r.key} className={`flex items-center gap-1.5 text-[12px] ${r.ok ? "text-olive" : "text-obsidian/45"}`}>
              <span
                className={`grid h-4 w-4 place-items-center rounded-full border ${
                  r.ok ? "border-olive/25 bg-olive/10" : "border-obsidian/15"
                }`}
              >
                {r.ok ? <Check size={9} weight="bold" /> : null}
              </span>
              {r.label}
            </li>
          ))}
        </ul>

        <Field
          label="Confirmar nueva contraseña"
          value={confirm}
          onChange={setConfirm}
          show={show}
          testId="input-confirm-password"
          autoComplete="new-password"
          error={confirm && confirm !== next ? "Las contraseñas no coinciden" : null}
        />

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[12px] text-obsidian/45 transition-colors hover:text-obsidian/75"
            onClick={() => setShow((v) => !v)}
            data-testid="toggle-show-password"
          >
            {show ? <EyeSlash size={13} /> : <Eye size={13} />}
            {show ? "Ocultar contraseñas" : "Mostrar contraseñas"}
          </button>
          <Button
            type="submit"
            disabled={!okBasics || submitting}
            className="h-10 rounded-lg bg-obsidian px-4 text-[13px] font-medium text-alabaster hover:bg-obsidian/90 disabled:opacity-40"
            data-testid="submit-initial-password"
          >
            {submitting ? "Guardando…" : "Actualizar y continuar"}
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-obsidian/8 pt-4 text-[11.5px] text-obsidian/40">
        <span className="truncate">Sesión: {user.email}</span>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 transition-colors hover:text-obsidian/70"
          onClick={() => {
            logout();
            nav("/login", { replace: true });
          }}
          data-testid="logout-from-initial"
        >
          <SignOut size={12} /> Cerrar sesión
        </button>
      </div>
    </AuthShell>
  );
}

function Field({ label, value, onChange, show, testId, error, autoComplete = "off" }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12px] font-medium text-obsidian/65">{label}</div>
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
        data-testid={testId}
        autoComplete={autoComplete}
        autoCapitalize="off"
        spellCheck={false}
      />
      {error ? <div className="mt-1 text-[11.5px] text-terracotta">{error}</div> : null}
    </label>
  );
}

function StrengthBar({ value }) {
  let score = 0;
  if (value.length >= 10) score++;
  if (value.length >= 14) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];
  const tones = ["bg-terracotta", "bg-terracotta/70", "bg-[#B0804D]", "bg-olive/70", "bg-olive"];
  return (
    <div data-testid="password-strength">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? tones[score] : "bg-linen"}`} />
        ))}
      </div>
      <div className="mt-1 text-[11px] text-obsidian/40">Fortaleza: {labels[score]}</div>
    </div>
  );
}
