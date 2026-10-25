import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { auth as authApi } from "@/lib/api";
import { NAV } from "@/constants/testIds";
import { toast } from "sonner";
import {
  HouseSimple,
  Compass,
  ListChecks,
  BookOpen,
  UsersFour,
  HeartStraight,
  ChatsCircle,
  Megaphone,
  SignOut,
  MagnifyingGlass,
  Plus,
  UserCircle,
  CaretRight,
  EnvelopeSimple,
  CheckCircle,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/dashboard", label: "Panel", description: "Resumen de tu avance", icon: HouseSimple, key: NAV.dashboard },
  { to: "/objetivos", label: "Nuevo objetivo", description: "Inicia un diagnóstico", icon: Compass, key: NAV.goals },
  { to: "/planes", label: "Mis planes", description: "Tus planes de acción", icon: ListChecks, key: NAV.plans },
  { to: "/convocatorias", label: "Convocatorias", description: "Financiamiento y oportunidades", icon: Megaphone, key: "nav-convocatorias-link" },
  { to: "/agentes", label: "Agentes", description: "Directorio profesional", icon: UsersFour, key: "nav-agents-link" },
  { to: "/foro", label: "Foro", description: "Conversaciones del sector", icon: ChatsCircle, key: "nav-forum-link" },
  { to: "/conocimiento", label: "Biblioteca", description: "Conocimiento curado", icon: BookOpen, key: NAV.knowledge },
];

const extraLinks = [
  { to: "/perfil", label: "Mi perfil", description: "Tus datos y preferencias", icon: UserCircle, key: NAV.profileMenu },
  { to: "/apoyar", label: "Apoyar Cultora", description: "Sostén la plataforma", icon: HeartStraight, key: "sidebar-donate-link" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [devVerifyLink, setDevVerifyLink] = useState("");
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const isActive = (to) => loc.pathname === to || loc.pathname.startsWith(to + "/");
  const searchable = [...links, ...extraLinks];
  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? searchable.filter((l) => `${l.label} ${l.description}`.toLowerCase().includes(normalized))
    : links.slice(0, 4);

  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        setSearchOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        inputRef.current?.blur();
      }
    }
    function onClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const doLogout = () => {
    logout();
    nav("/");
  };

  const resendVerification = async () => {
    setSendingVerify(true);
    try {
      const res = await authApi.resendVerification();
      if (res?.dev_link) setDevVerifyLink(res.dev_link);
      toast.success(
        res?.email_sent
          ? "Te enviamos un nuevo enlace de verificación."
          : "Solicitud registrada. Revisa tu correo."
      );
    } catch (e) {
      toast.error(
        e?.response?.data?.detail?.message ||
          e?.response?.data?.detail ||
          "No pudimos reenviar la verificación."
      );
    } finally {
      setSendingVerify(false);
    }
  };

  return (
    <div className="min-h-screen bg-alabaster">
      <header className="sticky top-0 z-40 h-16 border-b border-obsidian/8 bg-white/95 backdrop-blur print-hide">
        <div className="h-full px-4 lg:px-6 flex items-center gap-3">
          <Link to="/" data-testid={NAV.logoLink} className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-obsidian text-alabaster grid place-items-center font-display font-extrabold text-lg leading-none">
              C
            </span>
            <span className="font-display text-[20px] font-bold tracking-tight text-obsidian">Cultora</span>
            <span className="hidden sm:inline-flex chip">beta</span>
          </Link>

          <div ref={searchRef} className="relative hidden md:block w-full max-w-[380px] ml-2">
            <MagnifyingGlass size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian/35" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Buscar o ir a…"
              aria-label="Buscar o ir a una sección"
              className="h-9 w-full rounded-lg border border-obsidian/10 bg-surface-muted pl-9 pr-10 text-[13px] text-obsidian placeholder:text-obsidian/35 outline-none transition-colors focus:border-terracotta/50 focus:bg-white focus:ring-2 focus:ring-terracotta/10"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-5 min-w-5 place-items-center rounded border border-obsidian/10 bg-white px-1 text-[10px] font-medium text-obsidian/40">
              /
            </kbd>
            {searchOpen ? (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-obsidian/10 bg-white shadow-lift">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-obsidian/35">
                  {normalized ? "Resultados" : "Ir a"}
                </div>
                {results.length ? (
                  results.map((l) => {
                    const Icon = l.icon;
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-muted transition-colors"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-linen/70 text-obsidian/60">
                          <Icon size={15} weight="duotone" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-obsidian">{l.label}</span>
                          <span className="block truncate text-[11px] text-obsidian/45">{l.description}</span>
                        </span>
                        <CaretRight size={12} className="ml-auto text-obsidian/25" />
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-3 pb-3 pt-1 text-[13px] text-obsidian/50">Sin resultados para “{query}”.</div>
                )}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/objetivos"
              className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg bg-obsidian px-3.5 text-[13px] font-medium text-alabaster transition-colors hover:bg-obsidian/90"
            >
              <Plus size={14} weight="bold" />
              Nuevo diagnóstico
            </Link>
            <Link to="/objetivos" aria-label="Nuevo diagnóstico" className="sm:hidden grid h-9 w-9 place-items-center rounded-lg bg-obsidian text-alabaster">
              <Plus size={16} weight="bold" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid={NAV.profileMenu}
                  aria-label="Menú de cuenta"
                  className="flex items-center gap-2 rounded-full border border-obsidian/10 bg-white p-1 pr-2 transition-colors hover:border-obsidian/20"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-terracotta/10 font-display text-[11px] font-bold text-terracotta">
                    {(user?.name || "?")[0]?.toUpperCase()}
                  </span>
                  <span className="hidden max-w-[110px] truncate text-[12px] font-medium text-obsidian/70 lg:block">
                    {user?.name?.split(" ")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 border-obsidian/10 bg-white">
                <DropdownMenuLabel className="font-normal">
                  <div className="truncate text-[13px] font-semibold text-obsidian">{user?.name}</div>
                  <div className="truncate text-[11px] text-obsidian/45">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-obsidian/8" />
                <DropdownMenuItem asChild>
                  <Link to="/perfil" className="cursor-pointer text-[13px]">Mi perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/apoyar" className="cursor-pointer text-[13px]">Apoyar Cultora</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/vision" className="cursor-pointer text-[13px]">Visión y hoja de ruta</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-obsidian/8" />
                <DropdownMenuItem data-testid={NAV.logout} onSelect={doLogout} className="cursor-pointer text-[13px] text-terracotta focus:text-terracotta">
                  <SignOut size={14} className="mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[76px] shrink-0 flex-col items-center border-r border-obsidian/8 bg-white py-4 print-hide lg:flex">
          <nav className="flex flex-1 flex-col items-center gap-1.5" aria-label="Navegación principal">
            {links.map((l) => {
              const active = isActive(l.to);
              const Icon = l.icon;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  data-testid={l.key}
                  title={l.label}
                  aria-label={l.label}
                  className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
                    active
                      ? "bg-terracotta/10 text-terracotta"
                      : "text-obsidian/45 hover:bg-surface-muted hover:text-obsidian"
                  }`}
                >
                  <Icon size={20} weight={active ? "duotone" : "regular"} />
                </Link>
              );
            })}
          </nav>
          <div className="flex w-full flex-col items-center gap-1.5 border-t border-obsidian/8 pt-3">
            <Link
              to="/apoyar"
              data-testid="sidebar-donate-link"
              title="Apoyar Cultora"
              aria-label="Apoyar Cultora"
              className="grid h-11 w-11 place-items-center rounded-xl text-terracotta/80 transition-colors hover:bg-terracotta/10 hover:text-terracotta"
            >
              <HeartStraight size={19} weight="duotone" />
            </Link>
            <Link
              to="/perfil"
              title="Mi perfil"
              aria-label="Mi perfil"
              className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
                isActive("/perfil") ? "bg-terracotta/10 text-terracotta" : "text-obsidian/45 hover:bg-surface-muted hover:text-obsidian"
              }`}
            >
              <UserCircle size={20} weight="duotone" />
            </Link>
            <button
              type="button"
              onClick={doLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="grid h-11 w-11 place-items-center rounded-xl text-obsidian/35 transition-colors hover:bg-surface-muted hover:text-obsidian"
            >
              <SignOut size={19} />
            </button>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1">
          <div className="border-b border-obsidian/8 bg-white/70 px-4 py-2.5 print-hide lg:hidden">
            <div className="flex gap-1.5 overflow-x-auto">
              {links.map((l) => {
                const active = isActive(l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    data-testid={`m-${l.key}`}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      active ? "bg-obsidian text-alabaster" : "text-obsidian/60 hover:bg-linen/70"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0">
            {user && user.email_verified === false ? (
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-terracotta/15 bg-terracotta/5 px-4 py-3 print-hide">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-terracotta">
                  <EnvelopeSimple size={16} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-obsidian">Confirma tu correo</div>
                  <div className="text-[11.5px] text-obsidian/50">
                    Enviamos un enlace a {user.email}. Verificarlo nos permite avisarte de tu plan y tus oportunidades.
                  </div>
                  {devVerifyLink ? (
                    <a
                      href={devVerifyLink}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-terracotta underline underline-offset-2"
                    >
                      <CheckCircle size={12} />
                      Abrir enlace de verificación (desarrollo)
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={sendingVerify}
                  className="h-8 rounded-lg border border-obsidian/12 bg-white px-3 text-[11.5px] font-medium text-obsidian/70 transition-colors hover:border-obsidian/25 hover:text-obsidian disabled:opacity-50"
                >
                  {sendingVerify ? "Enviando…" : "Reenviar enlace"}
                </button>
              </div>
            ) : null}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
