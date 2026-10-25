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
    <AuthShell title="Crea tu cuenta" subtitle="Arma tu primer diagnóstico en menos de 5 minutos.">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tu nombre">
          <Input
            data-testid={AUTH.nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Nombre y apellido"
            className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
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
            placeholder="tu@correo.com"
            className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
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
            placeholder="Mínimo 6 caracteres"
            className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
          />
        </Field>
        {err ? <div data-testid={AUTH.errorMessage} className="text-[13px] text-terracotta">{err}</div> : null}
        <Button
          type="submit"
          disabled={busy}
          data-testid={AUTH.submitRegister}
          className="h-11 w-full rounded-control bg-obsidian px-8 text-[14px] font-medium text-alabaster transition-colors hover:bg-obsidian/90"
        >
          {busy ? "Creando…" : "Crear cuenta"}
        </Button>
        <div className="text-[13px] text-obsidian/55">
          ¿Ya tienes cuenta?{" "}
          <Link data-testid={AUTH.switchToLogin} to="/login" className="font-medium text-terracotta underline-offset-2 hover:underline">
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
      <div className="mb-1.5 text-[12px] font-medium text-obsidian/65">{label}</div>
      {children}
    </label>
  );
}
