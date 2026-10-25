import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { AdminPageHeader, StatusPill, EmptyState, LoadingRows } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DetailDrawer, DetailSection, DetailRow, DetailHistory } from "@/components/admin/DetailDrawer";
import Pagination from "@/components/admin/Pagination";
import { MagnifyingGlass, DotsThreeVertical, ChatsCircle, PushPin, Star } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const DEFAULTS = { q: "", status: "open", page: 1, focus: "" };

export default function AdminForum() {
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
    const r = await adminApi.forum.list(params);
    setData(r);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f.q, f.status, f.page]);

  useEffect(() => {
    if (f.focus) adminApi.topicDetail(f.focus).then(setDetail).catch(() => {});
  }, [f.focus]);

  const openDetail = async (t) => {
    try { setDetail(await adminApi.topicDetail(t.id)); }
    catch { setDetail(null); }
  };
  const closeDetail = () => { setDetail(null); if (f.focus) setFilter({ focus: "" }); };

  const toggleFlag = async (t, field) => {
    try { await adminApi.forum.update(t.id, { [field]: !t[field] }); toast.success("Actualizado"); load(); if (detail?.topic?.id === t.id) openDetail(t); }
    catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const doClose = (t) => setConfirm({
    title: t.closed ? "Reabrir discusión" : "Cerrar discusión",
    description: `Se ${t.closed ? "reabrirá" : "cerrará"} el tema: "${t.title}".`,
    onConfirm: async () => {
      try { await adminApi.forum.update(t.id, { closed: !t.closed }); toast.success("Actualizado"); setConfirm(null); load(); if (detail?.topic?.id === t.id) openDetail(t); }
      catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
    },
  });

  const doDelete = (t) => setConfirm({
    title: "Eliminar tema",
    description: `Se eliminará "${t.title}" (eliminación lógica).`,
    variant: "danger",
    onConfirm: async () => {
      try { await adminApi.forum.remove(t.id); toast.success("Eliminado"); setConfirm(null); closeDetail(); load(); }
      catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
    },
  });

  const items = data?.items || null;

  return (
    <div data-testid="admin-forum">
      <AdminPageHeader title="Foro" description="Modera discusiones, gestiona destacados y limpia spam.">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-faint)" }} />
            <input className="admin-input pl-8 w-64" placeholder="Buscar en el foro…" defaultValue={f.q}
              onKeyDown={(e) => { if (e.key === "Enter") setFilter({ q: e.currentTarget.value, page: 1 }); }} />
          </div>
          <select className="admin-select w-44" value={f.status} onChange={(e) => setFilter({ status: e.target.value, page: 1 })}>
            <option value="open">Activos</option>
            <option value="closed">Cerrados</option>
            <option value="deleted">Eliminados</option>
          </select>
        </div>
      </AdminPageHeader>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tema</th>
                <th>Categoría</th>
                <th>Autor</th>
                <th>Respuestas</th>
                <th>Estado</th>
                <th>Marcas</th>
                <th className="text-right pr-4" style={{ width: 60 }}></th>
              </tr>
            </thead>
            {items === null ? <LoadingRows cols={7} /> : items.length === 0 ? (
              <tbody><tr><td colSpan={7}><EmptyState icon={ChatsCircle} title="Sin temas" description="Ajusta los filtros." /></td></tr></tbody>
            ) : (
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} onClick={() => openDetail(t)} className="cursor-pointer">
                    <td className="max-w-[380px]">
                      <div className="font-medium truncate" style={{ color: "var(--a-text)" }}>{t.title}</div>
                      <div className="text-[11.5px] admin-text-muted mt-0.5">{new Date(t.created_at).toLocaleDateString("es")}</div>
                    </td>
                    <td className="admin-text-muted">{t.category}</td>
                    <td className="admin-text-muted">{t.author_name || "—"}</td>
                    <td className="admin-text-muted">{t.replies_count ?? 0}</td>
                    <td><StatusPill status={t.deleted_at ? "deleted" : (t.closed ? "closed" : "active")} /></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {t.pinned ? <span className="admin-chip admin-chip-accent"><PushPin size={10} weight="fill" />Fijado</span> : null}
                        {t.featured ? <span className="admin-chip admin-chip-accent"><Star size={10} weight="fill" />Destacado</span> : null}
                      </div>
                    </td>
                    <td className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="admin-btn admin-btn-icon admin-btn-ghost"><DotsThreeVertical size={16} weight="bold" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[220px] p-1 shadow-lg"
                          style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}>
                          {has("forum.pin") ? (
                            <>
                              <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => toggleFlag(t, "pinned")}>{t.pinned ? "Quitar fijado" : "Fijar"}</DropdownMenuItem>
                              <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => toggleFlag(t, "featured")}>{t.featured ? "Quitar destacado" : "Destacar"}</DropdownMenuItem>
                              <DropdownMenuSeparator style={{ background: "var(--a-border)" }} />
                            </>
                          ) : null}
                          {has("forum.close") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => doClose(t)}>{t.closed ? "Reabrir" : "Cerrar"}</DropdownMenuItem>
                          ) : null}
                          {has("forum.delete") && !t.deleted_at ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-danger)" }} onClick={() => doDelete(t)}>Eliminar</DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={(p) => setFilter({ page: p })} /> : null}
      </div>

      <TopicDetailDrawer
        detail={detail}
        onClose={closeDetail}
        has={has}
        onToggleFlag={(field) => toggleFlag(detail.topic, field)}
        onClose_={() => doClose(detail.topic)}
        onDelete={() => doDelete(detail.topic)}
      />

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title} description={confirm?.description}
        onConfirm={confirm?.onConfirm} variant={confirm?.variant} />
    </div>
  );
}

function TopicDetailDrawer({ detail, onClose, has, onToggleFlag, onClose_, onDelete }) {
  if (!detail) return null;
  const t = detail.topic;
  return (
    <DetailDrawer open={!!detail} onClose={onClose} title={t.title} subtitle={`${t.category} · ${t.author_name || "—"}`}
      description="Detalle del tema" testId="admin-topic-detail" width="640px">
      <DetailSection title="Contenido">
        <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--a-text)" }}>
          {t.body}
        </div>
      </DetailSection>

      <DetailSection title="Metadatos">
        <DetailRow label="Categoría" value={t.category} />
        <DetailRow label="Autor" value={t.author_name} />
        <DetailRow label="Creado" value={new Date(t.created_at).toLocaleString("es")} />
        <DetailRow label="Actualizado" value={new Date(t.updated_at || t.created_at).toLocaleString("es")} />
        <DetailRow label="Estado" value={<StatusPill status={t.deleted_at ? "deleted" : (t.closed ? "closed" : "active")} />} />
        <DetailRow label="Fijado" value={t.pinned ? "Sí" : "No"} />
        <DetailRow label="Destacado" value={t.featured ? "Sí" : "No"} />
      </DetailSection>

      <DetailSection title="Acciones">
        <div className="flex flex-wrap gap-2">
          {has("forum.pin") ? (
            <>
              <button className="admin-btn" onClick={() => onToggleFlag("pinned")}>{t.pinned ? "Quitar fijado" : "Fijar"}</button>
              <button className="admin-btn" onClick={() => onToggleFlag("featured")}>{t.featured ? "Quitar destacado" : "Destacar"}</button>
            </>
          ) : null}
          {has("forum.close") ? (
            <button className="admin-btn" onClick={onClose_}>{t.closed ? "Reabrir" : "Cerrar"}</button>
          ) : null}
          {has("forum.delete") && !t.deleted_at ? (
            <button className="admin-btn admin-btn-danger" onClick={onDelete}>Eliminar</button>
          ) : null}
        </div>
      </DetailSection>

      {detail.replies?.length ? (
        <DetailSection title={`Respuestas (${detail.replies.length})`}>
          <ul className="space-y-3">
            {detail.replies.map(r => (
              <li key={r.id} className="text-[12.5px]">
                <div className="font-medium" style={{ color: "var(--a-text)" }}>{r.author_name || "—"}</div>
                <div className="admin-text-muted mt-0.5 whitespace-pre-wrap">{r.body}</div>
                <div className="text-[10.5px] admin-text-faint mt-1">{new Date(r.created_at).toLocaleString("es")}</div>
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      <DetailSection title="Historial de moderación">
        <DetailHistory items={detail.history || []} />
      </DetailSection>
    </DetailDrawer>
  );
}
