import React from "react";

export function AdminPageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="mb-8" data-testid="admin-page-header">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[10.5px] uppercase tracking-[0.14em] mb-2 admin-text-faint font-medium">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
            {title}
          </h1>
          {description ? (
            <p className="text-sm mt-1 admin-text-muted max-w-2xl">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

export function AdminSection({ title, description, actions, children, className = "" }) {
  return (
    <section className={`admin-card p-5 md:p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title ? (
              <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
                {title}
              </h2>
            ) : null}
            {description ? <p className="text-xs mt-0.5 admin-text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, delta, hint, icon: Icon, testId }) {
  return (
    <div className="admin-card p-5" data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium">
          {label}
        </div>
        {Icon ? (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
            <Icon size={14} weight="regular" style={{ color: "var(--a-text-muted)" }} />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-[28px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
          {value}
        </div>
        {delta ? <span className="text-xs admin-text-muted">{delta}</span> : null}
      </div>
      {hint ? <div className="mt-1 text-xs admin-text-muted">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="admin-card p-10 text-center">
      {Icon ? (
        <div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
          <Icon size={20} weight="regular" style={{ color: "var(--a-text-muted)" }} />
        </div>
      ) : null}
      <div className="font-semibold text-[15px]" style={{ color: "var(--a-text)" }}>{title}</div>
      {description ? <p className="mt-1 text-sm admin-text-muted max-w-md mx-auto">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function StatusPill({ status, size = "sm" }) {
  const map = {
    active: { label: "Activo", cls: "admin-chip-success" },
    approved: { label: "Aprobado", cls: "admin-chip-success" },
    published: { label: "Publicado", cls: "admin-chip-success" },
    Abierta: { label: "Abierta", cls: "admin-chip-success" },
    pending: { label: "Pendiente", cls: "admin-chip-warn" },
    Programada: { label: "Programada", cls: "admin-chip-warn" },
    Borrador: { label: "Borrador", cls: "" },
    draft: { label: "Borrador", cls: "" },
    hidden: { label: "Oculto", cls: "" },
    closed: { label: "Cerrado", cls: "" },
    Cerrada: { label: "Cerrada", cls: "" },
    Archivada: { label: "Archivada", cls: "" },
    suspended: { label: "Suspendido", cls: "admin-chip-danger" },
    blocked: { label: "Bloqueado", cls: "admin-chip-danger" },
    deleted: { label: "Eliminado", cls: "admin-chip-danger" },
  };
  const info = map[status] || { label: status || "—", cls: "" };
  return <span className={`admin-chip ${info.cls}`}>{info.label}</span>;
}

export function LoadingRows({ cols = 5, rows = 6 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j}><div className="admin-skel h-4 w-3/4" /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
