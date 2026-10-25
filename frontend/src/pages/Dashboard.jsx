import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboard as dashApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DASHBOARD } from "@/constants/testIds";
import { ArrowRight, Compass, Kanban, Sparkle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    dashApi.summary().then(setData).catch(() => setData(null));
  }, []);

  const completion = data ? Math.round((data.completion_rate || 0) * 100) : 0;
  const needsProfile = !user?.profile_complete;

  return (
    <div data-testid={DASHBOARD.root}>
      <div className="mb-10">
        <div className="font-mono-meta text-terracotta mb-4">panel general</div>
        <h1 className="font-serif-display text-4xl md:text-5xl leading-tight">Hola, {user?.name?.split(" ")[0] || "creador"}.</h1>
        <p className="text-obsidian/70 mt-3 max-w-2xl">
          Aquí verás tu avance, próximas acciones y podrás abrir un nuevo diagnóstico cuando lo necesites.
        </p>
      </div>

      {needsProfile ? (
        <div className="mb-8 grid-frame p-6 md:p-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono-meta text-terracotta mb-1">completa tu perfil</div>
            <div className="font-serif-display text-2xl">Tu perfil está incompleto</div>
            <div className="text-sm text-obsidian/60 mt-1">Con tu perfil, los diagnósticos y planes se personalizan mucho mejor.</div>
          </div>
          <Link to="/perfil">
            <Button className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11 px-6 lift">
              Completar perfil
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 border border-obsidian/10 bg-white mb-10">
        <Stat testId={DASHBOARD.statSessions} label="Diagnósticos" value={data?.sessions_count ?? 0} />
        <Stat testId={DASHBOARD.statPlans} label="Planes activos" value={data?.plans_count ?? 0} borderL />
        <Stat label="Tareas totales" value={data?.tasks_total ?? 0} borderL />
        <Stat testId={DASHBOARD.statCompletion} label="Avance" value={`${completion}%`} borderL />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Progress + upcoming */}
        <div className="lg:col-span-8 grid-frame p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-mono-meta text-obsidian/50">avance global</div>
              <div className="font-serif-display text-3xl mt-1">Tu progreso</div>
            </div>
            <div className="font-serif-display text-4xl text-terracotta">{completion}%</div>
          </div>
          <Progress value={completion} className="h-2 bg-linen" />
          <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
            <div><div className="font-mono-meta text-obsidian/50">completadas</div><div className="font-serif-display text-2xl">{data?.tasks_done ?? 0}</div></div>
            <div><div className="font-mono-meta text-obsidian/50">en curso</div><div className="font-serif-display text-2xl">{data?.tasks_in_progress ?? 0}</div></div>
            <div><div className="font-mono-meta text-obsidian/50">pendientes</div><div className="font-serif-display text-2xl">{data?.tasks_pending ?? 0}</div></div>
          </div>

          <div className="rule-divider my-8" />

          <div className="font-mono-meta text-obsidian/50 mb-4">próximas acciones</div>
          <ul data-testid={DASHBOARD.upcomingList} className="divide-y divide-obsidian/10">
            {(data?.upcoming || []).length === 0 ? (
              <li className="py-6 text-obsidian/60 text-sm">Cuando generes un plan, verás aquí las próximas tareas priorizadas.</li>
            ) : (
              data.upcoming.map((u) => (
                <li key={u.item_id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-obsidian">{u.title}</div>
                    <div className="font-mono-meta text-obsidian/50 mt-1">{u.plan_title} · {u.priority}</div>
                  </div>
                  <Link to={`/plan/${u.plan_id}`} className="text-terracotta text-sm hover:underline font-medium whitespace-nowrap">
                    Ver plan →
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-obsidian text-alabaster p-8">
            <Sparkle size={26} weight="duotone" />
            <div className="font-serif-display text-3xl mt-4 leading-tight">Nuevo diagnóstico</div>
            <p className="text-alabaster/70 text-sm mt-2 mb-6">Elige otro objetivo o retoma uno pendiente.</p>
            <Button
              data-testid={DASHBOARD.newDiagnostic}
              onClick={() => nav("/objetivos")}
              className="rounded-full bg-terracotta hover:bg-terracotta/90 text-alabaster h-11 px-6 w-full lift"
            >
              <Compass size={16} className="mr-2" />
              Elegir objetivo
            </Button>
          </div>

          <div className="grid-frame p-6">
            <Kanban size={22} weight="duotone" className="text-obsidian" />
            <div className="font-serif-display text-2xl mt-3">Planes recientes</div>
            <ul className="mt-4 space-y-3">
              {(data?.recent_plans || []).length === 0 ? (
                <li className="text-sm text-obsidian/60">No hay planes todavía.</li>
              ) : (
                data.recent_plans.map((p) => (
                  <li key={p.id}>
                    <Link to={`/plan/${p.id}`} className="flex items-center justify-between text-sm hover:text-terracotta">
                      <span className="truncate mr-2">{p.goal_title}</span>
                      <ArrowRight size={14} />
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, borderL, testId }) {
  return (
    <div data-testid={testId} className={`p-8 ${borderL ? "border-t md:border-t-0 md:border-l border-obsidian/10" : ""}`}>
      <div className="font-mono-meta text-obsidian/50">{label}</div>
      <div className="font-serif-display text-4xl mt-2">{value}</div>
    </div>
  );
}
