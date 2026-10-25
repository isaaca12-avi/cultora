import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { NAV } from "@/constants/testIds";
import {
  HouseSimple,
  Compass,
  ListChecks,
  BookOpen,
  UserCircle,
  SignOut,
  UsersFour,
  HeartStraight,
  ChatsCircle,
  Megaphone,
} from "@phosphor-icons/react";

const links = [
  { to: "/dashboard", label: "Panel", icon: HouseSimple, key: NAV.dashboard },
  { to: "/objetivos", label: "Nuevo objetivo", icon: Compass, key: NAV.goals },
  { to: "/planes", label: "Mis planes", icon: ListChecks, key: NAV.plans },
  { to: "/convocatorias", label: "Convocatorias", icon: Megaphone, key: "nav-convocatorias-link" },
  { to: "/agentes", label: "Agentes", icon: UsersFour, key: "nav-agents-link" },
  { to: "/foro", label: "Foro", icon: ChatsCircle, key: "nav-forum-link" },
  { to: "/conocimiento", label: "Biblioteca", icon: BookOpen, key: NAV.knowledge },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr] bg-alabaster">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col border-r border-obsidian/8 bg-alabaster relative z-10 sticky top-0 h-screen">
        <Link to="/" data-testid={NAV.logoLink} className="px-7 pt-10 pb-8 block">
          <div className="font-mono-meta text-obsidian/40 mb-1.5">plataforma</div>
          <div className="font-serif-display text-3xl italic text-terracotta leading-none">Cultora</div>
        </Link>
        <nav className="flex-1 px-3 space-y-0.5">
          {links.map((l) => {
            const active = loc.pathname === l.to || loc.pathname.startsWith(l.to + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                data-testid={l.key}
                className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors ${
                  active ? "text-obsidian bg-linen/70" : "text-obsidian/60 hover:text-obsidian hover:bg-linen/40"
                }`}
              >
                {active ? <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-terracotta rounded-r" /> : null}
                <Icon size={17} weight={active ? "duotone" : "regular"} />
                <span className="font-medium">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-5 border-t border-obsidian/8">
          <Link
            to="/apoyar"
            data-testid="sidebar-donate-link"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-linen/40 transition-colors text-sm text-terracotta mb-2 font-medium"
          >
            <HeartStraight size={16} weight="duotone" />
            Apoyar Cultora
          </Link>
          <Link
            to="/perfil"
            data-testid={NAV.profileMenu}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-linen/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-obsidian text-alabaster flex items-center justify-center font-mono text-xs">
              {(user?.name || "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-obsidian/40 truncate">{user?.email}</div>
            </div>
          </Link>
          <button
            data-testid={NAV.logout}
            onClick={() => {
              logout();
              nav("/");
            }}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-linen/40 transition-colors text-xs text-obsidian/50"
          >
            <SignOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <header className="md:hidden border-b border-obsidian/10 bg-alabaster px-5 py-4 flex items-center justify-between sticky top-0 z-20">
        <Link to="/" data-testid={NAV.logoLink} className="font-serif-display text-2xl leading-none">Cultora</Link>
        <button
          data-testid={NAV.logout}
          onClick={() => {
            logout();
            nav("/");
          }}
          className="text-obsidian/60 text-sm"
        >
          Salir
        </button>
      </header>

      <main className="relative z-10 min-w-0">
        {/* Mobile bottom links */}
        <div className="md:hidden flex overflow-x-auto gap-2 px-4 py-3 border-b border-obsidian/10 bg-alabaster/80">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`m-${l.key}`}
              className="chip whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="px-6 md:px-12 py-8 md:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
