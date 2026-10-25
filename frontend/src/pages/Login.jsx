import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AUTH } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const result = await login(email, password);
      toast.success("Bienvenida/o de vuelta");
      // Redirect inteligente: los admin van directo al panel; usuarios al dashboard
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
    <AuthShell subtitle="Continúa donde lo dejaste">
      <form onSubmit={submit} className="space-y-6">
        <Field label="Correo electrónico">
          <Input
            data-testid={AUTH.emailInput}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-12 bg-white border-obsidian/15"
          />
        </Field>
        <Field label="Contraseña">
          <Input
            data-testid={AUTH.passwordInput}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-12 bg-white border-obsidian/15"
          />
        </Field>
        {err ? <div data-testid={AUTH.errorMessage} className="text-sm text-terracotta">{err}</div> : null}
        <Button
          type="submit"
          disabled={busy}
          data-testid={AUTH.submitLogin}
          className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-8 w-full lift"
        >
          {busy ? "Entrando…" : "Entrar"}
        </Button>
        <div className="text-sm text-obsidian/60">
          ¿Aún no tienes cuenta?{" "}
          <Link data-testid={AUTH.switchToRegister} to="/registro" className="text-terracotta hover:underline font-medium">
            Regístrate
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ subtitle, children }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative z-10">
      <div className="p-8 md:p-12 flex flex-col justify-between border-r border-obsidian/10">
        <Link to="/" className="inline-block">
          <div className="font-mono-meta text-obsidian/50">plataforma</div>
          <div className="font-serif-display text-3xl leading-none">Cultora</div>
        </Link>
        <div className="max-w-md">
          <div className="font-mono-meta text-terracotta mb-4">bienvenida/o</div>
          <h1 className="font-serif-display text-5xl mb-4">Consultoría cultural, hecha a tu medida.</h1>
          <p className="text-obsidian/70 leading-relaxed">{subtitle}</p>
        </div>
        <div className="font-mono-meta text-obsidian/40">© Cultora</div>
      </div>
      <div className="p-8 md:p-12 flex items-center bg-alabaster">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="font-mono-meta text-obsidian/60 mb-2">{label}</div>
      {children}
    </label>
  );
}
