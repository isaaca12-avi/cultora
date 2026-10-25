import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { AdminPageHeader, EmptyState, LoadingRows } from "@/components/admin/AdminUI";
import Pagination from "@/components/admin/Pagination";
import { MagnifyingGlass, ClockCounterClockwise } from "@phosphor-icons/react";

const DEFAULTS = { action: "", target: "", page: 1 };

export default function AdminActivity() {
  const { values: f, set: setFilter } = useUrlFilters(DEFAULTS);
  const [data, setData] = useState(null);

  const load = async () => {
    setData(null);
    const params = { page: f.page, limit: 30 };
    if (f.action) params.action = f.action;
    if (f.target) params.target_type = f.target;
    const r = await adminApi.activity.list(params);
    setData(r);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f.action, f.target, f.page]);

  const items = data?.items || null;

  return (
    <div data-testid="admin-activity">
      <AdminPageHeader
        title="Actividad"
        description="Bitácora de todas las acciones administrativas realizadas sobre la plataforma."
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-faint)" }} />
            <input className="admin-input pl-8 w-64" placeholder="Filtrar por acción…" defaultValue={f.action}
              onKeyDown={(e) => { if (e.key === "Enter") setFilter({ action: e.currentTarget.value, page: 1 }); }} />
          </div>
          <select className="admin-select w-44" value={f.target} onChange={(e) => setFilter({ target: e.target.value, page: 1 })}>
            <option value="">Todos los recursos</option>
            <option value="user">Usuarios</option>
            <option value="agent">Agentes</option>
            <option value="topic">Foro</option>
            <option value="convocatoria">Convocatorias</option>
            <option value="resource">Recursos</option>
            <option value="space">Espacios</option>
            <option value="role">Roles</option>
            <option value="config">Configuración</option>
          </select>
        </div>
      </AdminPageHeader>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}></th>
                <th>Actor</th>
                <th>Acción</th>
                <th>Recurso</th>
                <th>Detalles</th>
                <th>Fecha</th>
              </tr>
            </thead>
            {items === null ? <LoadingRows cols={6} /> : items.length === 0 ? (
              <tbody><tr><td colSpan={6}><EmptyState icon={ClockCounterClockwise} title="Sin actividad" description="Aún no se han registrado acciones que coincidan." /></td></tr></tbody>
            ) : (
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
                        <ClockCounterClockwise size={13} style={{ color: "var(--a-text-muted)" }} />
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">{a.actor_name || "—"}</div>
                      <div className="text-[11.5px] admin-text-muted">{a.actor_email || "—"}</div>
                    </td>
                    <td className="admin-text-muted"><code className="text-[11.5px]">{a.action}</code></td>
                    <td className="admin-text-muted">{a.target_type}{a.target_id ? <span className="admin-text-faint"> · {String(a.target_id).slice(0, 8)}</span> : null}</td>
                    <td className="admin-text-muted text-[12.5px]">
                      {a.meta && Object.keys(a.meta).length ? <code>{JSON.stringify(a.meta)}</code> : "—"}
                    </td>
                    <td className="admin-text-muted text-[12.5px] whitespace-nowrap">{new Date(a.at).toLocaleString("es")}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={(p) => setFilter({ page: p })} /> : null}
      </div>
    </div>
  );
}
