import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { auth as authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "./Login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCircle, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";

const RULES = [
  { key: "length", label: "Al menos 10 caracteres", test: (v) => v.length >= 10 },
  { key: "upper", label: "Una letra mayúscula", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "Una letra minúscula", test: (v) => /[a-z]/.test(v) },
  { key: "digit", label: "Un número", test: (v) => /\d/.test(v) },
];

export default function RestablecerPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, setUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const valid = checks.every((c) => c.ok) && password === confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setErr("");
    try {
      await authApi.resetPassword(token, password);
      if (user) {
        localStorage.removeItem("cultora_token");
        setUser(null);
      }
      setDone(true);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "object" ? detail?.message : detail;
      setErr(msg || "No pudimos actualizar tu contraseña. Solicita un enlace nuevo.");
      toast.error("No pudimos actualizar la contraseña");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Enlace no válido" subtitle="Este enlace está incompleto o ya expiró.">
        <div className="app-card p-6">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-terracotta/10 text-terracotta">
            <WarningCircle size={22} weight="duotone" />
          </span>
          <p className="text-[13px] leading-relaxed text-obsidian/55">
            Los enlaces de restablecimiento vencen a los 60 minutos y sólo pueden usarse una vez.
          </p>
          <Link to="/recuperar-password" className="mt-5 inline-block">
            <Button className="h-10 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
              Solicitar un enlace nuevo
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Contraseña actualizada" subtitle="Cierra sesión en tus otros dispositivos por seguridad.">
        <div className="app-card p-6">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-olive/10 text-olive">
            <CheckCircle size={22} weight="duotone" />
          </span>
          <p className="text-[13px] leading-relaxed text-obsidian/55">
            Tu nueva contraseña ya está activa. Por seguridad, cerramos todas las sesiones anteriores.
          </p>
          <Link to="/login" className="mt-5 inline-block">
            <Button className="h-10 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crea una nueva contraseña"
      subtitle="Elige una contraseña que recuerdes y que no uses en otros servicios."
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <div className="mb-1.5 text-[12px] font-medium text-obsidian/65">Nueva contraseña</div>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Mínimo 10 caracteres"
              className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 pr-11 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-obsidian/35 transition-colors hover:bg-linen/60 hover:text-obsidian/70"
            >
              {show ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="block">
          <div className="mb-1.5 text-[12px] font-medium text-obsidian/65">Repite la contraseña</div>
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
          />
        </label>

        <div className="rounded-xl border border-obsidian/8 bg-white p-3.5">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-obsidian/40">
            Requisitos
          </div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {checks.map((c) => (
              <li
                key={c.key}
                className={`flex items-center gap-1.5 text-[12px] ${c.ok ? "text-olive" : "text-obsidian/45"}`}
              >
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full border ${
                    c.ok ? "border-olive/25 bg-olive/10" : "border-obsidian/15"
                  }`}
                >
                  {c.ok ? <Check size={9} weight="bold" /> : null}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
          {confirm && password !== confirm ? (
            <div className="mt-2 text-[12px] text-terracotta">Las contraseñas no coinciden.</div>
          ) : null}
        </div>

        {err ? (
          <div className="rounded-lg border border-terracotta/20 bg-terracotta/5 px-3 py-2 text-[12.5px] text-terracotta">
            {err}
            <Link to="/recuperar-password" className="ml-1 font-medium underline underline-offset-2">
              Solicitar otro enlace
            </Link>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={busy || !valid}
          className="h-11 w-full rounded-control bg-obsidian text-[13.5px] font-medium text-alabaster hover:bg-obsidian/90 disabled:opacity-50"
        >
          {busy ? "Actualizando…" : "Guardar nueva contraseña"}
        </Button>
      </form>

      <div className="mt-5">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-obsidian/55 transition-colors hover:text-obsidian"
        >
          <ArrowLeft size={13} />
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthShell>
  );
}
