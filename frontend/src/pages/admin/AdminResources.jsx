import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { AdminPageHeader, StatusPill, EmptyState, LoadingRows } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MagnifyingGlass, DotsThreeVertical, BookOpen, Plus, X, FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";

const KINDS = ["articulo", "guia", "documento", "plantilla"];
const EMPTY = { title: "", kind: "articulo", category: "", summary: "", body: "", url: "", tags: [], status: "draft" };

export default function AdminResources() {
  const { has } = useAdmin();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setItems(null);
    const params = {};
    if (q) params.q = q;
    if (kind) params.kind = kind;
    const r = await adminApi.resources.list(params);
    setItems(r.items || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async (payload) => {
    try {
      if (editing.__new) await adminApi.resources.create(payload);
      else await adminApi.resources.update(editing.id, payload);
      toast.success("Guardado");
      setEditing(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const remove = (r) => setConfirm({
    title: `Eliminar recurso`,
    description: `Se eliminará "${r.title}" (eliminación lógica).`,
    variant: "danger",
    onConfirm: async () => {
      try { await adminApi.resources.remove(r.id); toast.success("Eliminado"); setConfirm(null); load(); }
      catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
    },
  });

  return (
    <div data-testid="admin-resources">
      <AdminPageHeader
        title="Recursos"
        description="Biblioteca de artículos, guías, documentos y plantillas."
        actions={has("resources.create") ? (
          <button className="admin-btn admin-btn-accent" onClick={() => setEditing({ ...EMPTY, __new: true })}>
            <Plus size={13} weight="bold" /> Nuevo recurso
          </button>
        ) : null}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-faint)" }} />
            <input className="admin-input pl-8 w-64" placeholder="Buscar recurso…" value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          </div>
          <select className="admin-select w-40" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Todos los tipos</option>
            {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <button className="admin-btn admin-btn-primary" onClick={load}>Aplicar</button>
        </div>
      </AdminPageHeader>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Actualizado</th>
                <th className="text-right pr-4">Acciones</th>
              </tr>
            </thead>
            {items === null ? <LoadingRows cols={6} /> : items.length === 0 ? (
              <tbody><tr><td colSpan={6}><EmptyState icon={BookOpen} title="Sin recursos" description="Crea el primero para poblar la biblioteca." /></td></tr></tbody>
            ) : (
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-[380px]">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-[11.5px] admin-text-muted mt-0.5 truncate">{r.summary}</div>
                    </td>
                    <td className="admin-text-muted capitalize">{r.kind}</td>
                    <td className="admin-text-muted">{r.category}</td>
                    <td><StatusPill status={r.status === "published" ? "published" : "draft"} /></td>
                    <td className="admin-text-muted text-[12.5px]">{r.updated_at ? new Date(r.updated_at).toLocaleDateString("es") : "—"}</td>
                    <td className="text-right pr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="admin-btn admin-btn-icon admin-btn-ghost"><DotsThreeVertical size={16} weight="bold" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px] p-1 shadow-lg"
                          style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}>
                          {has("resources.edit") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => setEditing(r)}>Editar</DropdownMenuItem>
                          ) : null}
                          {has("resources.delete") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-danger)" }} onClick={() => remove(r)}>Eliminar</DropdownMenuItem>
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
      </div>

      <ResourceEditor resource={editing} onClose={() => setEditing(null)} onSave={save} />
      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title} description={confirm?.description}
        onConfirm={confirm?.onConfirm} variant={confirm?.variant} />
    </div>
  );
}

function ResourceEditor({ resource, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  useEffect(() => { if (resource) setForm({ ...EMPTY, ...resource }); }, [resource]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.title || !form.category) return toast.error("Título y categoría son obligatorios");
    const p = { ...form };
    ["__new", "id", "created_at", "updated_at", "created_by", "deleted_at"].forEach(k => delete p[k]);
    if (typeof p.tags === "string") p.tags = p.tags.split(",").map(s => s.trim()).filter(Boolean);
    onSave(p);
  };

  return (
    <Sheet open={!!resource} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 border-0 shadow-2xl" style={{ background: "var(--a-surface)", color: "var(--a-text)" }}>
        <SheetHeader className="px-6 py-4 border-b admin-border flex-row items-center justify-between">
          <SheetTitle className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
            {resource?.__new ? "Nuevo recurso" : "Editar recurso"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Formulario de {resource?.__new ? "creación" : "edición"} de un recurso de la biblioteca.
          </SheetDescription>
          <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={onClose}><X size={15} /></button>
        </SheetHeader>
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-134px)]">
          <Field label="Título"><input className="admin-input" value={form.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select className="admin-select" value={form.kind || "articulo"} onChange={(e) => set("kind", e.target.value)}>
                {KINDS.map(k => <option key={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select className="admin-select" value={form.status || "draft"} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </Field>
          </div>
          <Field label="Categoría"><input className="admin-input" value={form.category || ""} onChange={(e) => set("category", e.target.value)} /></Field>
          <Field label="Resumen"><textarea className="admin-textarea" rows={2} value={form.summary || ""} onChange={(e) => set("summary", e.target.value)} /></Field>
          <Field label="Contenido"><textarea className="admin-textarea" rows={8} value={form.body || ""} onChange={(e) => set("body", e.target.value)} /></Field>
          <Field label="URL externa (opcional)"><input className="admin-input" value={form.url || ""} onChange={(e) => set("url", e.target.value)} /></Field>
          <Field label="Etiquetas (coma separado)">
            <input className="admin-input"
              value={Array.isArray(form.tags) ? form.tags.join(", ") : (form.tags || "")}
              onChange={(e) => set("tags", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
          </Field>
        </div>
        <div className="px-6 py-4 border-t admin-border flex justify-end gap-2" style={{ background: "var(--a-surface-2)" }}>
          <button className="admin-btn admin-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-accent" onClick={submit}><FloppyDisk size={13} /> Guardar</button>
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
