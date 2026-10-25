import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AUTH } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowRight,
  ChartLineUp,
  CheckCircle,
  Compass,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const result = await login(email, password);
      toast.success("Bienvenida/o de vuelta");
      const isAdmin = Boolean(result?.is_admin || result?.admin_role);
      nav(isAdmin ? "/admin" : "/dashboard");
    } catch (e) {
      const msg = e?.response?.data?.detail || "No pudimos iniciar sesión";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Hola de nuevo" subtitle="Continúa donde lo dejaste.">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Correo electrónico">
          <Input
            data-testid={AUTH.emailInput}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
          />
        </Field>
        <Field label="Contraseña">
          <div className="relative">
            <Input
              data-testid={AUTH.passwordInput}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 pr-11 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-obsidian/40 transition-colors hover:bg-linen/70 hover:text-obsidian/70"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <Link to="/recuperar-password" className="text-[12.5px] font-medium text-obsidian/55 underline-offset-2 transition-colors hover:text-terracotta hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {err ? <div data-testid={AUTH.errorMessage} className="text-[13px] text-terracotta">{err}</div> : null}

        <Button
          type="submit"
          disabled={busy}
          data-testid={AUTH.submitLogin}
          className="h-11 w-full rounded-control bg-obsidian px-8 text-[14px] font-medium text-alabaster transition-colors hover:bg-obsidian/90"
        >
          {busy ? "Entrando…" : "Entrar"}
          {!busy ? <ArrowRight size={16} className="ml-1.5" /> : null}
        </Button>

        <div className="text-[13px] text-obsidian/55">
          ¿Aún no tienes cuenta?{" "}
          <Link data-testid={AUTH.switchToRegister} to="/registro" className="font-medium text-terracotta underline-offset-2 hover:underline">
            Regístrate
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

const VALUE_POINTS = [
  { icon: Compass, title: "Un diagnóstico claro", text: "Traduce lo que quieres lograr en prioridades concretas." },
  { icon: ChartLineUp, title: "Un plan que avanza", text: "Tareas, indicadores y seguimiento en un solo lugar." },
  { icon: CheckCircle, title: "Sin humo", text: "Método sectorial curado, no respuestas genéricas." },
];

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-alabaster lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-obsidian p-10 text-alabaster lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-terracotta/20" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-olive/40" />
        <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-alabaster font-display text-lg font-extrabold text-obsidian">C</span>
          <span className="font-display text-xl font-bold tracking-tight">Cultora</span>
        </Link>

        <div className="relative z-10 max-w-lg">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-alabaster/15 bg-alabaster/5 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-alabaster/60">
              Copiloto estratégico
            </span>
          </div>
          <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight xl:text-[46px]">
            Gestión cultural profesional, sin consultoría de lujo.
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-alabaster/55">
            Diagnóstico, plan de acción y seguimiento para artistas, colectivos y espacios culturales.
          </p>

          <div className="mt-10 space-y-4">
            {VALUE_POINTS.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-alabaster/10 bg-alabaster/5 text-terracotta">
                    <Icon size={15} weight="duotone" />
                  </span>
                  <div>
                    <div className="text-[13px] font-medium text-alabaster/90">{v.title}</div>
                    <div className="text-[12px] leading-relaxed text-alabaster/45">{v.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-alabaster/30">© Cultora · cultora.net</div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <Link to="/" className="mb-10 inline-flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-obsidian font-display text-lg font-extrabold text-alabaster">C</span>
            <span className="font-display text-xl font-bold tracking-tight text-obsidian">Cultora</span>
          </Link>

          <div className="mb-8">
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Cuenta</div>
            <h2 className="font-display text-[28px] font-semibold tracking-tight text-obsidian">{title || "Tu cuenta"}</h2>
            {subtitle ? <p className="mt-1.5 text-[13.5px] leading-relaxed text-obsidian/50">{subtitle}</p> : null}
          </div>

          {children}

          <div className="mt-10 flex items-center justify-between border-t border-obsidian/8 pt-4 text-[11px] text-obsidian/35">
            <Link to="/vision" className="transition-colors hover:text-obsidian/60">Visión y hoja de ruta</Link>
            <Link to="/" className="transition-colors hover:text-obsidian/60">Volver al inicio</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12px] font-medium text-obsidian/65">{label}</div>
      {children}
    </label>
  );
}
