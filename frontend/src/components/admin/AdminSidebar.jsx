import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  SquaresFour,
  Users,
  UsersFour,
  ChatsCircle,
  Megaphone,
  BookOpen,
  Buildings,
  ChartLineUp,
  GearSix,
  ClockCounterClockwise,
  ArrowSquareOut,
  Brain,
} from "@phosphor-icons/react";
import { useAdmin } from "@/lib/admin-context";

// Cada entrada declara los permisos necesarios (con "any"): así el menú
// se filtra automáticamente para roles no-superadmin.
const SECTIONS = [
  { to: "/admin", label: "Dashboard", icon: SquaresFour, exact: true, any: null },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users, any: ["users.view"] },
  { to: "/admin/agentes", label: "Agentes", icon: UsersFour, any: ["agents.view"] },
  { to: "/admin/foro", label: "Foro", icon: ChatsCircle, any: ["forum.view"] },
  { to: "/admin/convocatorias", label: "Convocatorias", icon: Megaphone, any: ["convocatorias.view"] },
  { to: "/admin/recursos", label: "Recursos", icon: BookOpen, any: ["resources.view"] },
  { to: "/admin/espacios", label: "Espacios", icon: Buildings, any: ["spaces.view"] },
  { to: "/admin/motor", label: "Motor de decisión", icon: Brain, any: ["engine.kb.view", "engine.rules.view", "engine.simulate"] },
  { to: "/admin/analiticas", label: "Analíticas", icon: ChartLineUp, any: ["analytics.view"] },
  { to: "/admin/configuracion", label: "Configuración", icon: GearSix, any: ["config.view"] },
  { to: "/admin/actividad", label: "Actividad", icon: ClockCounterClockwise, any: ["activity.view"] },
];

export default function AdminSidebar({ onNavigate, onOpenPalette }) {
  const loc = useLocation();
  const { admin, hasAny } = useAdmin();

  const visible = SECTIONS.filter((s) => !s.any || hasAny(s.any));

  return (
    <aside
      className="w-[248px] h-screen flex flex-col sticky top-0 shrink-0"
      style={{ background: "var(--a-surface)", borderRight: "1px solid var(--a-border)" }}
      data-testid="admin-sidebar"
    >
      <div className="px-4 pt-5 pb-4">
        <Link to="/admin" className="flex items-center gap-2.5 px-1.5" data-testid="admin-sidebar-brand">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-[13px]"
            style={{ background: "var(--a-accent)", color: "var(--a-accent-fg)" }}
          >
            C
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold tracking-tight leading-none" style={{ color: "var(--a-text)" }}>
              Cultora
            </div>
            <div className="text-[10.5px] mt-1 admin-text-faint tracking-wide">Panel de administración</div>
          </div>
        </Link>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="admin-surface flex items-center gap-2 h-8 px-2.5 rounded-md w-full hover:opacity-90 transition-opacity"
          style={{ background: "var(--a-surface-2)", border: "1px solid var(--a-border)" }}
          data-testid="admin-sidebar-search"
          aria-label="Abrir búsqueda global"
        >
          <span className="text-[11.5px] admin-text-faint">Buscar…</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="admin-kbd">⌘</span>
            <span className="admin-kbd">K</span>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4 space-y-0.5">
        <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium px-2 mt-2 mb-1.5">
          General
        </div>
        {visible.map((s) => {
          const active = s.exact
            ? loc.pathname === s.to
            : loc.pathname === s.to || loc.pathname.startsWith(s.to + "/");
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to}
              onClick={onNavigate}
              className={`admin-sb-item ${active ? "active" : ""}`}
              data-testid={`admin-nav-${s.to.replace(/\//g, "-")}`}
            >
              <Icon size={16} weight={active ? "fill" : "regular"} />
              <span>{s.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pt-2 pb-3 border-t admin-border">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-sb-item"
          data-testid="admin-sidebar-view-site"
          title="Abrir el sitio público en una pestaña nueva"
        >
          <ArrowSquareOut size={16} weight="regular" />
          <span>Ver sitio público</span>
        </a>
        <div className="mt-2 px-2 py-2 flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11.5px] font-semibold"
            style={{ background: "var(--a-surface-2)", color: "var(--a-text)" }}
          >
            {(admin?.name || "?")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--a-text)" }}>
              {admin?.name}
            </div>
            <div className="text-[10.5px] admin-text-faint truncate">
              {admin?.role_label || "Sin rol"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
