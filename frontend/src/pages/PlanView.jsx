import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { plans as plansApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PLAN } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowSquareOut,
  BookOpen,
  CalendarBlank,
  CheckCircle,
  CircleDashed,
  CircleHalfTilt,
  Clock,
  FilePdf,
  MapTrifold,
  Question,
  Sparkle,
  Target,
  ThumbsDown,
  ThumbsUp,
  Warning,
} from "@phosphor-icons/react";

const STATUS_META = {
  pending: {
    label: "Pendiente",
    next: "in_progress",
    nextLabel: "Marcar en curso",
    icon: CircleDashed,
    tone: "text-obsidian/30",
    chip: "bg-obsidian/5 text-obsidian/50 border-obsidian/10",
  },
  in_progress: {
    label: "En curso",
    next: "done",
    nextLabel: "Marcar completada",
    icon: CircleHalfTilt,
    tone: "text-terracotta",
    chip: "bg-terracotta/8 text-terracotta border-terracotta/15",
  },
  done: {
    label: "Completada",
    next: "pending",
    nextLabel: "Reabrir tarea",
    icon: CheckCircle,
    tone: "text-olive",
    chip: "bg-olive/8 text-olive border-olive/15",
  },
};

const PRIORITY_TONE = {
  alta: "bg-terracotta/8 text-terracotta border-terracotta/15",
  media: "bg-olive/8 text-olive border-olive/15",
  baja: "bg-obsidian/5 text-obsidian/45 border-obsidian/10",
};

const PROFILE_LABELS = {
  agent_type: "Tipo de agente",
  discipline: "Disciplina",
  stage: "Etapa",
  territory: "Territorio",
  team_size: "Equipo",
  monthly_income: "Ingresos mensuales",
  audience_base: "Público",
  channels: "Canales",
  formalized: "Formalización",
};

export default function PlanView() {
  const { planId } = useParams();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [openItem, setOpenItem] = useState(null);
  const [note, setNote] = useState("");
  const [savingItem, setSavingItem] = useState(null);
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savingItemFeedback, setSavingItemFeedback] = useState(null);

  useEffect(() => {
    let alive = true;
    plansApi
      .get(planId)
      .then((p) => {
        if (!alive) return;
        setPlan(p);
        setRating(p.feedback?.rating || null);
        setComment(p.feedback?.comment || "");
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => {
      alive = false;
    };
  }, [planId]);

  if (notFound) {
    return (
      <div className="app-card mx-auto max-w-lg p-10 text-center">
        <Warning size={24} weight="duotone" className="mx-auto mb-3 text-terracotta" />
        <div className="font-display text-[20px] font-semibold tracking-tight">Plan no encontrado</div>
        <p className="mt-1 text-[13px] text-obsidian/50">Puede que se haya eliminado o no tengas acceso.</p>
        <Link to="/planes" className="mt-5 inline-block">
          <Button className="h-9 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
            Ver mis planes
          </Button>
        </Link>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="app-card h-[320px] animate-pulse bg-white/60 lg:col-span-8" />
        <div className="app-card h-[320px] animate-pulse bg-white/60 lg:col-span-4" />
      </div>
    );
  }

  const total = plan.action_items.length;
  const done = plan.action_items.filter((i) => i.status === "done").length;
  const inProgress = plan.action_items.filter((i) => i.status === "in_progress").length;
  const pending = total - done - inProgress;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const created = new Date(plan.created_at).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const feedbackSaved = Boolean(plan.feedback?.updated_at || plan.feedback?.created_at);
  const basis = plan.basis || null;
  const profileEntries = basis?.profile
    ? Object.entries(basis.profile).filter(([, v]) => v && (!Array.isArray(v) || v.length))
    : [];

  const update = async (itemId, payload) => {
    setSavingItem(itemId);
    try {
      const updated = await plansApi.updateItem(planId, itemId, payload);
      setPlan((prev) => ({
        ...updated,
        feedback: prev?.feedback || null,
        item_feedback: prev?.item_feedback || [],
      }));
      return true;
    } catch (e) {
      toast.error("No pudimos actualizar la tarea");
      return false;
    } finally {
      setSavingItem(null);
    }
  };

  const setStatus = async (item) => {
    const next = STATUS_META[item.status]?.next || "pending";
    const ok = await update(item.id, { status: next });
    if (ok) {
      const labels = { pending: "Tarea reabierta", in_progress: "Tarea en curso", done: "Tarea completada" };
      toast.success(labels[next]);
    }
  };

  const saveNote = async (itemId) => {
    const ok = await update(itemId, { note });
    if (ok) {
      setOpenItem(null);
      setNote("");
      toast.success("Nota guardada");
    }
  };

  const saveFeedback = async (nextRating = rating) => {
    if (!nextRating) return;
    setSavingFeedback(true);
    try {
      const res = await plansApi.feedback(planId, { rating: nextRating, comment: comment.trim() });
      setPlan((prev) => ({ ...prev, feedback: res.feedback }));
      setRating(res.feedback.rating);
      toast.success("Gracias, tu valoración quedó guardada");
    } catch (e) {
      toast.error("No pudimos guardar tu valoración");
    } finally {
      setSavingFeedback(false);
    }
  };

  const exportPdf = () => {
    const previousTitle = document.title;
    document.title = `Cultora — ${plan.goal_title}`;
    try {
      window.print();
    } finally {
      document.title = previousTitle;
    }
  };

  const saveItemFeedback = async (itemId, payload) => {
    setSavingItemFeedback(itemId);
    try {
      const res = await plansApi.feedback(planId, { ...payload, item_id: itemId });
      setPlan((prev) => {
        const others = (prev.item_feedback || []).filter((f) => f.item_id !== itemId);
        return { ...prev, item_feedback: [...others, res.feedback] };
      });
      toast.success("Gracias, tu valoración de la tarea quedó guardada");
    } catch (e) {
      toast.error("No pudimos guardar la valoración de la tarea");
    } finally {
      setSavingItemFeedback(null);
    }
  };

  return (
    <div>
      {/* Portada sólo para impresión / PDF */}
      <div className="print-only mb-8">
        <div className="flex items-end justify-between border-b border-obsidian/25 pb-3">
          <div className="font-display text-[22px] font-bold tracking-tight">Cultora</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-obsidian/50">Plan de acción</div>
        </div>
        <div className="mt-10">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-obsidian/45">
            {created} · {pct}% de avance
          </div>
          <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-tight">{plan.goal_title}</h2>
          <p className="mt-2 text-[13px] text-obsidian/55">
            Plan personalizado{user?.name ? ` para ${user.name}` : ""} · {done} de {total} tareas completadas
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print-hide">
        <Link
          to="/planes"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-obsidian/50 transition-colors hover:text-obsidian"
        >
          <ArrowLeft size={14} />
          Todos los planes
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportPdf}
            className="h-9 rounded-lg border-obsidian/12 bg-white px-3.5 text-[12.5px] font-medium text-obsidian/70 hover:border-obsidian/25 hover:bg-white hover:text-obsidian"
          >
            <FilePdf size={15} className="mr-1.5" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <header className="app-card mb-4 p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono-meta text-terracotta">Plan de acción</div>
            <h1
              data-testid={PLAN.title}
              className="mt-1.5 max-w-3xl font-display text-[27px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[33px]"
            >
              {plan.goal_title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-obsidian/40">
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank size={12} />
                {created}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Target size={12} />
                {plan.indicators.length} indicadores
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={12} />
                {plan.related_docs.length} documentos de apoyo
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="stat-value text-[38px] font-semibold leading-none text-terracotta">{pct}%</div>
            <div className="mt-1 text-[10.5px] font-medium text-obsidian/40">avance del plan</div>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-linen">
          <div className="h-full rounded-full bg-terracotta transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <MiniStat icon={CheckCircle} label="Completadas" value={done} tone="text-olive" />
          <MiniStat icon={CircleHalfTilt} label="En curso" value={inProgress} tone="text-terracotta" />
          <MiniStat icon={CircleDashed} label="Pendientes" value={pending} tone="text-obsidian/35" />
        </div>
      </header>

      <section className="mb-4 grid gap-4 md:grid-cols-2">
        <Block title="Situación actual" icon={MapTrifold} testId={PLAN.situation}>
          <p className="text-[13px] leading-relaxed text-obsidian/70">{plan.situacion_actual}</p>
        </Block>
        <Block title="Lectura estratégica" icon={Target} testId={PLAN.reading}>
          <p className="text-[13px] leading-relaxed text-obsidian/70">{plan.lectura_estrategica}</p>
        </Block>
        <Block title="Causas detectadas" icon={Warning}>
          {plan.causas.length ? (
            <ul className="space-y-3">
              {plan.causas.map((c, i) => (
                <li key={i} data-testid={PLAN.cause(i)} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                  <div>
                    <div className="text-[13px] font-medium text-obsidian">{c.title}</div>
                    <div className="mt-0.5 text-[12px] leading-relaxed text-obsidian/50">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-obsidian/45">No se detectaron causas específicas.</p>
          )}
        </Block>
        <Block title="Prioridades" icon={Target}>
          {plan.prioridades.length ? (
            <ol className="space-y-2.5">
              {plan.prioridades.map((p, i) => (
                <li key={i} data-testid={PLAN.priority(i)} className="flex gap-3">
                  <span className="font-display text-[17px] font-semibold leading-none text-terracotta">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] leading-relaxed text-obsidian/75">{p}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[12.5px] text-obsidian/45">Sin prioridades detectadas.</p>
          )}
        </Block>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="font-mono-meta text-obsidian/35">Ejecución</div>
              <h2 className="mt-0.5 font-display text-[21px] font-semibold tracking-tight text-obsidian">
                Tareas del plan
              </h2>
            </div>
            <span className="text-[11.5px] text-obsidian/40">{total} tareas · {done} completadas</span>
          </div>

          <div className="space-y-3">
            {plan.action_items.map((it) => (
              <ActionItem
                key={it.id}
                item={it}
                saving={savingItem === it.id}
                open={openItem === it.id}
                note={note}
                onNoteChange={setNote}
                onOpenNote={() => {
                  setOpenItem(it.id);
                  setNote(it.note || "");
                }}
                onCancelNote={() => {
                  setOpenItem(null);
                  setNote("");
                }}
                onSaveNote={() => saveNote(it.id)}
                onStatus={() => setStatus(it)}
                onStart={() => update(it.id, { status: "in_progress" })}
                onDone={() => update(it.id, { status: "done" })}
                feedback={(plan.item_feedback || []).find((f) => f.item_id === it.id) || null}
                feedbackSaving={savingItemFeedback === it.id}
                onSaveFeedback={(payload) => saveItemFeedback(it.id, payload)}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <section className="app-card p-5 print-avoid-break">
            <div className="flex items-center gap-2">
              <Target size={16} weight="duotone" className="text-terracotta" />
              <div className="font-mono-meta text-obsidian/40">Indicadores base</div>
            </div>
            <ul className="mt-4 space-y-3">
              {plan.indicators.map((ind, i) => (
                <li key={i} data-testid={PLAN.indicator(i)} className="border-b border-obsidian/6 pb-3 last:border-b-0 last:pb-0">
                  <div className="text-[12.5px] font-medium text-obsidian">{ind.name}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-terracotta">meta · {ind.target}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="app-card p-5 print-avoid-break">
            <div className="flex items-center gap-2">
              <BookOpen size={16} weight="duotone" className="text-terracotta" />
              <div className="font-mono-meta text-obsidian/40">Documentos de apoyo</div>
            </div>
            {plan.related_docs.length ? (
              <ul className="mt-3 divide-y divide-obsidian/6">
                {plan.related_docs.map((d) => (
                  <li key={d.id} className="py-2.5 first:pt-1 last:pb-0">
                    <Link to={`/conocimiento/${d.id}`} className="group block">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[12.5px] font-medium text-obsidian transition-colors group-hover:text-terracotta">
                          {d.title}
                        </div>
                        <ArrowSquareOut size={12} className="mt-0.5 shrink-0 text-obsidian/25" />
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-obsidian/45">{d.summary}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] text-obsidian/45">Sin documentos relacionados.</p>
            )}
          </section>

          <Explainability plan={plan} basis={basis} profileEntries={profileEntries} />

          <FeedbackCard
            rating={rating}
            comment={comment}
            saved={feedbackSaved}
            saving={savingFeedback}
            onSelect={(value) => {
              setRating(value);
              saveFeedback(value);
            }}
            onComment={setComment}
            onSave={() => saveFeedback()}
          />
        </aside>
      </div>
    </div>
  );
}

function ActionItem({
  item,
  saving,
  open,
  note,
  onNoteChange,
  onOpenNote,
  onCancelNote,
  onSaveNote,
  onStatus,
  onStart,
  onDone,
  feedback,
  feedbackSaving,
  onSaveFeedback,
}) {
  const [showWhy, setShowWhy] = useState(false);
  const meta = STATUS_META[item.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const isDone = item.status === "done";
  const why =
    item.why ||
    "Esta tarea forma parte del método Cultora para tu objetivo y se priorizó a partir de las causas detectadas en tu diagnóstico.";
  const sourceLabel = item.source_label || (item.source === "ai" ? "IA personalizada" : "Método Cultora");

  return (
    <article
      data-testid={PLAN.item(item.id)}
      className={`app-card p-5 print-avoid-break ${isDone ? "bg-surface-muted/50" : ""}`}
    >
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={onStatus}
          disabled={saving}
          data-testid={PLAN.itemStatus(item.id)}
          className={`mt-0.5 shrink-0 transition-transform hover:scale-110 ${meta.tone} disabled:opacity-40`}
          title="Cambiar estado"
          aria-label={`Estado: ${meta.label}. Cambiar`}
        >
          <Icon size={23} weight="duotone" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${PRIORITY_TONE[item.priority] || PRIORITY_TONE.media}`}>
              {item.priority}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-obsidian/8 bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-obsidian/45">
              <Clock size={10} />
              {item.due_in_days} días
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}>
              {meta.label}
            </span>
            {item.source === "ai" ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-terracotta/12 bg-terracotta/5 px-1.5 py-0.5 text-[10px] font-medium text-terracotta">
                <Sparkle size={10} weight="fill" />
                {sourceLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-obsidian/8 bg-white px-1.5 py-0.5 text-[10px] font-medium text-obsidian/40">
                <BookOpen size={10} />
                {sourceLabel}
              </span>
            )}
          </div>

          <h3 className={`mt-2 font-display text-[15.5px] font-semibold leading-snug tracking-tight ${isDone ? "text-obsidian/45 line-through" : "text-obsidian"}`}>
            {item.title}
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-obsidian/55">{item.detail}</p>

          {item.note ? (
            <div className="mt-3 rounded-lg border border-obsidian/6 bg-surface-muted/70 px-3 py-2">
              <div className="font-mono-meta text-obsidian/30">Tu nota</div>
              <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-obsidian/65">{item.note}</p>
            </div>
          ) : null}

          {showWhy ? (
            <div className="mt-3 rounded-lg border border-terracotta/12 bg-terracotta/5 px-3 py-2.5 print-avoid-break">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-terracotta">
                <Question size={11} weight="bold" />
                Por qué esta tarea
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-obsidian/65">{why}</p>
            </div>
          ) : null}
          <p className="print-only mt-2 text-[10.5px] leading-relaxed text-obsidian/50">
            Por qué: {why}
          </p>

          {open ? (
            <div className="mt-3">
              <Textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                rows={3}
                placeholder="Escribe tu avance, un obstáculo o el siguiente paso…"
                className="resize-none rounded-lg border-obsidian/12 bg-white text-[12.5px]"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={onSaveNote}
                  disabled={saving}
                  className="h-8 rounded-lg bg-obsidian px-3.5 text-[12px] text-alabaster hover:bg-obsidian/90"
                >
                  Guardar nota
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancelNote}
                  className="h-8 rounded-lg border-obsidian/12 bg-white px-3.5 text-[12px] hover:bg-linen/60"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 print-hide">
              {item.status !== "pending" ? (
                <button
                  type="button"
                  onClick={onStart}
                  disabled={saving || item.status === "in_progress"}
                  data-testid={PLAN.itemStart(item.id)}
                  className="text-[11.5px] font-medium text-obsidian/45 transition-colors hover:text-terracotta disabled:opacity-30"
                >
                  Marcar en curso
                </button>
              ) : null}
              <button
                type="button"
                onClick={onDone}
                disabled={saving || item.status === "done"}
                data-testid={PLAN.itemDone(item.id)}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-obsidian/45 transition-colors hover:text-olive disabled:opacity-30"
              >
                <CheckCircle size={12} />
                {item.status === "done" ? "Completada" : "Marcar completada"}
              </button>
              {item.status === "pending" ? (
                <button
                  type="button"
                  onClick={onStart}
                  disabled={saving}
                  data-testid={PLAN.itemStart(item.id)}
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium text-obsidian/45 transition-colors hover:text-terracotta disabled:opacity-30"
                >
                  <CircleHalfTilt size={12} />
                  Empezar
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenNote}
                className="text-[11.5px] font-medium text-obsidian/45 transition-colors hover:text-obsidian"
              >
                {item.note ? "Editar nota" : "Añadir nota"}
              </button>
              <button
                type="button"
                onClick={() => setShowWhy((s) => !s)}
                className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-terracotta/80 transition-colors hover:text-terracotta"
              >
                <Question size={12} />
                {showWhy ? "Ocultar el por qué" : "¿Por qué?"}
              </button>
            </div>
          )}

          <TaskFeedback feedback={feedback} saving={feedbackSaving} onSave={onSaveFeedback} />
        </div>
      </div>
    </article>
  );
}

function TaskFeedback({ feedback, saving, onSave }) {
  const [rating, setRating] = useState(feedback?.rating || null);
  const [comment, setComment] = useState(feedback?.comment || "");
  const [open, setOpen] = useState(Boolean(feedback?.comment));

  useEffect(() => {
    setRating(feedback?.rating || null);
    setComment(feedback?.comment || "");
  }, [feedback?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (value) => {
    setRating(value);
    setOpen(true);
    onSave({ rating: value, comment: comment.trim() });
  };

  return (
    <div className="mt-3 border-t border-obsidian/6 pt-2.5 print-hide">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10.5px] text-obsidian/35">¿Te sirvió esta tarea?</span>
        <button
          type="button"
          onClick={() => choose("up")}
          disabled={saving}
          aria-label="Tarea útil"
          className={`grid h-6 w-6 place-items-center rounded-md border transition-colors disabled:opacity-40 ${
            rating === "up"
              ? "border-olive/25 bg-olive/8 text-olive"
              : "border-obsidian/8 bg-white text-obsidian/30 hover:text-obsidian/60"
          }`}
        >
          <ThumbsUp size={11} weight={rating === "up" ? "fill" : "regular"} />
        </button>
        <button
          type="button"
          onClick={() => choose("down")}
          disabled={saving}
          aria-label="Tarea poco útil"
          className={`grid h-6 w-6 place-items-center rounded-md border transition-colors disabled:opacity-40 ${
            rating === "down"
              ? "border-terracotta/25 bg-terracotta/8 text-terracotta"
              : "border-obsidian/8 bg-white text-obsidian/30 hover:text-obsidian/60"
          }`}
        >
          <ThumbsDown size={11} weight={rating === "down" ? "fill" : "regular"} />
        </button>
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="ml-1 text-[10.5px] text-obsidian/35 underline-offset-2 transition-colors hover:text-obsidian/60 hover:underline"
        >
          {feedback?.comment ? "Editar comentario" : "Comentar"}
        </button>
        {feedback?.rating && !saving ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-olive">
            <CheckCircle size={10} weight="fill" />
            Guardada
          </span>
        ) : null}
        {saving ? (
          <span className="ml-auto text-[10px] text-obsidian/35">Guardando…</span>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            placeholder={rating ? "¿Qué mejorarías de esta tarea? (opcional)" : "Elige un pulgar y deja tu comentario"}
            className="h-8 min-w-0 flex-1 rounded-md border border-obsidian/10 bg-white px-2.5 text-[11.5px] text-obsidian placeholder:text-obsidian/30 outline-none focus:border-terracotta/40"
          />
          <button
            type="button"
            onClick={() => onSave({ rating, comment: comment.trim() })}
            disabled={!rating || saving}
            className="h-8 rounded-md bg-obsidian px-3 text-[11px] font-medium text-alabaster transition-colors hover:bg-obsidian/90 disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Explainability({ plan, basis, profileEntries }) {
  return (
    <section className="app-card p-5 print-avoid-break">
      <div className="flex items-center gap-2">
        <Sparkle size={16} weight="duotone" className="text-terracotta" />
        <div className="font-mono-meta text-obsidian/40">Cómo se construyó</div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-obsidian/55">
        Este plan combina el método Cultora con tus respuestas al diagnóstico
        {basis ? " y tu perfil de agente cultural." : "."}
      </p>

      {basis ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniFact value={basis.answers?.length || 0} label="respuestas" />
            <MiniFact value={profileEntries.length} label="datos de perfil" />
            <MiniFact value={basis.knowledge_sources?.length || 0} label="fuentes" />
          </div>

          {profileEntries.length ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {profileEntries.slice(0, 6).map(([key, value]) => (
                <span key={key} className="rounded-md border border-obsidian/8 bg-white px-1.5 py-0.5 text-[10px] text-obsidian/45">
                  {PROFILE_LABELS[key] || key}: <span className="font-medium text-obsidian/65">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                </span>
              ))}
            </div>
          ) : null}

          {basis.answers?.length ? (
            <details className="mt-3 print-hide">
              <summary className="cursor-pointer text-[11.5px] font-medium text-terracotta">
                Ver respuestas usadas ({basis.answers.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {basis.answers.map((a, i) => (
                  <li key={i} className="rounded-lg border border-obsidian/6 bg-surface-muted/60 px-2.5 py-2">
                    <div className="text-[10.5px] font-medium text-obsidian/40">{a.question}</div>
                    <div className="mt-0.5 text-[11.5px] leading-relaxed text-obsidian/65">{a.answer}</div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {basis.knowledge_sources?.length ? (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-obsidian/30">Fuentes de la biblioteca</div>
              <ul className="mt-1.5 space-y-1">
                {basis.knowledge_sources.map((s) => (
                  <li key={s.id} className="flex items-start gap-1.5 text-[11px] text-obsidian/50">
                    <BookOpen size={11} className="mt-0.5 shrink-0 text-obsidian/30" />
                    {s.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-2 rounded-lg border border-obsidian/6 bg-surface-muted/60 px-3 py-2 text-[11.5px] leading-relaxed text-obsidian/45">
          Este plan se generó antes de que registráramos el detalle del contexto. A partir de ahora cada plan guarda las
          respuestas, el perfil y las fuentes que lo respaldan.
        </p>
      )}
    </section>
  );
}

function FeedbackCard({ rating, comment, saved, saving, onSelect, onComment, onSave }) {
  return (
    <section className="app-card p-5 print-avoid-break">
      <div className="font-mono-meta text-obsidian/40">Tu opinión</div>
      <div className="mt-1 font-display text-[15px] font-semibold tracking-tight text-obsidian">
        ¿Te resultó útil este plan?
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onSelect("up")}
          disabled={saving}
          className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-colors disabled:opacity-50 ${
            rating === "up"
              ? "border-olive/25 bg-olive/8 text-olive"
              : "border-obsidian/10 bg-white text-obsidian/50 hover:border-obsidian/20 hover:text-obsidian"
          }`}
        >
          <ThumbsUp size={14} weight={rating === "up" ? "fill" : "regular"} />
          Sí, me sirve
        </button>
        <button
          type="button"
          onClick={() => onSelect("down")}
          disabled={saving}
          className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-colors disabled:opacity-50 ${
            rating === "down"
              ? "border-terracotta/25 bg-terracotta/8 text-terracotta"
              : "border-obsidian/10 bg-white text-obsidian/50 hover:border-obsidian/20 hover:text-obsidian"
          }`}
        >
          <ThumbsDown size={14} weight={rating === "down" ? "fill" : "regular"} />
          Aún no
        </button>
      </div>

      {rating ? (
        <div className="mt-3">
          <Textarea
            value={comment}
            onChange={(e) => onComment(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="¿Qué mejorarías? (opcional)"
            className="resize-none rounded-lg border-obsidian/10 bg-white text-[12px]"
          />
          <div className="mt-2 flex items-center justify-end">
            <Button
              onClick={onSave}
              disabled={saving}
              className="h-8 rounded-lg bg-obsidian px-3.5 text-[11.5px] text-alabaster hover:bg-obsidian/90"
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : null}

      {saved && !rating ? (
        <p className="mt-2 text-[11px] text-obsidian/35">Ya guardaste una valoración para este plan.</p>
      ) : null}
      {saved && rating ? (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-olive">
          <CheckCircle size={11} weight="fill" />
          Valoración guardada
        </p>
      ) : null}
    </section>
  );
}

function Block({ title, icon: Icon, children, testId }) {
  return (
    <section className="app-card p-5 print-avoid-break" data-testid={testId}>
      <div className="flex items-center gap-2">
        <Icon size={16} weight="duotone" className="text-terracotta" />
        <div className="font-mono-meta text-obsidian/40">{title}</div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MiniStat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-obsidian/6 bg-surface-muted/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-obsidian/40">
        <Icon size={11} className={tone} />
        {label}
      </div>
      <div className="stat-value mt-0.5 text-[16px] font-semibold text-obsidian">{value}</div>
    </div>
  );
}

function MiniFact({ value, label }) {
  return (
    <div className="rounded-lg border border-obsidian/6 bg-surface-muted/60 px-2 py-1.5 text-center">
      <div className="stat-value text-[15px] font-semibold text-obsidian">{value}</div>
      <div className="text-[9.5px] text-obsidian/35">{label}</div>
    </div>
  );
}
