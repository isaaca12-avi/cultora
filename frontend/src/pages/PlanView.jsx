import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { plans as plansApi } from "@/lib/api";
import { PLAN } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CircleDashed,
  CircleHalfTilt,
  CheckCircle,
  Warning,
  BookOpen,
  Target,
  MapTrifold,
} from "@phosphor-icons/react";

const STATUS_META = {
  pending: { label: "Pendiente", icon: CircleDashed, tone: "text-obsidian/50" },
  in_progress: { label: "En curso", icon: CircleHalfTilt, tone: "text-terracotta" },
  done: { label: "Completada", icon: CheckCircle, tone: "text-olive" },
};

export default function PlanView() {
  const { planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const [note, setNote] = useState("");

  const load = async () => {
    const p = await plansApi.get(planId);
    setPlan(p);
  };

  useEffect(() => {
    load().catch(() => toast.error("Plan no encontrado"));
  }, [planId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan) return <div className="font-serif-display text-2xl text-obsidian/50">Cargando plan…</div>;

  const setStatus = async (itemId, status) => {
    try {
      const updated = await plansApi.updateItem(planId, itemId, { status });
      setPlan(updated);
    } catch (e) {
      toast.error("No pudimos actualizar la tarea");
    }
  };

  const saveNote = async (itemId) => {
    try {
      const updated = await plansApi.updateItem(planId, itemId, { note });
      setPlan(updated);
      setOpenItem(null);
      setNote("");
      toast.success("Nota guardada");
    } catch (e) {
      toast.error("No pudimos guardar la nota");
    }
  };

  const total = plan.action_items.length;
  const done = plan.action_items.filter((i) => i.status === "done").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <div className="font-mono-meta text-terracotta mb-4">plan de acción</div>
        <h1 data-testid={PLAN.title} className="font-serif-display text-4xl md:text-5xl leading-tight">
          {plan.goal_title}
        </h1>
        <div className="mt-4 flex items-center gap-4 text-sm text-obsidian/60">
          <span className="font-mono-meta">avance {pct}%</span>
          <span>·</span>
          <span className="font-mono-meta">{done} / {total} tareas</span>
        </div>
      </div>

      {/* Executive brief */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-obsidian/10 border border-obsidian/10 mb-12">
        <Block title="Situación actual" icon={MapTrifold} testId={PLAN.situation}>
          <p className="text-obsidian/80 leading-relaxed">{plan.situacion_actual}</p>
        </Block>
        <Block title="Lectura estratégica" icon={Target} testId={PLAN.reading}>
          <p className="text-obsidian/80 leading-relaxed">{plan.lectura_estrategica}</p>
        </Block>

        <Block title="Causas detectadas" icon={Warning}>
          {plan.causas.length ? (
            <ul className="space-y-4">
              {plan.causas.map((c, i) => (
                <li key={i} data-testid={PLAN.cause(i)}>
                  <div className="font-medium text-obsidian">{c.title}</div>
                  <div className="text-sm text-obsidian/60 mt-1">{c.detail}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-obsidian/50 text-sm">No se detectaron causas específicas.</div>
          )}
        </Block>

        <Block title="Prioridades" icon={Target}>
          {plan.prioridades.length ? (
            <ol className="space-y-3">
              {plan.prioridades.map((p, i) => (
                <li key={i} data-testid={PLAN.priority(i)} className="flex gap-3">
                  <span className="font-serif-display text-2xl text-terracotta w-8">0{i + 1}</span>
                  <span className="text-obsidian/85 pt-1">{p}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-obsidian/50 text-sm">Sin prioridades detectadas.</div>
          )}
        </Block>
      </section>

      {/* Action items */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-mono-meta text-obsidian/50">tareas concretas</div>
            <h2 className="font-serif-display text-3xl md:text-4xl">Plan accionable</h2>
          </div>
        </div>

        <div className="grid-frame divide-y divide-obsidian/10">
          {plan.action_items.map((it, i) => {
            const meta = STATUS_META[it.status] || STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <div key={it.id} data-testid={PLAN.item(it.id)} className="p-6 md:p-8">
                <div className="flex items-start gap-5">
                  <button
                    onClick={() =>
                      setStatus(it.id, it.status === "done" ? "pending" : it.status === "pending" ? "in_progress" : "done")
                    }
                    data-testid={PLAN.itemStatus(it.id)}
                    className={`${meta.tone} shrink-0 lift`}
                    title="Cambiar estado"
                  >
                    <Icon size={26} weight="duotone" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="chip">{it.priority}</span>
                      <span className="chip">{it.due_in_days}d</span>
                      <span className="chip">{it.source === "ai" ? "IA" : "método"}</span>
                    </div>
                    <div className="font-serif-display text-2xl mb-1">{it.title}</div>
                    <div className="text-obsidian/70 text-sm leading-relaxed">{it.detail}</div>
                    {it.note ? (
                      <div className="mt-4 pl-4 border-l-2 border-terracotta/50 text-sm text-obsidian/70">
                        <div className="font-mono-meta text-obsidian/40 mb-1">nota</div>
                        {it.note}
                      </div>
                    ) : null}

                    {openItem === it.id ? (
                      <div className="mt-4">
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={3}
                          placeholder="Escribe tu avance o notas para esta tarea…"
                          className="bg-white border-obsidian/15 resize-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={() => saveNote(it.id)}
                            className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-9 px-5 lift"
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setOpenItem(null); setNote(""); }}
                            className="rounded-full border-obsidian/20 bg-transparent hover:bg-linen h-9 px-5"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          className="rounded-full h-9 px-4 border-obsidian/15 bg-transparent hover:bg-linen"
                          data-testid={PLAN.itemStart(it.id)}
                          onClick={() => setStatus(it.id, "in_progress")}
                        >
                          Marcar en curso
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full h-9 px-4 border-obsidian/15 bg-transparent hover:bg-linen"
                          data-testid={PLAN.itemDone(it.id)}
                          onClick={() => setStatus(it.id, "done")}
                        >
                          Marcar completada
                        </Button>
                        <button
                          onClick={() => { setOpenItem(it.id); setNote(it.note || ""); }}
                          className="text-sm text-obsidian/60 hover:text-terracotta font-medium px-3"
                        >
                          {it.note ? "Editar nota" : "Añadir nota"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Indicators + docs */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-obsidian/10 border border-obsidian/10 mb-16">
        <Block title="Indicadores base" icon={Target} className="lg:col-span-1">
          <ul className="space-y-4">
            {plan.indicators.map((ind, i) => (
              <li key={i} data-testid={PLAN.indicator(i)}>
                <div className="font-medium text-obsidian">{ind.name}</div>
                <div className="font-mono-meta text-terracotta mt-1">meta · {ind.target}</div>
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Documentos relacionados" icon={BookOpen} className="lg:col-span-2">
          {plan.related_docs.length ? (
            <ul className="divide-y divide-obsidian/10">
              {plan.related_docs.map((d) => (
                <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                  <Link to={`/conocimiento/${d.id}`} className="block group">
                    <div className="font-medium text-obsidian group-hover:text-terracotta">{d.title}</div>
                    <div className="text-sm text-obsidian/60 mt-1">{d.summary}</div>
                    <div className="font-mono-meta text-obsidian/40 mt-1">{d.category}</div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-obsidian/50 text-sm">Sin documentos relacionados.</div>
          )}
        </Block>
      </section>
    </div>
  );
}

function Block({ title, icon: Icon, children, testId, className = "" }) {
  return (
    <div className={`bg-white p-8 ${className}`} data-testid={testId}>
      <div className="flex items-center gap-3 mb-5">
        <Icon size={20} weight="duotone" className="text-terracotta" />
        <div className="font-mono-meta text-obsidian/50">{title}</div>
      </div>
      {children}
    </div>
  );
}
