import React from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowLeft } from "@phosphor-icons/react";

export default function AdminRestricted() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--a-bg)", color: "var(--a-text)" }}
      data-testid="admin-restricted"
    >
      <div className="admin-card p-10 max-w-md text-center">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: "var(--a-surface-2)" }}
        >
          <Lock size={22} weight="regular" style={{ color: "var(--a-text-muted)" }} />
        </div>
        <h1 className="text-[19px] font-semibold tracking-tight">Acceso restringido</h1>
        <p className="mt-2 text-sm admin-text-muted leading-relaxed">
          Tu cuenta no tiene permisos para acceder al panel administrativo.
          Si crees que esto es un error, contacta a un superadministrador.
        </p>
        <Link to="/dashboard" className="admin-btn admin-btn-primary mt-6 inline-flex" data-testid="admin-restricted-back">
          <ArrowLeft size={14} />
          Volver a la plataforma
        </Link>
      </div>
    </div>
  );
}
