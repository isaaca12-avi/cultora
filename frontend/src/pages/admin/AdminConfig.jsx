import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminUI";
import { toast } from "sonner";
import { X, Plus, Shield, ArrowRight } from "@phosphor-icons/react";

const GROUPS = [
  {
    id: "domain",
    label: "Dominio cultural",
    items: [
      { key: "disciplines", label: "Disciplinas" },
      { key: "categories", label: "Categorías" },
      { key: "tags", label: "Etiquetas" },
    ],
  },
  {
    id: "geo",
    label: "Geografía",
    items: [
      { key: "countries", label: "Países" },
      { key: "cities", label: "Ciudades" },
    ],
  },
  {
    id: "conv",
    label: "Convocatorias",
    items: [
      { key: "conv_types", label: "Tipos" },
      { key: "conv_areas", label: "Áreas" },
      { key: "conv_modalidades", label: "Modalidades" },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      { key: "states", label: "Estados" },
    ],
  },
];

export default function AdminConfig() {
  const { has } = useAdmin();
  const [config, setConfig] = useState(null);
  const [activeGroup, setActiveGroup] = useState("domain");

  const load = async () => {
    try { const c = await adminApi.config.get(); setConfig(c); }
    catch { setConfig(null); }
  };
  useEffect(() => { load(); }, []);

  const save = async (key, values) => {
    if (!has("config.edit")) { toast.error("No tienes permiso para editar"); return; }
    try { await adminApi.config.set(key, values); toast.success("Guardado"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const group = useMemo(() => GROUPS.find(g => g.id === activeGroup), [activeGroup]);

  return (
    <div data-testid="admin-config">
      <AdminPageHeader title="Configuración" description="Taxonomías, catálogos y roles que usan las distintas partes de la plataforma." />

      {has("users.edit_role") ? (
        <Link
          to="/admin/configuracion/roles"
          className="admin-card p-5 flex items-center gap-4 mb-4 hover:shadow-md transition-shadow"
          data-testid="admin-config-roles-link"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--a-surface-2)" }}>
            <Shield size={18} style={{ color: "var(--a-accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-semibold" style={{ color: "var(--a-text)" }}>Roles y permisos</div>
            <div className="text-[12.5px] admin-text-muted mt-0.5">
              Gestiona los roles system y crea roles custom con permisos granulares.
            </div>
          </div>
          <ArrowRight size={16} style={{ color: "var(--a-text-muted)" }} />
        </Link>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <div className="admin-card p-3 h-fit">
          {GROUPS.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`w-full text-left admin-sb-item ${activeGroup === g.id ? "active" : ""}`}
              data-testid={`config-group-${g.id}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {group?.items.map(it => (
            <ConfigList
              key={it.key}
              label={it.label}
              values={config?.[it.key] || []}
              onSave={(vals) => save(it.key, vals)}
              readOnly={!has("config.edit")}
              testId={`config-${it.key}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigList({ label, values, onSave, readOnly, testId }) {
  const [items, setItems] = useState(values || []);
  const [draft, setDraft] = useState("");

  useEffect(() => { setItems(values || []); }, [values]);

  const dirty = JSON.stringify(items) !== JSON.stringify(values);

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (items.includes(v)) { toast.error("Valor duplicado"); return; }
    setItems([...items, v]);
    setDraft("");
  };

  const remove = (v) => setItems(items.filter(x => x !== v));

  return (
    <AdminSection
      title={label}
      description={`${items.length} valores`}
      actions={dirty ? (
        <button className="admin-btn admin-btn-accent" onClick={() => onSave(items)}>Guardar cambios</button>
      ) : null}
    >
      <div className="flex flex-wrap gap-1.5" data-testid={testId}>
        {items.map(v => (
          <span key={v} className="admin-chip admin-chip-solid" style={{ paddingRight: 4 }}>
            {v}
            {!readOnly && (
              <button
                className="ml-1 rounded p-0.5 hover:bg-black/10"
                onClick={() => remove(v)}
                aria-label={`Eliminar ${v}`}
              >
                <X size={10} weight="bold" />
              </button>
            )}
          </span>
        ))}
        {items.length === 0 ? <span className="text-xs admin-text-faint">Sin valores</span> : null}
      </div>
      {!readOnly ? (
        <div className="flex items-center gap-2 mt-4">
          <input
            className="admin-input"
            placeholder="Añadir valor…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="admin-btn" onClick={add}><Plus size={13} weight="bold" /> Añadir</button>
        </div>
      ) : null}
    </AdminSection>
  );
}
