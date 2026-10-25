import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { dashboard as dashApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { DASHBOARD } from "@/constants/testIds";
import {
  ArrowRight,
  Compass,
  Kanban,
  Sparkle,
  ListChecks,
  CheckCircle,
  CircleHalfTilt,
  CircleDashed,
  Megaphone,
  UsersFour,
  ChatsCircle,
  BookOpen,
  Target,
  TrendUp,
} from "@phosphor-icons/react";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    dashApi.summary().then(setData).catch(() => setData(null));
  }, []);

  const completion = data ? Math.round((data.completion_rate || 0) * 100) : 0;
  const needsProfile = !user?.profile_complete;
  const total = data?.tasks_total ?? 0;
  const done = data?.tasks_done ?? 0;
  const inProgress = data?.tasks_in_progress ?? 0;
  const pending = data?.tasks_pending ?? 0;
  const today = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div data-testid={DASHBOARD.root}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 font-mono-meta text-terracotta">Panel general</div>
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[36px]">
            Hola, {user?.name?.split(" ")[0] || "creador"}.
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-obsidian/50">
            Tu avance, próximas acciones y el pulso de tu proyecto, en un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-lg border border-obsidian/8 bg-white px-3 py-2 text-[11.5px] font-medium text-obsidian/45 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-olive" />
            {todayLabel}
          </span>
          <Button
            data-testid={DASHBOARD.newDiagnostic}
            onClick={() => nav("/objetivos")}
            className="h-9 rounded-lg bg-obsidian px-4 text-[13px] font-medium text-alabaster hover:bg-obsidian/90"
          >
            <Compass size={15} className="mr-1.5" />
            Nuevo diagnóstico
          </Button>
        </div>
      </div>

      {needsProfile ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-terracotta/15 bg-terracotta/5 p-5">
          <div>
            <div className="font-mono-meta text-terracotta">Completa tu perfil</div>
            <div className="mt-1 font-display text-[16px] font-semibold tracking-tight text-obsidian">
              Tu perfil está incompleto
            </div>
            <div className="mt-0.5 text-[12.5px] text-obsidian/50">
              Con tus datos, los diagnósticos y planes se personalizan mucho mejor.
            </div>
          </div>
          <Link to="/perfil">
            <Button className="h-9 rounded-lg bg-obsidian px-4 text-[13px] font-medium text-alabaster hover:bg-obsidian/90">
              Completar perfil
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          testId={DASHBOARD.statSessions}
          label="Diagnósticos"
          value={data?.sessions_count ?? 0}
          hint="Conversaciones iniciadas"
          icon={Compass}
        />
        <Metric
          testId={DASHBOARD.statPlans}
          label="Planes activos"
          value={data?.plans_count ?? 0}
          hint="Planes de acción generados"
          icon={ListChecks}
        />
        <Metric
          label="Tareas completadas"
          value={total ? `${done}/${total}` : "0"}
          hint={`${pending} pendientes · ${inProgress} en curso`}
          icon={CheckCircle}
        />
        <Metric
          testId={DASHBOARD.statCompletion}
          label="Avance global"
          value={`${completion}%`}
          hint="Progreso de tus tareas"
          icon={TrendUp}
          accent
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <section className="app-card p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-mono-meta text-obsidian/35">Avance global</div>
                <h2 className="mt-1 font-display text-[19px] font-semibold tracking-tight text-obsidian">Tu progreso</h2>
              </div>
              <div className="stat-value text-[32px] font-semibold text-terracotta">{completion}%</div>
            </div>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-linen">
              <div className="h-full rounded-full bg-terracotta transition-all duration-500" style={{ width: `${completion}%` }} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Breakdown icon={CheckCircle} label="Completadas" value={done} tone="text-olive" />
              <Breakdown icon={CircleHalfTilt} label="En curso" value={inProgress} tone="text-terracotta" />
              <Breakdown icon={CircleDashed} label="Pendientes" value={pending} tone="text-obsidian/35" />
            </div>

            {total > 0 ? (
              <div className="mt-5 flex h-1.5 overflow-hidden rounded-full bg-linen">
                <div className="bg-olive" style={{ width: `${(done / total) * 100}%` }} />
                <div className="bg-terracotta/70" style={{ width: `${(inProgress / total) * 100}%` }} />
              </div>
            ) : null}
          </section>

          <section className="app-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-obsidian/8 px-6 py-4">
              <div>
                <div className="font-mono-meta text-obsidian/35">Seguimiento</div>
                <h2 className="mt-0.5 font-display text-[17px] font-semibold tracking-tight text-obsidian">Próximas acciones</h2>
              </div>
              <Link to="/planes" className="inline-flex items-center gap-1 text-[12px] font-medium text-obsidian/50 transition-colors hover:text-terracotta">
                Ver planes
                <ArrowRight size={13} />
              </Link>
            </div>

            <ul data-testid={DASHBOARD.upcomingList}>
              {(data?.upcoming || []).length === 0 ? (
                <li className="px-6 py-10 text-center">
                  <Target size={22} weight="duotone" className="mx-auto mb-2 text-obsidian/25" />
                  <div className="text-[13px] font-medium text-obsidian/60">Aún no hay tareas pendientes</div>
                  <div className="mt-1 text-[12px] text-obsidian/40">
                    Cuando generes un plan, verás aquí las próximas tareas priorizadas.
                  </div>
                </li>
              ) : (
                data.upcoming.map((u) => (
                  <li key={u.item_id} className="flex items-center justify-between gap-4 border-b border-obsidian/6 px-6 py-4 last:border-b-0 hover:bg-surface-muted/60">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-obsidian">{u.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-obsidian/40">
                          <span className="truncate">{u.plan_title}</span>
                          <span>·</span>
                          <span className="chip">{u.priority}</span>
                        </div>
                      </div>
                    </div>
                    <Link to={`/plan/${u.plan_id}`} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-terracotta hover:underline">
                      Ver plan
                      <ArrowRight size={12} />
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="relative overflow-hidden rounded-xl bg-obsidian p-6 text-alabaster">
            <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-terracotta/25" />
            <Sparkle size={22} weight="duotone" className="relative text-terracotta" />
            <div className="relative mt-3 font-display text-[20px] font-semibold leading-tight tracking-tight">Nuevo diagnóstico</div>
            <p className="relative mt-1.5 text-[12.5px] leading-relaxed text-alabaster/55">
              Elige otro objetivo o retoma uno pendiente.
            </p>
            <Button
              onClick={() => nav("/objetivos")}
              className="relative mt-5 h-9 w-full rounded-lg bg-terracotta text-[13px] font-medium text-alabaster hover:bg-terracotta/90"
            >
              <Compass size={15} className="mr-1.5" />
              Elegir objetivo
            </Button>
          </div>

          <section className="app-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono-meta text-obsidian/35">Historial</div>
                <h2 className="mt-0.5 font-display text-[16px] font-semibold tracking-tight text-obsidian">Planes recientes</h2>
              </div>
              <Kanban size={18} weight="duotone" className="text-obsidian/30" />
            </div>
            <ul className="mt-4 space-y-1">
              {(data?.recent_plans || []).length === 0 ? (
                <li className="text-[12.5px] text-obsidian/45">No hay planes todavía.</li>
              ) : (
                data.recent_plans.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/plan/${p.id}`}
                      className="group flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-[12.5px] text-obsidian/65 transition-colors hover:bg-surface-muted hover:text-terracotta"
                    >
                      <span className="truncate">{p.goal_title}</span>
                      <ArrowRight size={13} className="shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="app-card p-6">
            <div className="font-mono-meta text-obsidian/35">Ecosistema</div>
            <h2 className="mt-0.5 font-display text-[16px] font-semibold tracking-tight text-obsidian">Explora</h2>
            <div className="mt-4 space-y-1">
              {[
                { to: "/convocatorias", label: "Convocatorias abiertas", icon: Megaphone },
                { to: "/agentes", label: "Directorio de agentes", icon: UsersFour },
                { to: "/foro", label: "Foro de la comunidad", icon: ChatsCircle },
                { to: "/conocimiento", label: "Biblioteca de conocimiento", icon: BookOpen },
              ].map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] text-obsidian/60 transition-colors hover:bg-surface-muted hover:text-obsidian"
                  >
                    <Icon size={15} weight="duotone" className="text-obsidian/35" />
                    <span className="flex-1">{l.label}</span>
                    <ArrowRight size={12} className="text-obsidian/20" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, hint, icon: Icon, testId, accent }) {
  return (
    <div data-testid={testId} className="app-card p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-obsidian/45">{label}</span>
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${accent ? "bg-terracotta/10 text-terracotta" : "bg-surface-muted text-obsidian/35"}`}>
          <Icon size={14} weight="duotone" />
        </span>
      </div>
      <div className={`stat-value mt-3 text-[27px] font-semibold ${accent ? "text-terracotta" : "text-obsidian"}`}>{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-obsidian/35">{hint}</div>
    </div>
  );
}

function Breakdown({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-obsidian/8 bg-surface-muted/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-obsidian/40">
        <Icon size={12} className={tone} />
        {label}
      </div>
      <div className="stat-value mt-1 text-[17px] font-semibold text-obsidian">{value}</div>
    </div>
  );
}
