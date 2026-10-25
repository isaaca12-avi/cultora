import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Hook para sincronizar filtros de una tabla con la URL.
 *
 * - Cada filtro es una key: string. Valores vacíos se remueven de la URL.
 * - Devuelve values + setter genérico + reset.
 * - Los valores numéricos se convierten automáticamente si el `defaults` tiene number.
 *
 * Uso:
 *   const { values, set, reset } = useUrlFilters({ q: "", status: "", page: 1 });
 *   set({ q: "hola" }); // ?q=hola
 *   set({ q: "hola", page: 2 }); // ?q=hola&page=2
 *   reset(); // limpia todo
 */
export function useUrlFilters(defaults = {}) {
  const [sp, setSp] = useSearchParams();

  const values = useMemo(() => {
    const out = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const raw = sp.get(k);
      if (raw == null || raw === "") continue;
      out[k] = typeof defaults[k] === "number" ? Number(raw) : raw;
    }
    return out;
  }, [sp, defaults]);

  const set = useCallback((patch) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      const def = defaults[k];
      if (v === "" || v == null || v === def) next.delete(k);
      else next.set(k, String(v));
    }
    setSp(next, { replace: false });
  }, [sp, setSp, defaults]);

  const reset = useCallback(() => setSp(new URLSearchParams(), { replace: false }), [setSp]);

  return { values, set, reset };
}
