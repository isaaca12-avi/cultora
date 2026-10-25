import React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

/**
 * Paginador compacto tipo Linear/Vercel.
 * Muestra "X–Y de N · Página P" + prev/next.
 */
export default function Pagination({ page, limit, total, onPageChange, className = "" }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 50);
  const t = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(t / l));
  const start = t === 0 ? 0 : (p - 1) * l + 1;
  const end = Math.min(p * l, t);

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 border-t admin-border ${className}`}
      style={{ background: "var(--a-surface)" }}
      data-testid="admin-pagination"
    >
      <div className="text-[11.5px] admin-text-muted">
        {t === 0 ? (
          <span>Sin resultados</span>
        ) : (
          <>
            <span className="font-medium" style={{ color: "var(--a-text)" }}>{start}–{end}</span>
            <span> de {t.toLocaleString("es")}</span>
            <span className="admin-text-faint mx-2">·</span>
            <span>Página {p} de {totalPages}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          className="admin-btn admin-btn-icon admin-btn-ghost"
          disabled={p <= 1}
          onClick={() => onPageChange(p - 1)}
          aria-label="Página anterior"
          data-testid="admin-pagination-prev"
        >
          <CaretLeft size={13} weight="bold" />
        </button>
        <button
          className="admin-btn admin-btn-icon admin-btn-ghost"
          disabled={p >= totalPages}
          onClick={() => onPageChange(p + 1)}
          aria-label="Página siguiente"
          data-testid="admin-pagination-next"
        >
          <CaretRight size={13} weight="bold" />
        </button>
      </div>
    </div>
  );
}
