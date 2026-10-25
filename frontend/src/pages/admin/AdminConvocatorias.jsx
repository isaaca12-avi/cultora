import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { AdminPageHeader, StatusPill, EmptyState, LoadingRows } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import Pagination from "@/components/admin/Pagination";
import { MagnifyingGlass, DotsThreeVertical, Megaphone, Plus, X, FloppyDisk } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";

const STATUSES = ["Borrador", "Programada", "Abierta", "Cerrada", "Archivada"];
const DEFAULTS = { q: "", status: "", page: 1, focus: "" };

const EMPTY = {
  title: "", entity: "", country: "", status: "Borrador",
  summary: "", description: "",
  types: [], areas: [], proponents: [], tags: [],
  open_date: "", close_date: "", publish_at: "",
  amount_min: null, amount_max: null, moneda: "USD",
  modalidad: "", source_name: "", source_url: "", official_url: "", requirements: "",
};

export default function AdminConvocatorias() {
  const { has } = useAdmin();
  const { values: f, set: setFilter } = useUrlFilters(DEFAULTS);
  const [data, setData] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setData(null);
    const params = { page: f.page, limit: 20 };
    if (f.q) params.q = f.q;
    if (f.status) params.status = f.status;
    const r = await adminApi.convocatorias.list(params);
    setData(r);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f.q, f.status, f.page]);

  useEffect(() => {
    if (f.focus) adminApi.convocatorias.get(f.focus).then(setEditing).catch(() => {});
  }, [f.focus]);

  const openNew = () => setEditing({ ...EMPTY, __new: true });
  const openEdit = async (c) => {
    try {
      const full = await adminApi.convocatorias.get(c.id);
      setEditing(full);
    } catch { setEditing(c); }
  };

  const save = async (payload) => {
    try {
      if (editing.__new) {
        await adminApi.convocatorias.create(payload);
        toast.success("Convocatoria creada");
      } else {
        await adminApi.convocatorias.update(editing.id, payload);
        toast.success("Convocatoria actualizada");
      }
      closeEditor();
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error al guardar"); }
  };

  const closeEditor = () => {
    setEditing(null);
    if (f.focus) setFilter({ focus: "" });
  };

  const changeStatus = (c, newStatus, label, variant = "default") => setConfirm({
    title: `${label}: ${c.title}`,
    description: `El estado pasará a "${newStatus}". Se registrará en la bitácora.`,
    variant,
    onConfirm: async () => {
      try { await adminApi.convocatorias.setStatus(c.id, newStatus); toast.success("Actualizada"); setConfirm(null); load(); }
      catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
    },
  });

  const duplicate = async (c) => {
    try { await adminApi.convocatorias.duplicate(c.id); toast.success("Duplicada como borrador"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const items = data?.items || null;

  return (
    <div data-testid="admin-convocatorias">
      <AdminPageHeader
        title="Convocatorias"
        description="Directorio de becas, fondos, residencias y premios. Se marcan automáticamente como cerradas al vencer."
        actions={has("convocatorias.create") ? (
          <button className="admin-btn admin-btn-accent" onClick={openNew} data-testid="admin-conv-new">
            <Plus size={13} weight="bold" /> Nueva convocatoria
          </button>
        ) : null}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-faint)" }} />
            <input className="admin-input pl-8 w-64" placeholder="Buscar convocatoria…" defaultValue={f.q}
              onKeyDown={(e) => { if (e.key === "Enter") setFilter({ q: e.currentTarget.value, page: 1 }); }} />
          </div>
          <select className="admin-select w-44" value={f.status} onChange={(e) => setFilter({ status: e.target.value, page: 1 })}>
            <option value="">Todos los estados</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </AdminPageHeader>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Entidad</th>
                <th>País</th>
                <th>Estado</th>
                <th>Cierre</th>
                <th className="text-right pr-4">Acciones</th>
              </tr>
            </thead>
            {items === null ? <LoadingRows cols={6} /> : items.length === 0 ? (
              <tbody><tr><td colSpan={6}><EmptyState icon={Megaphone} title="Sin convocatorias" description="Crea la primera o ajusta los filtros." /></td></tr></tbody>
            ) : (
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} data-testid={`admin-conv-row-${c.id}`} onClick={() => openEdit(c)} className="cursor-pointer">
                    <td className="max-w-[340px]">
                      <div className="font-medium truncate" style={{ color: "var(--a-text)" }}>{c.title}</div>
                      <div className="text-[11.5px] admin-text-muted mt-0.5 truncate">{(c.types || []).join(" · ")}</div>
                    </td>
                    <td className="admin-text-muted">{c.entity}</td>
                    <td className="admin-text-muted">{c.country}</td>
                    <td><StatusPill status={c.status} /></td>
                    <td className="admin-text-muted text-[12.5px]">{c.close_date || "—"}</td>
                    <td className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="admin-btn admin-btn-icon admin-btn-ghost">
                            <DotsThreeVertical size={16} weight="bold" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[220px] p-1 shadow-lg"
                          style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}>
                          {has("convocatorias.edit") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => openEdit(c)}>Editar</DropdownMenuItem>
                          ) : null}
                          {has("convocatorias.duplicate") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => duplicate(c)}>Duplicar</DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator style={{ background: "var(--a-border)" }} />
                          {has("convocatorias.publish") && c.status !== "Abierta" ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => changeStatus(c, "Abierta", "Publicar")}>Publicar</DropdownMenuItem>
                          ) : null}
                          {has("convocatorias.schedule") && c.status === "Borrador" ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => changeStatus(c, "Programada", "Programar")}>Programar</DropdownMenuItem>
                          ) : null}
                          {has("convocatorias.close") && c.status !== "Cerrada" ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => changeStatus(c, "Cerrada", "Cerrar")}>Cerrar</DropdownMenuItem>
                          ) : null}
                          {has("convocatorias.archive") && c.status !== "Archivada" ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-danger)" }} onClick={() => changeStatus(c, "Archivada", "Archivar", "danger")}>Archivar</DropdownMenuItem>
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

      <ConvocatoriaEditor
        conv={editing}
        onClose={closeEditor}
        onSave={save}
      />

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title} description={confirm?.description}
        onConfirm={confirm?.onConfirm} variant={confirm?.variant} />
    </div>
  );
}

function ConvocatoriaEditor({ conv, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (conv) setForm({ ...EMPTY, ...conv });
  }, [conv]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setList = (k, v) => set(k, v.split(",").map(s => s.trim()).filter(Boolean));

  const submit = () => {
    if (!form.title || !form.entity || !form.country) {
      toast.error("Título, entidad y país son obligatorios");
      return;
    }
    // clean payload
    const p = { ...form };
    delete p.__new;
    delete p.id;
    delete p.created_at;
    delete p.updated_at;
    delete p.created_by;
    delete p.deleted_at;
    onSave(p);
  };

  return (
    <Sheet open={!!conv} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] p-0 border-0 shadow-2xl"
        style={{ background: "var(--a-surface)", color: "var(--a-text)" }}
      >
        <SheetHeader className="px-6 py-4 border-b admin-border flex-row items-center justify-between">
          <SheetTitle className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
            {conv?.__new ? "Nueva convocatoria" : "Editar convocatoria"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Formulario para {conv?.__new ? "crear" : "editar"} una convocatoria.
          </SheetDescription>
          <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={onClose}>
            <X size={15} />
          </button>
        </SheetHeader>

        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-134px)]">
          <Field label="Título">
            <input className="admin-input" value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entidad"><input className="admin-input" value={form.entity || ""} onChange={(e) => set("entity", e.target.value)} /></Field>
            <Field label="País"><input className="admin-input" value={form.country || ""} onChange={(e) => set("country", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Estado">
              <select className="admin-select" value={form.status || "Borrador"} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Modalidad"><input className="admin-input" value={form.modalidad || ""} onChange={(e) => set("modalidad", e.target.value)} /></Field>
            <Field label="Moneda"><input className="admin-input" value={form.moneda || ""} onChange={(e) => set("moneda", e.target.value)} /></Field>
          </div>
          <Field label="Resumen"><textarea className="admin-textarea" rows={3} value={form.summary || ""} onChange={(e) => set("summary", e.target.value)} /></Field>
          <Field label="Descripción"><textarea className="admin-textarea" rows={5} value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Apertura"><input className="admin-input" type="date" value={form.open_date || ""} onChange={(e) => set("open_date", e.target.value)} /></Field>
            <Field label="Cierre"><input className="admin-input" type="date" value={form.close_date || ""} onChange={(e) => set("close_date", e.target.value)} /></Field>
            <Field label="Publicar (programado)"><input className="admin-input" type="date" value={form.publish_at || ""} onChange={(e) => set("publish_at", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto mínimo"><input className="admin-input" type="number" value={form.amount_min ?? ""} onChange={(e) => set("amount_min", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Monto máximo"><input className="admin-input" type="number" value={form.amount_max ?? ""} onChange={(e) => set("amount_max", e.target.value ? Number(e.target.value) : null)} /></Field>
          </div>

          <Field label="Tipos (coma separado)"><input className="admin-input" value={(form.types || []).join(", ")} onChange={(e) => setList("types", e.target.value)} /></Field>
          <Field label="Áreas (coma separado)"><input className="admin-input" value={(form.areas || []).join(", ")} onChange={(e) => setList("areas", e.target.value)} /></Field>
          <Field label="Proponentes (coma separado)"><input className="admin-input" value={(form.proponents || []).join(", ")} onChange={(e) => setList("proponents", e.target.value)} /></Field>
          <Field label="Etiquetas (coma separado)"><input className="admin-input" value={(form.tags || []).join(", ")} onChange={(e) => setList("tags", e.target.value)} /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fuente oficial (nombre)"><input className="admin-input" value={form.source_name || ""} onChange={(e) => set("source_name", e.target.value)} /></Field>
            <Field label="URL fuente"><input className="admin-input" value={form.source_url || ""} onChange={(e) => set("source_url", e.target.value)} /></Field>
          </div>
          <Field label="URL oficial"><input className="admin-input" value={form.official_url || ""} onChange={(e) => set("official_url", e.target.value)} /></Field>
          <Field label="Requisitos"><textarea className="admin-textarea" rows={3} value={form.requirements || ""} onChange={(e) => set("requirements", e.target.value)} /></Field>
        </div>

        <div className="px-6 py-4 border-t admin-border flex justify-end gap-2" style={{ background: "var(--a-surface-2)" }}>
          <button className="admin-btn admin-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-accent" onClick={submit} data-testid="admin-conv-save">
            <FloppyDisk size={13} weight="regular" /> Guardar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.1em] admin-text-faint font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
