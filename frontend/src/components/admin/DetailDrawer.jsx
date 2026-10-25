import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { X } from "@phosphor-icons/react";

/**
 * DetailDrawer — panel lateral premium para mostrar el detalle de un recurso.
 * Uso: <DetailDrawer open={x} onClose={...} title="..." meta={...}> contenido </DetailDrawer>
 */
export function DetailDrawer({
  open, onClose, title, subtitle, actions, children,
  description = "Detalle del registro seleccionado",
  width = "560px",
  testId,
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="p-0 border-0 shadow-2xl"
        style={{ background: "var(--a-surface)", color: "var(--a-text)", maxWidth: width, width: "100%" }}
        data-testid={testId}
      >
        <SheetHeader className="px-6 py-4 border-b admin-border flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <SheetTitle
              className="text-[16px] font-semibold tracking-tight truncate"
              style={{ color: "var(--a-text)" }}
            >
              {title}
            </SheetTitle>
            {subtitle ? (
              <div className="mt-0.5 text-[12px] admin-text-muted truncate">{subtitle}</div>
            ) : null}
            <SheetDescription className="sr-only">{description}</SheetDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <button
              className="admin-btn admin-btn-icon admin-btn-ghost"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X size={15} />
            </button>
          </div>
        </SheetHeader>
        <div className="overflow-y-auto h-[calc(100vh-68px)]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DetailSection({ title, children, className = "" }) {
  return (
    <section className={`px-6 py-5 border-b admin-border ${className}`}>
      {title ? (
        <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-3">
          {title}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function DetailRow({ label, value }) {
  return (
    <div className="flex items-start gap-4 py-1.5">
      <div className="w-32 shrink-0 text-[11.5px] admin-text-faint uppercase tracking-wider pt-0.5">
        {label}
      </div>
      <div className="min-w-0 flex-1 text-[13px]" style={{ color: "var(--a-text)" }}>
        {value == null || value === "" ? <span className="admin-text-faint">—</span> : value}
      </div>
    </div>
  );
}

export function DetailHistory({ items = [] }) {
  if (!items.length) return <div className="text-sm admin-text-muted">Sin registros previos.</div>;
  return (
    <ul className="space-y-2.5">
      {items.map((a) => (
        <li key={a.id} className="flex items-start gap-3">
          <div
            className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
            style={{ background: "var(--a-accent)" }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px]" style={{ color: "var(--a-text)" }}>
              <span className="font-medium">{a.actor_name || "—"}</span>{" "}
              <span className="admin-text-muted">· {a.action}</span>
            </div>
            <div className="text-[10.5px] admin-text-faint mt-0.5">
              {new Date(a.at).toLocaleString("es")}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
