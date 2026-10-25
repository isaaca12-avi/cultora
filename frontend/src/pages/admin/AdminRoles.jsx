import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { AdminPageHeader, AdminSection, EmptyState } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { Shield, Plus, Copy, Trash, FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function AdminRoles() {
  const { has } = useAdmin();
  const [roles, setRoles] = useState(null);
  const [allPerms, setAllPerms] = useState([]);
  const [editing, setEditing] = useState(null); // {role} para custom | {duplicate:role} | {__new:true}
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setRoles(null);
    try {
      const [r, p] = await Promise.all([adminApi.roles.listAll(), adminApi.roles.permissions()]);
      setRoles(r.roles || []);
      setAllPerms(p.permissions || []);
    } catch { setRoles([]); }
  };
  useEffect(() => { load(); }, []);

  const doDelete = (role) => setConfirm({
    title: `Eliminar rol "${role.label}"`,
    description: "Solo se pueden eliminar roles custom que no tengan usuarios asignados.",
    variant: "danger",
    onConfirm: async () => {
      try { await adminApi.roles.remove(role.key); toast.success("Rol eliminado"); setConfirm(null); load(); }
      catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
    },
  });

  const save = async (payload) => {
    try {
      if (editing.__new) {
        await adminApi.roles.create(payload);
        toast.success("Rol creado");
      } else {
        const r = await adminApi.roles.update(editing.key, payload);
        if (r.users_synced) toast.success(`Guardado. Se sincronizaron ${r.users_synced} usuarios.`);
        else toast.success("Rol actualizado");
      }
      setEditing(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const duplicate = (role) => {
    setEditing({
      __new: true,
      key: `${role.key}_copia`,
      label: `${role.label} (copia)`,
      description: role.description || "",
      permissions: [...(role.permissions || [])],
    });
  };

  return (
    <div data-testid="admin-roles">
      <AdminPageHeader
        title="Roles y permisos"
        description="Los roles system son inmutables. Puedes crear roles custom o duplicar system para derivar variantes."
        actions={has("users.edit_role") ? (
          <button className="admin-btn admin-btn-accent" onClick={() => setEditing({ __new: true, key: "", label: "", description: "", permissions: [] })}
            data-testid="admin-roles-new">
            <Plus size={13} weight="bold" /> Nuevo rol
          </button>
        ) : null}
      >
        <Link to="/admin/configuracion" className="admin-btn admin-btn-ghost text-xs">← Volver a Configuración</Link>
      </AdminPageHeader>

      {roles === null ? (
        <div className="admin-card p-10 text-center admin-text-muted text-sm">Cargando…</div>
      ) : roles.length === 0 ? (
        <EmptyState icon={Shield} title="Sin roles" description="Aún no hay roles configurados." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roles.map((role) => (
            <RoleCard
              key={role.key}
              role={role}
              onEdit={() => !role.system && setEditing(role)}
              onDuplicate={() => duplicate(role)}
              onDelete={() => doDelete(role)}
              canManage={has("users.edit_role")}
            />
          ))}
        </div>
      )}

      <RoleEditor
        role={editing}
        allPerms={allPerms}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title} description={confirm?.description}
        onConfirm={confirm?.onConfirm} variant={confirm?.variant} />
    </div>
  );
}

function RoleCard({ role, onEdit, onDuplicate, onDelete, canManage }) {
  return (
    <div className="admin-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>{role.label}</div>
            {role.system ? <span className="admin-chip">System</span> : <span className="admin-chip admin-chip-accent">Custom</span>}
          </div>
          <div className="text-[12px] admin-text-muted mt-1 line-clamp-2">{role.description || "—"}</div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="admin-chip admin-chip-solid">{role.permissions_count} permisos</span>
            <code className="text-[10.5px] admin-text-faint">{role.key}</code>
          </div>
        </div>
      </div>
      {canManage ? (
        <div className="mt-4 flex gap-2 flex-wrap">
          {!role.system ? (
            <button className="admin-btn" onClick={onEdit}>Editar</button>
          ) : null}
          <button className="admin-btn admin-btn-ghost" onClick={onDuplicate}>
            <Copy size={12} weight="regular" /> Duplicar
          </button>
          {!role.system ? (
            <button className="admin-btn admin-btn-danger" onClick={onDelete}>
              <Trash size={12} weight="regular" /> Eliminar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RoleEditor({ role, allPerms, onClose, onSave }) {
  const [form, setForm] = useState({ key: "", label: "", description: "", permissions: [] });

  useEffect(() => {
    if (role) setForm({
      key: role.key || "",
      label: role.label || "",
      description: role.description || "",
      permissions: [...(role.permissions || [])],
    });
  }, [role]);

  const grouped = useMemo(() => {
    const g = {};
    for (const p of allPerms) { g[p.module] = g[p.module] || []; g[p.module].push(p); }
    return g;
  }, [allPerms]);

  const toggle = (key) => {
    const cur = form.permissions;
    setForm({ ...form, permissions: cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key] });
  };

  const toggleModule = (mod, on) => {
    const modKeys = grouped[mod].map(p => p.key);
    setForm({ ...form, permissions: on
      ? Array.from(new Set([...form.permissions, ...modKeys]))
      : form.permissions.filter(k => !modKeys.includes(k))
    });
  };

  const submit = () => {
    if (!form.label.trim()) return toast.error("Nombre requerido");
    if (role?.__new && !form.key.trim()) return toast.error("Clave requerida");
    onSave({
      key: form.key,
      label: form.label,
      description: form.description,
      permissions: form.permissions,
    });
  };

  const isNew = !!role?.__new;

  return (
    <DetailDrawer
      open={!!role}
      onClose={onClose}
      title={isNew ? "Nuevo rol" : `Editar: ${role?.label || ""}`}
      subtitle={isNew ? "Define permisos granulares" : role?.key}
      description="Editor de rol"
      width="620px"
      actions={
        <button className="admin-btn admin-btn-accent" onClick={submit} data-testid="admin-role-save">
          <FloppyDisk size={12} /> Guardar
        </button>
      }
    >
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.1em] admin-text-faint font-medium">Nombre</span>
            <input className="admin-input mt-1" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.1em] admin-text-faint font-medium">Clave</span>
            <input className="admin-input mt-1" value={form.key} disabled={!isNew}
              onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} />
          </label>
        </div>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.1em] admin-text-faint font-medium">Descripción</span>
          <textarea className="admin-textarea mt-1" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>

        <div className="pt-2">
          <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-3">
            Permisos · {form.permissions.length} seleccionados
          </div>
          <div className="space-y-5">
            {Object.entries(grouped).map(([mod, perms]) => {
              const modKeys = perms.map(p => p.key);
              const allOn = modKeys.every(k => form.permissions.includes(k));
              const someOn = modKeys.some(k => form.permissions.includes(k));
              return (
                <div key={mod} className="admin-surface p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--a-text)" }}>{mod}</div>
                    <button
                      className="admin-btn admin-btn-ghost text-[11px] px-2 h-6"
                      onClick={() => toggleModule(mod, !allOn)}
                    >
                      {allOn ? "Deseleccionar todos" : someOn ? "Seleccionar todos" : "Seleccionar todos"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {perms.map(p => (
                      <label key={p.key} className="flex items-center gap-2 py-1 cursor-pointer text-[12.5px]">
                        <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => toggle(p.key)} className="accent-current" />
                        <span style={{ color: "var(--a-text)" }}>{p.label}</span>
                        <code className="ml-auto text-[10.5px] admin-text-faint">{p.key}</code>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DetailDrawer>
  );
}
