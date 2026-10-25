import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { auth as authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "./Login";
import { Button } from "@/components/ui/button";
import { CheckCircle, CircleNotch, EnvelopeSimple, WarningCircle } from "@phosphor-icons/react";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, refresh } = useAuth();
  const [state, setState] = useState(token ? "loading" : "error");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(token ? "" : "El enlace no incluye un token de verificación.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then(async (res) => {
        setEmail(res?.email || "");
        setState("success");
        if (user) await refresh();
      })
      .catch((e) => {
        const detail = e?.response?.data?.detail;
        const msg = typeof detail === "object" ? detail?.message : detail;
        setErr(msg || "No pudimos verificar tu correo. El enlace puede haber expirado.");
        setState("error");
      });
  }, [token, user, refresh]);

  const title =
    state === "success" ? "Correo confirmado" : state === "error" ? "No pudimos verificar el correo" : "Verificando tu correo";

  return (
    <AuthShell title={title} subtitle="Un paso más para recibir avisos útiles de tu proyecto.">
      <div className="app-card p-6">
        {state === "loading" ? (
          <div className="flex items-center gap-3">
            <CircleNotch size={22} className="animate-spin text-terracotta" />
            <div className="text-[13px] text-obsidian/55">Comprobando el enlace…</div>
          </div>
        ) : state === "success" ? (
          <>
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-olive/10 text-olive">
              <CheckCircle size={22} weight="duotone" />
            </span>
            <p className="text-[13px] leading-relaxed text-obsidian/55">
              {email ? (
                <>
                  Confirmamos <span className="font-medium text-obsidian/80">{email}</span>. Ya podemos avisarte
                  cuando tu plan tenga nuevas acciones o surjan oportunidades relevantes.
                </>
              ) : (
                "Tu correo quedó confirmado. Ya podemos avisarte cuando tu plan tenga nuevas acciones u oportunidades relevantes."
              )}
            </p>
            <div className="mt-5">
              <Link to={user ? "/dashboard" : "/login"}>
                <Button className="h-10 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
                  {user ? "Ir a mi panel" : "Iniciar sesión"}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-terracotta/10 text-terracotta">
              <WarningCircle size={22} weight="duotone" />
            </span>
            <p className="text-[13px] leading-relaxed text-obsidian/55">{err}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link to={user ? "/dashboard" : "/login"}>
                <Button className="h-10 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
                  {user ? "Volver al panel" : "Iniciar sesión"}
                </Button>
              </Link>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-obsidian/45">
                <EnvelopeSimple size={13} />
                Si ya iniciaste sesión, pide un enlace nuevo desde tu panel.
              </span>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  );
}
