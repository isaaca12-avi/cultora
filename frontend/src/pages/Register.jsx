import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AUTH } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/pages/Login";
import { toast } from "sonner";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await register(name, email, password);
      toast.success("Cuenta creada. Empecemos.");
      nav("/perfil");
    } catch (e) {
      const msg = e?.response?.data?.detail || "No pudimos crear la cuenta";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell subtitle="Crea tu cuenta y arma tu primer diagnóstico en menos de 5 minutos.">
      <form onSubmit={submit} className="space-y-6">
        <Field label="Tu nombre">
          <Input
            data-testid={AUTH.nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-12 bg-white border-obsidian/15"
          />
        </Field>
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
            minLength={6}
            autoComplete="new-password"
            className="h-12 bg-white border-obsidian/15"
          />
        </Field>
        {err ? <div data-testid={AUTH.errorMessage} className="text-sm text-terracotta">{err}</div> : null}
        <Button
          type="submit"
          disabled={busy}
          data-testid={AUTH.submitRegister}
          className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-8 w-full lift"
        >
          {busy ? "Creando…" : "Crear cuenta"}
        </Button>
        <div className="text-sm text-obsidian/60">
          ¿Ya tienes cuenta?{" "}
          <Link data-testid={AUTH.switchToLogin} to="/login" className="text-terracotta hover:underline font-medium">
            Inicia sesión
          </Link>
        </div>
      </form>
    </AuthShell>
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
