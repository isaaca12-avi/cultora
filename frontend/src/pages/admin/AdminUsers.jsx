import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { AdminPageHeader, StatusPill, EmptyState, LoadingRows } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DetailDrawer, DetailSection, DetailRow, DetailHistory } from "@/components/admin/DetailDrawer";
import Pagination from "@/components/admin/Pagination";
import { MagnifyingGlass, DotsThreeVertical, Users, Plus, Copy, Check } from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const SYSTEM_ROLES = [
  { value: "", label: "Sin rol" },
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderador" },
  { value: "content_editor", label: "Editor de Contenido" },
];

const DEFAULTS = { q: "", status: "", role: "", page: 1, focus: "" };

export default function AdminUsers() {
  const { has, admin } = useAdmin();
  const { values: f, set: setFilter } = useUrlFilters(DEFAULTS);
  const [data, setData] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rolesCatalog, setRolesCatalog] = useState(SYSTEM_ROLES);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setData(null);
    const params = { page: f.page, limit: 20 };
    if (f.q) params.q = f.q;
    if (f.status) params.status = f.status;
    if (f.role) params.role = f.role;
    const r = await adminApi.users.list(params);
    setData(r);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f.q, f.status, f.role, f.page]);

  useEffect(() => {
    // Cargar catálogo de roles (incluye custom)
    adminApi.roles.listAll().then((r) => {
      const items = [{ value: "", label: "Sin rol" }, ...r.roles.map(x => ({ value: x.key, label: x.label }))];
      setRolesCatalog(items);
    }).catch(() => {});
  }, []);

  // Abrir drawer por ?focus=UID
  useEffect(() => {
    if (f.focus && data?.items?.length) {
      const u = data.items.find((x) => x.id === f.focus);
      if (u) openDetail(u);
      else adminApi.users.get(f.focus).then((full) => setDetail(full)).catch(() => {});
    }
  // eslint-disable-next-line
  }, [f.focus, data]);

  const openDetail = async (u) => {
    try { setDetail(await adminApi.users.get(u.id)); }
    catch { setDetail(u); }
  };

  const closeDetail = () => {
    setDetail(null);
    if (f.focus) setFilter({ focus: "" });
  };

  const doStatus = (u, newStatus, label, variant = "default") => {
    setConfirm({
      title: `${label} a ${u.name}`,
      description: `Se cambiará el estado a "${label.toLowerCase()}" y quedará registrado en la bitácora.`,
      variant,
      onConfirm: async () => {
        try {
          await adminApi.users.setStatus(u.id, newStatus);
          toast.success("Estado actualizado");
          setConfirm(null);
          if (detail?.id === u.id) openDetail(u);
          load();
        } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
      },
    });
  };

  const doRole = (u, role) => {
    setConfirm({
      title: `Cambiar rol a ${u.name}`,
      description: `Se asignará el rol "${rolesCatalog.find(r => r.value === (role || ""))?.label || "Sin rol"}". Esta acción queda registrada.`,
      onConfirm: async () => {
        try {
          await adminApi.users.setRole(u.id, role || null);
          toast.success("Rol actualizado");
          setConfirm(null);
          if (detail?.id === u.id) openDetail(u);
          load();
        } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
      },
    });
  };

  const items = data?.items || null;

  return (
    <div data-testid="admin-users">
      <AdminPageHeader title="Usuarios" description="Gestión de cuentas: roles, estado, permisos y actividad.">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-faint)" }} />
            <input
              className="admin-input pl-8 w-64"
              placeholder="Buscar por nombre o email"
              defaultValue={f.q}
              onKeyDown={(e) => { if (e.key === "Enter") setFilter({ q: e.currentTarget.value, page: 1 }); }}
              data-testid="admin-users-search"
            />
          </div>
          <select className="admin-select w-44" value={f.status} onChange={(e) => setFilter({ status: e.target.value, page: 1 })}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
            <option value="blocked">Bloqueados</option>
          </select>
          <select className="admin-select w-44" value={f.role} onChange={(e) => setFilter({ role: e.target.value, page: 1 })}>
            <option value="">Todos los roles</option>
            <option value="none">Sin rol admin</option>
            {rolesCatalog.filter(r => r.value).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {has("users.create") ? (
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => setCreateOpen(true)}
              data-testid="admin-create-user-open"
            >
              <Plus size={14} weight="bold" />
              Crear usuario
            </button>
          ) : null}
        </div>
      </AdminPageHeader>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registrado</th>
                <th className="text-right pr-4" style={{ width: 60 }}></th>
              </tr>
            </thead>
            {items === null ? <LoadingRows cols={6} /> : items.length === 0 ? (
              <tbody><tr><td colSpan={6}><EmptyState icon={Users} title="Sin resultados" description="Ajusta los filtros para ver más usuarios." /></td></tr></tbody>
            ) : (
              <tbody>
                {items.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => openDetail(u)}
                    className="cursor-pointer"
                    data-testid={`admin-user-row-${u.id}`}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ background: "var(--a-surface-2)" }}>
                          {(u.name || "?")[0]?.toUpperCase()}
                        </div>
                        <div className="font-medium">{u.name}</div>
                      </div>
                    </td>
                    <td className="admin-text-muted">{u.email}</td>
                    <td>
                      {u.admin_role
                        ? <span className="admin-chip admin-chip-accent">{rolesCatalog.find(r => r.value === u.admin_role)?.label || u.admin_role}</span>
                        : <span className="admin-text-faint text-xs">—</span>}
                    </td>
                    <td><StatusPill status={u.status || "active"} /></td>
                    <td className="admin-text-muted text-[12.5px]">{u.created_at ? new Date(u.created_at).toLocaleDateString("es") : "—"}</td>
                    <td className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                      <UserRowActions u={u} has={has} currentUserId={admin?.id} rolesCatalog={rolesCatalog} onStatus={doStatus} onRole={doRole} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {data ? (
          <Pagination
            page={data.page || 1}
            limit={data.limit || 20}
            total={data.total || 0}
            onPageChange={(p) => setFilter({ page: p })}
          />
        ) : null}
      </div>

      <UserDetailDrawer
        user={detail}
        onClose={closeDetail}
        has={has}
        currentUserId={admin?.id}
        rolesCatalog={rolesCatalog}
        onStatus={doStatus}
        onRole={doRole}
        onRefresh={() => detail && openDetail(detail)}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title}
        description={confirm?.description}
        onConfirm={confirm?.onConfirm}
        variant={confirm?.variant}
      />

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        rolesCatalog={rolesCatalog}
        isSuperadmin={admin?.admin_role === "superadmin"}
        onCreated={load}
      />
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange, rolesCatalog, isSuperadmin, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", role: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ name: "", email: "", role: "" });
    setBusy(false);
    setError("");
    setResult(null);
    setCopied(false);
  }, [open]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const valid = form.name.trim().length >= 2 && emailOk;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.users.create({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role || null,
      });
      setResult(res);
      onCreated?.();
      toast.success("Usuario creado");
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "No pudimos crear el usuario. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setBusy(false);
    }
  };

  const roleLabel = result
    ? rolesCatalog.find((r) => r.value === (result.user.admin_role || ""))?.label || "Sin rol"
    : "";

  const copyCredentials = async () => {
    if (!result) return;
    const text = `Cultora\nEmail: ${result.user.email}\nContraseña temporal: ${result.temporary_password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Credenciales copiadas");
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto manualmente.");
    }
  };

  const roleOptions = rolesCatalog.filter((r) => r.value !== "superadmin" || isSuperadmin);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-0 shadow-2xl p-0 max-w-lg"
        style={{ background: "var(--a-surface)", color: "var(--a-text)" }}
        data-testid="admin-create-user"
      >
        <form onSubmit={submit}>
          <div className="p-6">
            <DialogHeader className="text-left space-y-1.5">
              <DialogTitle className="text-[17px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
                {result ? "Usuario creado" : "Crear usuario"}
              </DialogTitle>
              <DialogDescription className="admin-text-muted text-[12.5px] leading-relaxed">
                {result
                  ? "Comparte estas credenciales por un canal seguro."
                  : "Se generará una contraseña temporal que la persona deberá cambiar en su primer inicio de sesión."}
              </DialogDescription>
            </DialogHeader>

            {result ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "var(--a-surface-2)" }}>
                    <Check size={16} weight="bold" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium truncate">{result.user.name}</div>
                    <div className="text-[12px] admin-text-muted truncate">{result.user.email}</div>
                  </div>
                </div>

                <div className="rounded-lg border admin-border p-3.5 space-y-2" style={{ background: "var(--a-surface-2)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-wider admin-text-faint">Rol</span>
                    <span className="text-[12.5px]">{roleLabel}</span>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider admin-text-faint">Contraseña temporal</div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 font-mono text-[13px] break-all" data-testid="admin-create-user-password">
                        {result.temporary_password}
                      </code>
                      <button type="button" className="admin-btn admin-btn-ghost shrink-0" onClick={copyCredentials}>
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11.5px] admin-text-muted leading-relaxed">
                  Guarda o comparte la contraseña ahora: no se volverá a mostrar. La cuenta se creó
                  verificada y activa; al entrar se le pedirá cambiarla.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <div className="mb-1.5 text-[11.5px] font-medium">Nombre completo</div>
                  <input
                    className="admin-input w-full"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre y apellido"
                    autoFocus
                    data-testid="admin-create-user-name"
                  />
                </label>
                <label className="block">
                  <div className="mb-1.5 text-[11.5px] font-medium">Correo electrónico</div>
                  <input
                    type="email"
                    className="admin-input w-full"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="persona@correo.com"
                    data-testid="admin-create-user-email"
                  />
                </label>
                <label className="block">
                  <div className="mb-1.5 text-[11.5px] font-medium">Rol en la plataforma</div>
                  <select
                    className="admin-select w-full"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    data-testid="admin-create-user-role"
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value || "none"} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <div className="mt-1.5 text-[11px] admin-text-faint">
                    Sin rol = usuario normal. Los roles admin dan acceso al panel según sus permisos.
                  </div>
                </label>
                {error ? (
                  <div
                    className="rounded-lg px-3 py-2 text-[12px]"
                    style={{ background: "rgba(220, 38, 38, 0.08)", color: "var(--a-danger)" }}
                  >
                    {error}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t admin-border sm:justify-end gap-2" style={{ background: "var(--a-surface-2)" }}>
            {result ? (
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => onOpenChange(false)}>
                Cerrar
              </button>
            ) : (
              <>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={!valid || busy}
                  data-testid="admin-create-user-submit"
                >
                  {busy ? "Creando…" : "Crear usuario"}
                </button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserRowActions({ u, has, currentUserId, rolesCatalog, onStatus, onRole }) {
  const isSelf = u.id === currentUserId;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="admin-btn admin-btn-icon admin-btn-ghost" data-testid={`admin-user-actions-${u.id}`}>
          <DotsThreeVertical size={16} weight="bold" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px] p-1 shadow-lg"
        style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}>
        {has("users.edit_role") && !isSelf ? (
          <>
            <div className="px-2 py-1.5 text-[10.5px] uppercase tracking-wider admin-text-faint">Cambiar rol</div>
            {rolesCatalog.map(r => (
              <DropdownMenuItem key={r.value || "none"} className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }}
                onClick={() => onRole(u, r.value)}>
                {r.label}{u.admin_role === (r.value || null) ? " · actual" : ""}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator style={{ background: "var(--a-border)" }} />
          </>
        ) : null}
        {u.status !== "active" && has("users.reactivate") && !isSelf ? (
          <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }}
            onClick={() => onStatus(u, "active", "Reactivar")}>Reactivar</DropdownMenuItem>
        ) : null}
        {u.status === "active" && has("users.suspend") && !isSelf ? (
          <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }}
            onClick={() => onStatus(u, "suspended", "Suspender", "danger")}>Suspender</DropdownMenuItem>
        ) : null}
        {has("users.block") && !isSelf ? (
          <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-danger)" }}
            onClick={() => onStatus(u, "blocked", "Bloquear", "danger")}>Bloquear</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserDetailDrawer({ user, onClose, has, currentUserId, rolesCatalog, onStatus, onRole, onRefresh }) {
  const [allPerms, setAllPerms] = useState([]);
  const [overrides, setOverrides] = useState(null);

  useEffect(() => {
    if (user && has("users.edit_role")) {
      adminApi.roles.permissions().then((r) => setAllPerms(r.permissions || [])).catch(() => {});
      setOverrides(user.admin_permissions ?? null);
    }
  }, [user, has]);

  const groupedPerms = useMemo(() => {
    const g = {};
    for (const p of allPerms) { g[p.module] = g[p.module] || []; g[p.module].push(p); }
    return g;
  }, [allPerms]);

  if (!user) return null;
  const isSelf = user.id === currentUserId;

  const togglePerm = (key) => {
    const base = overrides || [];
    const has = base.includes(key);
    setOverrides(has ? base.filter(x => x !== key) : [...base, key]);
  };

  const saveOverrides = async () => {
    try { await adminApi.userPermsOverride(user.id, overrides); toast.success("Permisos actualizados"); onRefresh(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };
  const clearOverrides = async () => {
    try { await adminApi.userPermsOverride(user.id, null); toast.success("Se restauraron los permisos del rol"); setOverrides(null); onRefresh(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  return (
    <DetailDrawer
      open={!!user}
      onClose={onClose}
      title={user.name || "—"}
      subtitle={user.email}
      description="Detalle del usuario"
      testId="admin-user-detail"
    >
      <DetailSection title="Cuenta">
        <DetailRow label="Estado" value={<StatusPill status={user.status || "active"} />} />
        <DetailRow label="Rol" value={
          user.admin_role
            ? <span className="admin-chip admin-chip-accent">{rolesCatalog.find(r => r.value === user.admin_role)?.label || user.admin_role}</span>
            : "Sin rol admin"
        } />
        <DetailRow label="Registrado" value={user.created_at ? new Date(user.created_at).toLocaleString("es") : "—"} />
        <DetailRow label="ID" value={<code className="text-[11.5px]">{user.id}</code>} />
      </DetailSection>

      {user.profile ? (
        <DetailSection title="Perfil cultural">
          <DetailRow label="Tipo" value={user.profile.agent_type} />
          <DetailRow label="Disciplina" value={user.profile.discipline} />
          <DetailRow label="Etapa" value={user.profile.stage} />
          <DetailRow label="Territorio" value={user.profile.territory} />
        </DetailSection>
      ) : null}

      <DetailSection title="Actividad reciente">
        <div className="text-[12.5px]">
          <div><span className="admin-text-faint">Planes:</span> {user.recent_plans?.length ?? 0}</div>
          <div><span className="admin-text-faint">Sesiones:</span> {user.recent_sessions?.length ?? 0}</div>
          <div><span className="admin-text-faint">Temas en foro:</span> {user.recent_topics?.length ?? 0}</div>
        </div>
      </DetailSection>

      <DetailSection title="Acciones">
        <div className="flex flex-wrap gap-2">
          {has("users.edit_role") && !isSelf ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="admin-btn" data-testid="detail-user-change-role">Cambiar rol…</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[220px] p-1 shadow-lg"
                style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}>
                {rolesCatalog.map(r => (
                  <DropdownMenuItem key={r.value || "none"} className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }}
                    onClick={() => onRole(user, r.value)}>
                    {r.label}{user.admin_role === (r.value || null) ? " · actual" : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {user.status === "active" && has("users.suspend") && !isSelf ? (
            <button className="admin-btn" onClick={() => onStatus(user, "suspended", "Suspender", "danger")}>Suspender</button>
          ) : null}
          {user.status !== "active" && has("users.reactivate") && !isSelf ? (
            <button className="admin-btn admin-btn-primary" onClick={() => onStatus(user, "active", "Reactivar")}>Reactivar</button>
          ) : null}
          {has("users.block") && !isSelf ? (
            <button className="admin-btn admin-btn-danger" onClick={() => onStatus(user, "blocked", "Bloquear", "danger")}>Bloquear</button>
          ) : null}
        </div>
      </DetailSection>

      {has("users.edit_role") && allPerms.length > 0 ? (
        <DetailSection title="Overrides de permisos">
          <p className="text-[12px] admin-text-muted mb-3">
            {overrides == null
              ? "El usuario usa los permisos de su rol. Habilita override para ajustar permisos individualmente."
              : `Este usuario tiene ${overrides.length} permisos individualizados que sobrescriben su rol.`}
          </p>
          <div className="flex gap-2 mb-4">
            {overrides == null ? (
              <button className="admin-btn" onClick={() => setOverrides([...(user.admin_permissions || [])])}>
                Habilitar override
              </button>
            ) : (
              <>
                <button className="admin-btn admin-btn-accent" onClick={saveOverrides}>Guardar</button>
                <button className="admin-btn admin-btn-ghost" onClick={clearOverrides}>Restaurar rol</button>
              </>
            )}
          </div>

          {overrides != null ? (
            <div className="space-y-4">
              {Object.entries(groupedPerms).map(([mod, perms]) => (
                <div key={mod}>
                  <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-1.5">
                    {mod}
                  </div>
                  <div className="space-y-1">
                    {perms.map(p => (
                      <label key={p.key} className="flex items-center gap-2 py-1 cursor-pointer text-[12.5px]">
                        <input
                          type="checkbox"
                          checked={overrides.includes(p.key)}
                          onChange={() => togglePerm(p.key)}
                          className="accent-current"
                        />
                        <span style={{ color: "var(--a-text)" }}>{p.label}</span>
                        <code className="ml-auto text-[10.5px] admin-text-faint">{p.key}</code>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </DetailSection>
      ) : null}
    </DetailDrawer>
  );
}
