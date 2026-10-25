import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  MagnifyingGlass, Users, UsersFour, Megaphone, ChatsCircle,
  BookOpen, Buildings, SquaresFour, ArrowRight, Moon, Sun,
} from "@phosphor-icons/react";
import { adminApi } from "@/lib/admin-api";
import { useAdminTheme } from "@/lib/admin-theme";
import { useAdmin } from "@/lib/admin-context";

const TYPE_ICONS = {
  user: Users, agent: UsersFour, convocatoria: Megaphone,
  topic: ChatsCircle, resource: BookOpen, space: Buildings,
};

const TYPE_LABELS = {
  user: "Usuario", agent: "Agente", convocatoria: "Convocatoria",
  topic: "Tema del foro", resource: "Recurso", space: "Espacio",
};

const NAV_ITEMS = [
  { path: "/admin", label: "Ir al Dashboard", icon: SquaresFour, perm: null },
  { path: "/admin/usuarios", label: "Ir a Usuarios", icon: Users, perm: "users.view" },
  { path: "/admin/agentes", label: "Ir a Agentes", icon: UsersFour, perm: "agents.view" },
  { path: "/admin/foro", label: "Ir a Foro", icon: ChatsCircle, perm: "forum.view" },
  { path: "/admin/convocatorias", label: "Ir a Convocatorias", icon: Megaphone, perm: "convocatorias.view" },
  { path: "/admin/recursos", label: "Ir a Recursos", icon: BookOpen, perm: "resources.view" },
  { path: "/admin/espacios", label: "Ir a Espacios", icon: Buildings, perm: "spaces.view" },
];

export default function CommandPalette({ open, onOpenChange }) {
  const nav = useNavigate();
  const { theme, toggle } = useAdminTheme();
  const { has } = useAdmin();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef();

  // Debounced remote search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await adminApi.search(q);
        setResults(r.results || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 220);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, open]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const go = useCallback((url) => {
    onOpenChange(false);
    nav(url);
  }, [nav, onOpenChange]);

  const navFiltered = NAV_ITEMS.filter((i) => !i.perm || has(i.perm));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
      onClick={() => onOpenChange(false)}
      data-testid="admin-command-palette"
    >
      <div
        className="w-full max-w-[620px] rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} loop>
          <div
            className="flex items-center gap-3 px-4 py-3.5 border-b admin-border"
            style={{ background: "var(--a-surface)" }}
          >
            <MagnifyingGlass size={16} weight="regular" style={{ color: "var(--a-text-muted)" }} />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Busca usuarios, agentes, convocatorias, temas… o navega"
              className="flex-1 bg-transparent border-0 outline-none text-[14px]"
              style={{ color: "var(--a-text)" }}
              data-testid="admin-cmdk-input"
            />
            <span className="admin-kbd">ESC</span>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-1.5" data-testid="admin-cmdk-list">
            {loading ? (
              <div className="px-3 py-8 text-center text-sm admin-text-muted">Buscando…</div>
            ) : null}

            {!loading && query.length >= 2 && results.length === 0 ? (
              <Command.Empty className="px-3 py-8 text-center text-sm admin-text-muted">
                Sin resultados para “{query}”
              </Command.Empty>
            ) : null}

            {results.length > 0 ? (
              <Command.Group heading="Resultados">
                <div className="text-[10px] uppercase tracking-[0.14em] admin-text-faint font-medium px-3 pt-2 pb-1">
                  Resultados
                </div>
                {results.map((r) => {
                  const Icon = TYPE_ICONS[r.type] || MagnifyingGlass;
                  return (
                    <Command.Item
                      key={`${r.type}-${r.id}`}
                      value={`${r.type}-${r.id}-${r.title}`}
                      onSelect={() => go(r.url)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer data-[selected=true]:bg-[var(--a-surface-hover)]"
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
                        <Icon size={13} weight="regular" style={{ color: "var(--a-text-muted)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate" style={{ color: "var(--a-text)" }}>
                          {r.title}
                        </div>
                        {r.subtitle ? (
                          <div className="text-[11.5px] admin-text-muted truncate">{r.subtitle}</div>
                        ) : null}
                      </div>
                      <span className="admin-chip text-[10px]">{TYPE_LABELS[r.type] || r.type}</span>
                      <ArrowRight size={12} weight="bold" style={{ color: "var(--a-text-faint)" }} />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ) : null}

            {!query.trim() ? (
              <>
                <div className="text-[10px] uppercase tracking-[0.14em] admin-text-faint font-medium px-3 pt-3 pb-1">
                  Navegación
                </div>
                {navFiltered.map((n) => {
                  const Icon = n.icon;
                  return (
                    <Command.Item
                      key={n.path}
                      value={n.label}
                      onSelect={() => go(n.path)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer data-[selected=true]:bg-[var(--a-surface-hover)]"
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
                        <Icon size={13} style={{ color: "var(--a-text-muted)" }} />
                      </div>
                      <div className="text-[13px]" style={{ color: "var(--a-text)" }}>{n.label}</div>
                    </Command.Item>
                  );
                })}

                <div className="text-[10px] uppercase tracking-[0.14em] admin-text-faint font-medium px-3 pt-3 pb-1">
                  Acciones
                </div>
                <Command.Item
                  value="Cambiar tema"
                  onSelect={() => { toggle(); onOpenChange(false); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer data-[selected=true]:bg-[var(--a-surface-hover)]"
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
                    {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                  </div>
                  <div className="text-[13px]" style={{ color: "var(--a-text)" }}>
                    Cambiar a modo {theme === "dark" ? "claro" : "oscuro"}
                  </div>
                </Command.Item>
              </>
            ) : null}
          </Command.List>

          <div
            className="flex items-center justify-between px-4 py-2.5 border-t admin-border text-[10.5px] admin-text-faint"
            style={{ background: "var(--a-surface-2)" }}
          >
            <div className="flex items-center gap-2">
              <span className="admin-kbd">↑</span><span className="admin-kbd">↓</span>
              <span>navegar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="admin-kbd">↵</span>
              <span>seleccionar</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
