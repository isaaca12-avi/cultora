import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { AdminPageHeader, StatusPill, EmptyState, LoadingRows } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MagnifyingGlass, DotsThreeVertical, Buildings, Plus, X, FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";

const EMPTY = {
  name: "", summary: "", description: "", address: "", city: "", country: "",
  capacity: null, equipment: [], contact_email: "", contact_phone: "", website: "", status: "active",
};

export default function AdminSpaces() {
  const { has } = useAdmin();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setItems(null);
    const params = {};
    if (q) params.q = q;
    const r = await adminApi.spaces.list(params);
    setItems(r.items || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async (payload) => {
    try {
      if (editing.__new) await adminApi.spaces.create(payload);
      else await adminApi.spaces.update(editing.id, payload);
      toast.success("Guardado");
      setEditing(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const remove = (s) => setConfirm({
    title: `Eliminar espacio`,
    description: `Se eliminará "${s.name}" (eliminación lógica).`,
    variant: "danger",
    onConfirm: async () => {
      try { await adminApi.spaces.remove(s.id); toast.success("Eliminado"); setConfirm(null); load(); }
      catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
    },
  });

  return (
    <div data-testid="admin-spaces">
      <AdminPageHeader
        title="Espacios"
        description="Espacios culturales, capacidad, equipamiento e información pública."
        actions={has("spaces.create") ? (
          <button className="admin-btn admin-btn-accent" onClick={() => setEditing({ ...EMPTY, __new: true })}>
            <Plus size={13} weight="bold" /> Nuevo espacio
          </button>
        ) : null}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-faint)" }} />
            <input className="admin-input pl-8 w-64" placeholder="Buscar espacio…" value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          </div>
          <button className="admin-btn admin-btn-primary" onClick={load}>Aplicar</button>
        </div>
      </AdminPageHeader>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ciudad</th>
                <th>País</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th className="text-right pr-4">Acciones</th>
              </tr>
            </thead>
            {items === null ? <LoadingRows cols={6} /> : items.length === 0 ? (
              <tbody><tr><td colSpan={6}><EmptyState icon={Buildings} title="Sin espacios" description="Registra el primero para comenzar a mapear el ecosistema local." /></td></tr></tbody>
            ) : (
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-[11.5px] admin-text-muted mt-0.5">{s.summary}</div>
                    </td>
                    <td className="admin-text-muted">{s.city || "—"}</td>
                    <td className="admin-text-muted">{s.country || "—"}</td>
                    <td className="admin-text-muted">{s.capacity ?? "—"}</td>
                    <td><StatusPill status={s.status || "active"} /></td>
                    <td className="text-right pr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="admin-btn admin-btn-icon admin-btn-ghost"><DotsThreeVertical size={16} weight="bold" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px] p-1 shadow-lg"
                          style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}>
                          {has("spaces.edit") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => setEditing(s)}>Editar</DropdownMenuItem>
                          ) : null}
                          {has("spaces.delete") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-danger)" }} onClick={() => remove(s)}>Eliminar</DropdownMenuItem>
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

      <SpaceEditor space={editing} onClose={() => setEditing(null)} onSave={save} />
      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title} description={confirm?.description}
        onConfirm={confirm?.onConfirm} variant={confirm?.variant} />
    </div>
  );
}

function SpaceEditor({ space, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  useEffect(() => { if (space) setForm({ ...EMPTY, ...space }); }, [space]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name) return toast.error("El nombre es obligatorio");
    const p = { ...form };
    ["__new", "id", "created_at", "updated_at", "created_by", "deleted_at"].forEach(k => delete p[k]);
    if (typeof p.equipment === "string") p.equipment = p.equipment.split(",").map(s => s.trim()).filter(Boolean);
    if (typeof p.capacity === "string" && p.capacity) p.capacity = Number(p.capacity);
    onSave(p);
  };

  return (
    <Sheet open={!!space} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 border-0 shadow-2xl" style={{ background: "var(--a-surface)", color: "var(--a-text)" }}>
        <SheetHeader className="px-6 py-4 border-b admin-border flex-row items-center justify-between">
          <SheetTitle className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
            {space?.__new ? "Nuevo espacio" : "Editar espacio"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Formulario de {space?.__new ? "creación" : "edición"} de un espacio cultural.
          </SheetDescription>
          <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={onClose}><X size={15} /></button>
        </SheetHeader>
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-134px)]">
          <Field label="Nombre"><input className="admin-input" value={form.name || ""} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Resumen"><input className="admin-input" value={form.summary || ""} onChange={(e) => set("summary", e.target.value)} /></Field>
          <Field label="Descripción"><textarea className="admin-textarea" rows={4} value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Dirección"><input className="admin-input" value={form.address || ""} onChange={(e) => set("address", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad"><input className="admin-input" value={form.city || ""} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="País"><input className="admin-input" value={form.country || ""} onChange={(e) => set("country", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacidad"><input className="admin-input" type="number" value={form.capacity ?? ""} onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Estado">
              <select className="admin-select" value={form.status || "active"} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Activo</option>
                <option value="draft">Borrador</option>
                <option value="closed">Cerrado</option>
              </select>
            </Field>
          </div>
          <Field label="Equipamiento (coma separado)">
            <input className="admin-input"
              value={Array.isArray(form.equipment) ? form.equipment.join(", ") : (form.equipment || "")}
              onChange={(e) => set("equipment", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email contacto"><input className="admin-input" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} /></Field>
            <Field label="Teléfono"><input className="admin-input" value={form.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
          </div>
          <Field label="Sitio web"><input className="admin-input" value={form.website || ""} onChange={(e) => set("website", e.target.value)} /></Field>
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
