import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth as authApi } from "@/lib/api";
import { AuthShell } from "./Login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";

export default function RecuperarPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      setDevLink(res?.dev_link || "");
      setSent(true);
    } catch (e) {
      const msg =
        e?.response?.data?.detail?.message ||
        e?.response?.data?.detail ||
        "No pudimos procesar la solicitud. Inténtalo de nuevo.";
      setErr(typeof msg === "string" ? msg : "No pudimos procesar la solicitud.");
      toast.error("No pudimos enviar el enlace");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Revisa tu correo"
        subtitle="Si la dirección está registrada, enviamos un enlace para crear una nueva contraseña."
      >
        <div className="app-card p-6">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-olive/10 text-olive">
            <CheckCircle size={22} weight="duotone" />
          </span>
          <div className="font-display text-[16px] font-semibold tracking-tight text-obsidian">
            Solicitud enviada
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-obsidian/55">
            Revisa la bandeja de entrada de <span className="font-medium text-obsidian/80">{email}</span> y también
            la carpeta de spam. El enlace vence en 60 minutos y sólo puede usarse una vez.
          </p>

          {devLink ? (
            <div className="mt-4 rounded-lg border border-terracotta/20 bg-terracotta/5 p-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">
                Entorno de desarrollo
              </div>
              <a
                href={devLink}
                className="mt-1 block break-all text-[12px] font-medium text-terracotta underline underline-offset-2"
              >
                Abrir enlace de restablecimiento
              </a>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setSent(false);
                setDevLink("");
              }}
              variant="outline"
              className="h-10 rounded-lg border-obsidian/15 bg-white text-[13px] hover:bg-linen/60"
            >
              Usar otro correo
            </Button>
            <Link to="/login">
              <Button className="h-10 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
                Volver a iniciar sesión
              </Button>
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recupera tu acceso"
      subtitle="Escribe el correo con el que te registraste y te enviaremos un enlace para crear una nueva contraseña."
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <div className="mb-1.5 text-[12px] font-medium text-obsidian/65">Correo electrónico</div>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            className="h-11 rounded-control border-obsidian/10 bg-white px-3.5 text-[14px] placeholder:text-obsidian/30 focus-visible:ring-terracotta/20"
          />
        </label>

        {err ? (
          <div className="rounded-lg border border-terracotta/20 bg-terracotta/5 px-3 py-2 text-[12.5px] text-terracotta">
            {err}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-control bg-obsidian text-[13.5px] font-medium text-alabaster hover:bg-obsidian/90 disabled:opacity-60"
        >
          {busy ? "Enviando…" : (
            <>
              Enviar enlace
              <PaperPlaneTilt size={15} className="ml-2" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-[12.5px]">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-obsidian/55 transition-colors hover:text-obsidian">
          <ArrowLeft size={13} />
          Volver a iniciar sesión
        </Link>
        <Link to="/registro" className="font-medium text-terracotta underline-offset-2 hover:underline">
          Crear cuenta
        </Link>
      </div>
    </AuthShell>
  );
}
