import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { plans as plansApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  CircleDashed,
  CircleHalfTilt,
  Compass,
  ListChecks,
  Target,
} from "@phosphor-icons/react";

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "active", label: "En curso" },
  { key: "done", label: "Completados" },
];

export default function PlansList() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    plansApi
      .list()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const stats = useMemo(() => {
    const list = items || [];
    const tasks = list.reduce((acc, p) => acc + (p.action_items || []).length, 0);
    const done = list.reduce(
      (acc, p) => acc + (p.action_items || []).filter((i) => i.status === "done").length,
      0
    );
    return {
      plans: list.length,
      tasks,
      done,
      rate: tasks ? Math.round((done / tasks) * 100) : 0,
    };
  }, [items]);

  const visible = useMemo(() => {
    const list = items || [];
    if (filter === "done") {
      return list.filter((p) => (p.action_items || []).length > 0 && (p.action_items || []).every((i) => i.status === "done"));
    }
    if (filter === "active") {
      return list.filter((p) => !((p.action_items || []).length > 0 && (p.action_items || []).every((i) => i.status === "done")));
    }
    return list;
  }, [items, filter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 font-mono-meta text-terracotta">Planes</div>
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[36px]">
            Tus planes de acción
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-obsidian/50">
            Cada plan reúne tareas, indicadores y contexto para que sepas qué hacer después.
          </p>
        </div>
        <Link to="/objetivos">
          <Button className="h-9 rounded-lg bg-obsidian px-4 text-[13px] font-medium text-alabaster hover:bg-obsidian/90">
            <Compass size={15} className="mr-1.5" />
            Nuevo diagnóstico
          </Button>
        </Link>
      </div>

      {items && items.length > 0 ? (
        <div className="mb-5 grid grid-cols-3 divide-x divide-obsidian/8 overflow-hidden rounded-xl border border-obsidian/8 bg-white">
          <SummaryStat label="Planes" value={stats.plans} icon={ListChecks} />
          <SummaryStat label="Tareas completadas" value={`${stats.done}/${stats.tasks}`} icon={CheckCircle} />
          <SummaryStat label="Avance medio" value={`${stats.rate}%`} icon={Target} accent />
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              filter === f.key
                ? "bg-obsidian text-alabaster"
                : "border border-obsidian/10 bg-white text-obsidian/55 hover:text-obsidian"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="app-card h-[230px] animate-pulse bg-white/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyPlans />
      ) : visible.length === 0 ? (
        <div className="app-card p-12 text-center">
          <CircleDashed size={26} weight="duotone" className="mx-auto mb-2 text-obsidian/25" />
          <div className="font-display text-[17px] font-semibold tracking-tight text-obsidian">
            No hay planes en este filtro
          </div>
          <p className="mt-1 text-[12.5px] text-obsidian/45">Prueba con “Todos” para ver el resto.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan }) {
  const items = plan.action_items || [];
  const total = items.length;
  const done = items.filter((i) => i.status === "done").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const next = items.find((i) => i.status !== "done");
  const complete = total > 0 && done === total;
  const created = new Date(plan.created_at).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      to={`/plan/${plan.id}`}
      className="app-card group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-obsidian/20 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2 py-1 text-[10.5px] font-medium text-obsidian/45">
            <CalendarBlank size={11} />
            {created}
          </span>
          {complete ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-olive/8 px-2 py-1 text-[10.5px] font-medium text-olive">
              <CheckCircle size={11} weight="fill" />
              Completado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-terracotta/8 px-2 py-1 text-[10.5px] font-medium text-terracotta">
              <CircleHalfTilt size={11} weight="fill" />
              En curso
            </span>
          )}
        </div>
        <span className="stat-value text-[20px] font-semibold text-terracotta">{pct}%</span>
      </div>

      <h2 className="mt-3 line-clamp-2 font-display text-[19px] font-semibold leading-snug tracking-tight text-obsidian transition-colors group-hover:text-terracotta">
        {plan.goal_title}
      </h2>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-linen">
        <div className="h-full rounded-full bg-terracotta transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-obsidian/40">
        <span className="inline-flex items-center gap-1">
          <CheckCircle size={11} className="text-olive" />
          {done} completadas
        </span>
        <span className="inline-flex items-center gap-1">
          <CircleHalfTilt size={11} className="text-terracotta" />
          {inProgress} en curso
        </span>
        <span className="inline-flex items-center gap-1">
          <CircleDashed size={11} />
          {total - done - inProgress} pendientes
        </span>
      </div>

      <div className="mt-auto pt-4">
        {next ? (
          <div className="rounded-lg border border-obsidian/6 bg-surface-muted/70 px-3 py-2.5">
            <div className="font-mono-meta text-obsidian/30">Próxima acción</div>
            <div className="mt-1 line-clamp-1 text-[12.5px] font-medium text-obsidian/75">{next.title}</div>
          </div>
        ) : (
          <div className="rounded-lg border border-olive/12 bg-olive/5 px-3 py-2.5 text-[12.5px] text-olive">
            Todas las tareas están completadas.
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-obsidian/35">
            <span className="inline-flex items-center gap-1">
              <ListChecks size={12} />
              {total} tareas
            </span>
            <span className="inline-flex items-center gap-1">
              <Target size={12} />
              {plan.indicators?.length || 0} indicadores
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-obsidian/55 transition-colors group-hover:text-terracotta">
            Abrir plan
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SummaryStat({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          accent ? "bg-terracotta/10 text-terracotta" : "bg-surface-muted text-obsidian/35"
        }`}
      >
        <Icon size={15} weight="duotone" />
      </span>
      <div>
        <div className="text-[10.5px] font-medium text-obsidian/40">{label}</div>
        <div className="stat-value text-[20px] font-semibold text-obsidian">{value}</div>
      </div>
    </div>
  );
}

function EmptyPlans() {
  return (
    <div className="app-card p-10 text-center sm:p-14">
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-terracotta/8 text-terracotta">
        <ListChecks size={22} weight="duotone" />
      </span>
      <h2 className="font-display text-[21px] font-semibold tracking-tight text-obsidian">Aún no tienes planes</h2>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-obsidian/50">
        Completa un diagnóstico y te propondremos un plan con tareas priorizadas, indicadores y documentos de apoyo.
      </p>
      <Link to="/objetivos" className="mt-5 inline-block">
        <Button className="h-9 rounded-lg bg-terracotta px-4 text-[13px] text-alabaster hover:bg-terracotta/90">
          Empezar un diagnóstico
          <ArrowRight size={14} className="ml-1.5" />
        </Button>
      </Link>
    </div>
  );
}
