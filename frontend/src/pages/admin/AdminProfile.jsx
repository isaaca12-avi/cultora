import React, { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { useAuth } from "@/lib/auth-context";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminUI";
import { Key, User, ShieldCheck, Eye, EyeSlash, CheckCircle, SignOut } from "@phosphor-icons/react";

/**
 * Perfil del administrador: información + cambio de contraseña.
 * Cualquier admin autenticado puede acceder para gestionar su propia cuenta.
 */
export default function AdminProfile() {
  const { admin } = useAdmin();
  const { logoutAll } = useAuth();
  const nav = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastChangeOk, setLastChangeOk] = useState(false);

  const strength = passwordStrength(next);
  const strengthTooWeak = next.length > 0 && strength < 2;
  const canSubmit =
    current.length >= 6 &&
    next.length >= 8 &&
    strength >= 2 &&
    next === confirm &&
    next !== current &&
    !loading;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setLastChangeOk(false);
    try {
      await adminApi.changePassword(current, next);
      toast.success("Contraseña actualizada correctamente");
      setCurrent("");
      setNext("");
      setConfirm("");
      setLastChangeOk(true);
    } catch (err) {
      const detail = err?.response?.data?.detail || "No se pudo cambiar la contraseña";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="admin-profile">
      <AdminPageHeader
        eyebrow="Cuenta"
        title="Mi perfil de administrador"
        description="Información de tu cuenta y ajustes de seguridad."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Info card */}
        <div className="lg:col-span-1">
          <AdminSection title="Información" description="Datos básicos de tu sesión.">
            <div className="space-y-3">
              <InfoRow icon={User} label="Nombre" value={admin?.name} />
              <InfoRow icon={Key} label="Email" value={admin?.email} testId="admin-profile-email" />
              <InfoRow
                icon={ShieldCheck}
                label="Rol"
                value={admin?.role_label || "—"}
                subtitle={`${admin?.permissions?.length || 0} permisos`}
              />
              <div className="pt-2 mt-2 border-t admin-border">
                <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-1.5">
                  Estado
                </div>
                <span className="admin-chip admin-chip-success text-[11px]">
                  {admin?.status || "active"}
                </span>
              </div>
            </div>
          </AdminSection>
        </div>

        {/* Change password */}
        <div className="lg:col-span-2">
          <AdminSection
            title="Cambiar contraseña"
            description="Elige una contraseña de al menos 8 caracteres. Nunca la compartas."
          >
            <form onSubmit={onSubmit} className="space-y-4" data-testid="change-password-form">
              <FieldPassword
                label="Contraseña actual"
                value={current}
                onChange={setCurrent}
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
                testId="input-current-password"
              />

              <div>
                <FieldPassword
                  label="Nueva contraseña"
                  value={next}
                  onChange={setNext}
                  show={showNext}
                  onToggle={() => setShowNext((v) => !v)}
                  autoComplete="new-password"
                  testId="input-new-password"
                />
                {next ? <StrengthBar strength={strength} /> : null}
                {strengthTooWeak ? (
                  <div
                    className="mt-2 text-[11.5px] flex items-start gap-1.5"
                    style={{ color: "var(--a-danger)" }}
                    data-testid="password-too-weak"
                  >
                    <span aria-hidden>⚠︎</span>
                    <span>
                      Contraseña demasiado débil. Combina mayúsculas, minúsculas, números y símbolos, o usa una frase de 12+ caracteres.
                    </span>
                  </div>
                ) : null}
              </div>

              <FieldPassword
                label="Confirmar nueva contraseña"
                value={confirm}
                onChange={setConfirm}
                show={showNext}
                onToggle={() => setShowNext((v) => !v)}
                autoComplete="new-password"
                testId="input-confirm-password"
                error={confirm && confirm !== next ? "Las contraseñas no coinciden" : null}
              />

              {next && current && next === current ? (
                <div className="text-[12px]" style={{ color: "var(--a-danger)" }}>
                  La nueva contraseña debe ser distinta de la actual.
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-2 border-t admin-border">
                <div className="text-[11.5px] admin-text-muted">
                  Al cambiarla, deberás iniciar sesión nuevamente en otros dispositivos.
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="admin-btn admin-btn-primary text-[13px] disabled:opacity-50"
                  data-testid="submit-change-password"
                >
                  {loading ? "Guardando…" : "Actualizar contraseña"}
                </button>
              </div>

              {lastChangeOk ? (
                <div
                  className="flex items-center gap-2 py-2 px-3 rounded-md text-[12.5px]"
                  style={{ background: "var(--a-surface-2)", color: "var(--a-text)" }}
                  data-testid="change-password-success"
                >
                  <CheckCircle size={14} weight="fill" style={{ color: "var(--a-accent)" }} />
                  Contraseña actualizada. Tu próxima sesión usará la nueva contraseña.
                </div>
              ) : null}
            </form>
          </AdminSection>

          <AdminSection
            title="Sesiones activas"
            description="Cerrar sesión en todos los dispositivos revoca cualquier JWT emitido para tu cuenta."
            className="mt-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12.5px] admin-text-muted max-w-md">
                Útil si sospechás que tu cuenta pudo ser accedida desde otro lugar,
                o si simplemente querés revocar todas las sesiones activas.
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-ghost text-[13px]"
                onClick={async () => {
                  if (!window.confirm("¿Cerrar sesión en todos los dispositivos? Deberás volver a iniciar sesión.")) return;
                  await logoutAll();
                  toast.success("Sesiones cerradas");
                  nav("/login", { replace: true });
                }}
                data-testid="logout-all-btn"
              >
                <SignOut size={12} className="mr-1" /> Cerrar en todos los dispositivos
              </button>
            </div>
          </AdminSection>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function InfoRow({ icon: Icon, label, value, subtitle, testId }) {
  return (
    <div className="flex items-start gap-2.5" data-testid={testId}>
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center mt-0.5"
        style={{ background: "var(--a-surface-2)" }}
      >
        <Icon size={13} style={{ color: "var(--a-text-muted)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium">
          {label}
        </div>
        <div className="text-[13px] truncate" style={{ color: "var(--a-text)" }}>
          {value || "—"}
        </div>
        {subtitle ? (
          <div className="text-[11px] admin-text-muted mt-0.5">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}

function FieldPassword({ label, value, onChange, show, onToggle, autoComplete, testId, error }) {
  return (
    <div>
      <label className="block text-[11.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full h-10 px-3 pr-10 rounded-md text-[13px] outline-none transition-colors"
          style={{
            background: "var(--a-surface-2)",
            border: `1px solid ${error ? "var(--a-danger)" : "var(--a-border)"}`,
            color: "var(--a-text)",
          }}
          data-testid={testId}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md hover:opacity-80"
          style={{ color: "var(--a-text-muted)" }}
          tabIndex={-1}
          aria-label={show ? "Ocultar" : "Mostrar"}
        >
          {show ? <EyeSlash size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error ? (
        <div className="text-[11.5px] mt-1" style={{ color: "var(--a-danger)" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

function passwordStrength(pw = "") {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

function StrengthBar({ strength }) {
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];
  const colors = ["var(--a-danger)", "#d97706", "#d97706", "var(--a-accent)", "var(--a-accent)"];
  return (
    <div className="mt-2" data-testid="password-strength">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background: i < strength ? colors[strength] : "var(--a-border)",
            }}
          />
        ))}
      </div>
      <div className="text-[11px] admin-text-muted mt-1">
        Fortaleza: {labels[strength]}
      </div>
    </div>
  );
}
