import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { AdminPageHeader, StatusPill, EmptyState, LoadingRows } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DetailDrawer, DetailSection, DetailRow, DetailHistory } from "@/components/admin/DetailDrawer";
import Pagination from "@/components/admin/Pagination";
import { MagnifyingGlass, DotsThreeVertical, UsersFour, SealCheck } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const DEFAULTS = { q: "", status: "", page: 1, focus: "" };

export default function AdminAgents() {
  const { has } = useAdmin();
  const { values: f, set: setFilter } = useUrlFilters(DEFAULTS);
  const [data, setData] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setData(null);
    const params = { page: f.page, limit: 20 };
    if (f.q) params.q = f.q;
    if (f.status) params.status = f.status;
    const r = await adminApi.agents.list(params);
    setData(r);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f.q, f.status, f.page]);

  useEffect(() => {
    if (f.focus) {
      adminApi.agentDetail(f.focus).then(setDetail).catch(() => {});
    }
  }, [f.focus]);

  const openDetail = async (a) => {
    try { setDetail(await adminApi.agentDetail(a.user_id)); }
    catch { setDetail(null); }
  };

  const closeDetail = () => { setDetail(null); if (f.focus) setFilter({ focus: "" }); };

  const doStatus = (a, newStatus, label, variant = "default") => {
    setConfirm({
      title: `${label} agente ${a.name || a.public_agent?.name}`,
      description: `Se cambia el estado a "${label.toLowerCase()}" y queda registrado.`,
      variant,
      onConfirm: async () => {
        try {
          await adminApi.agents.setStatus(a.user_id, newStatus);
          toast.success("Agente actualizado");
          setConfirm(null);
          if (detail) openDetail({ user_id: detail.user_id });
          load();
        } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
      },
    });
  };

  const doVerify = async (a, verified) => {
    try {
      await adminApi.agents.verify(a.user_id, verified);
      toast.success(verified ? "Agente verificado" : "Verificación removida");
      if (detail) openDetail({ user_id: detail.user_id });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const items = data?.items || null;

  return (
    <div data-testid="admin-agents">
      <AdminPageHeader title="Agentes" description="Directorio público. Todos los agentes se muestran con igualdad visual.">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-faint)" }} />
            <input className="admin-input pl-8 w-64" placeholder="Buscar agente…" defaultValue={f.q}
              onKeyDown={(e) => { if (e.key === "Enter") setFilter({ q: e.currentTarget.value, page: 1 }); }}
              data-testid="admin-agents-search" />
          </div>
          <select className="admin-select w-44" value={f.status} onChange={(e) => setFilter({ status: e.target.value, page: 1 })}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="hidden">Ocultos</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>
      </AdminPageHeader>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Disciplina</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Verificado</th>
                <th>Actualizado</th>
                <th className="text-right pr-4" style={{ width: 60 }}></th>
              </tr>
            </thead>
            {items === null ? <LoadingRows cols={7} /> : items.length === 0 ? (
              <tbody><tr><td colSpan={7}><EmptyState icon={UsersFour} title="Sin agentes" description="Ajusta los filtros o espera nuevos registros." /></td></tr></tbody>
            ) : (
              <tbody>
                {items.map((a) => (
                  <tr key={a.user_id} onClick={() => openDetail(a)} className="cursor-pointer">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ background: "var(--a-surface-2)" }}>
                          {(a.name || "?")[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{a.name}</div>
                          <div className="text-[11.5px] admin-text-muted">{a.role || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="admin-text-muted">{a.discipline || "—"}</td>
                    <td className="admin-text-muted">{a.city || "—"}</td>
                    <td><StatusPill status={a.status} /></td>
                    <td>{a.verified ? <span className="admin-chip admin-chip-accent"><SealCheck size={11} weight="fill" />Verificado</span> : <span className="admin-text-faint text-xs">—</span>}</td>
                    <td className="admin-text-muted text-[12.5px]">{a.updated_at ? new Date(a.updated_at).toLocaleDateString("es") : "—"}</td>
                    <td className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                      <AgentActions a={a} has={has} onStatus={doStatus} onVerify={doVerify} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={(p) => setFilter({ page: p })} /> : null}
      </div>

      <AgentDetailDrawer detail={detail} onClose={closeDetail} has={has}
        onStatus={(newStatus, label, variant) => doStatus({ user_id: detail.user_id, name: detail.public_agent?.name }, newStatus, label, variant)}
        onVerify={(v) => doVerify({ user_id: detail.user_id }, v)} />

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title} description={confirm?.description}
        onConfirm={confirm?.onConfirm} variant={confirm?.variant} />
    </div>
  );
}

function AgentActions({ a, has, onStatus, onVerify }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="admin-btn admin-btn-icon admin-btn-ghost"><DotsThreeVertical size={16} weight="bold" /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px] p-1 shadow-lg"
        style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}>
        {has("agents.approve") && a.status !== "approved" ? (
          <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => onStatus(a, "approved", "Aprobar")}>Aprobar</DropdownMenuItem>
        ) : null}
        {has("agents.request_correction") ? (
          <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => onStatus(a, "pending", "Solicitar corrección")}>Solicitar corrección</DropdownMenuItem>
        ) : null}
        {has("agents.hide") && a.status !== "hidden" ? (
          <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => onStatus(a, "hidden", "Ocultar")}>Ocultar</DropdownMenuItem>
        ) : null}
        {has("agents.suspend") ? (
          <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-danger)" }} onClick={() => onStatus(a, "suspended", "Suspender", "danger")}>Suspender</DropdownMenuItem>
        ) : null}
        {has("agents.verify") ? (
          <>
            <DropdownMenuSeparator style={{ background: "var(--a-border)" }} />
            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => onVerify(a, !a.verified)}>
              {a.verified ? "Quitar verificación" : "Verificar"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AgentDetailDrawer({ detail, onClose, has, onStatus, onVerify }) {
  if (!detail) return null;
  const pa = detail.public_agent || {};
  return (
    <DetailDrawer
      open={!!detail}
      onClose={onClose}
      title={pa.name || "Agente"}
      subtitle={pa.role || pa.discipline}
      description="Detalle del agente"
      testId="admin-agent-detail"
    >
      <DetailSection title="Perfil público">
        <DetailRow label="Nombre" value={pa.name} />
        <DetailRow label="Rol" value={pa.role} />
        <DetailRow label="Disciplina" value={pa.discipline} />
        <DetailRow label="Ciudad" value={pa.city} />
        <DetailRow label="Estado" value={<StatusPill status={pa.status || (pa.published ? "approved" : "pending")} />} />
        <DetailRow label="Verificado" value={pa.verified ? "Sí" : "No"} />
        <DetailRow label="Bio" value={pa.bio} />
        <DetailRow label="Email" value={detail.email} />
      </DetailSection>

      <DetailSection title="Acciones">
        <div className="flex flex-wrap gap-2">
          {has("agents.approve") && pa.status !== "approved" ? (
            <button className="admin-btn admin-btn-accent" onClick={() => onStatus("approved", "Aprobar")}>Aprobar</button>
          ) : null}
          {has("agents.request_correction") ? (
            <button className="admin-btn" onClick={() => onStatus("pending", "Solicitar corrección")}>Solicitar corrección</button>
          ) : null}
          {has("agents.hide") && pa.status !== "hidden" ? (
            <button className="admin-btn" onClick={() => onStatus("hidden", "Ocultar")}>Ocultar</button>
          ) : null}
          {has("agents.suspend") ? (
            <button className="admin-btn admin-btn-danger" onClick={() => onStatus("suspended", "Suspender", "danger")}>Suspender</button>
          ) : null}
          {has("agents.verify") ? (
            <button className="admin-btn" onClick={() => onVerify(!pa.verified)}>
              {pa.verified ? "Quitar verificación" : "Verificar"}
            </button>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="Historial de moderación">
        <DetailHistory items={detail.history || []} />
      </DetailSection>
    </DetailDrawer>
  );
}
