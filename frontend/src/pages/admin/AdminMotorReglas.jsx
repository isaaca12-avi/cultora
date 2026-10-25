import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { AdminPageHeader, AdminSection, EmptyState } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { Plus, X, FloppyDisk, Trash, Robot, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

const EMPTY_RULE = {
  goal_key: "financiamiento",
  cause_title: "",
  cause_detail: "",
  when: {},
  priorities: [],
  active: true,
  order: 0,
};

export default function AdminMotorReglas() {
  const { has } = useAdmin();
  const [data, setData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState("financiamiento");
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setData(null);
    const r = await adminApi.motor.rules.list();
    setData(r.rules_by_goal || {});
    setGoals(r.goals || []);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeGoal) {
      adminApi.motor.questions(activeGoal).then((r) => setQuestions(r.questions || [])).catch(() => setQuestions([]));
    }
  }, [activeGoal]);

  const save = async (payload) => {
    try {
      if (editing.__new || editing.system) {
        // system rules → create as custom (backend migra automáticamente al primer create)
        const p = { ...payload };
        delete p.id; delete p.system;
        await adminApi.motor.rules.create(p);
        toast.success("Regla creada");
      } else {
        await adminApi.motor.rules.update(editing.id, payload);
        toast.success("Regla actualizada");
      }
      setEditing(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const remove = (r) => setConfirm({
    title: `Eliminar regla "${r.cause_title}"`,
    description: "La regla dejará de aplicarse en los diagnósticos.",
    variant: "danger",
    onConfirm: async () => {
      try { await adminApi.motor.rules.remove(r.id); toast.success("Eliminada"); setConfirm(null); load(); }
      catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
    },
  });

  const rules = data?.[activeGoal] || [];

  return (
    <div data-testid="admin-motor-reglas">
      <AdminPageHeader
        eyebrow="Motor de decisión"
        title="Reglas explícitas"
        description="Cada regla mapea patrones en las respuestas del diagnóstico a causas y prioridades. Deterministas y auditables."
        actions={has("engine.rules.edit") ? (
          <button className="admin-btn admin-btn-accent" onClick={() => setEditing({ ...EMPTY_RULE, goal_key: activeGoal, __new: true })} data-testid="admin-rule-new">
            <Plus size={13} weight="bold" /> Nueva regla
          </button>
        ) : null}
      />

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {goals.map(g => (
          <button
            key={g.key}
            onClick={() => setActiveGoal(g.key)}
            className={`admin-btn ${activeGoal === g.key ? "admin-btn-primary" : "admin-btn-ghost"}`}
            data-testid={`admin-rules-tab-${g.key}`}
          >
            {g.title}
            <span className="admin-text-faint ml-1.5 text-[11px]">
              {data?.[g.key]?.filter(r => r.active !== false).length ?? 0}
            </span>
          </button>
        ))}
      </div>

      {data === null ? (
        <div className="admin-card p-10 text-center admin-text-muted text-sm">Cargando…</div>
      ) : rules.length === 0 ? (
        <EmptyState icon={Robot} title="Sin reglas para este objetivo" description="Crea la primera regla o duplica una system." />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="admin-card p-5" data-testid={`admin-rule-${r.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <div className="text-[14px] font-semibold" style={{ color: "var(--a-text)" }}>{r.cause_title}</div>
                    {r.system ? <span className="admin-chip">System</span> : <span className="admin-chip admin-chip-accent">Custom</span>}
                    {r.active === false ? <span className="admin-chip admin-chip-danger">Inactiva</span> : null}
                  </div>
                  <div className="text-[12.5px] admin-text-muted leading-relaxed">{r.cause_detail || "—"}</div>

                  <div className="mt-3 text-[11.5px]">
                    <div className="admin-text-faint uppercase tracking-wider mb-1">Si las respuestas contienen:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(r.when || {}).map(([qid, kws]) => (
                        <div key={qid} className="admin-chip">
                          <code className="mr-1">{qid}</code>
                          → {(kws || []).join(", ")}
                        </div>
                      ))}
                      {Object.keys(r.when || {}).length === 0 ? <span className="admin-text-faint">—</span> : null}
                    </div>
                  </div>

                  {r.priorities?.length ? (
                    <div className="mt-3 text-[11.5px]">
                      <div className="admin-text-faint uppercase tracking-wider mb-1">Prioridades sugeridas:</div>
                      <ul className="list-disc list-inside space-y-0.5" style={{ color: "var(--a-text)" }}>
                        {r.priorities.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
                {has("engine.rules.edit") ? (
                  <div className="flex gap-1 shrink-0">
                    <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={() => setEditing(r)} aria-label="Editar">
                      <PencilSimple size={13} />
                    </button>
                    {!r.system ? (
                      <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={() => remove(r)} aria-label="Eliminar">
                        <Trash size={13} style={{ color: "var(--a-danger)" }} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <RuleEditor
        rule={editing}
        goals={goals}
        questions={questions}
        onGoalChange={(gk) => {
          setEditing((prev) => ({ ...prev, goal_key: gk }));
          adminApi.motor.questions(gk).then((r) => setQuestions(r.questions || [])).catch(() => {});
        }}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title} description={confirm?.description}
        onConfirm={confirm?.onConfirm} variant={confirm?.variant} />
    </div>
  );
}

function RuleEditor({ rule, goals, questions, onGoalChange, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_RULE);
  useEffect(() => { if (rule) setForm({ ...EMPTY_RULE, ...rule, when: rule.when || {}, priorities: rule.priorities || [] }); }, [rule]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setWhen = (qid, keywords) => set("when", { ...(form.when || {}), [qid]: keywords });
  const removeWhen = (qid) => {
    const w = { ...(form.when || {}) };
    delete w[qid];
    set("when", w);
  };

  const submit = () => {
    if (!form.cause_title.trim()) return toast.error("Título de causa requerido");
    const cleanWhen = {};
    for (const [k, v] of Object.entries(form.when || {})) {
      const arr = Array.isArray(v) ? v : v.split(",").map(s => s.trim()).filter(Boolean);
      if (arr.length) cleanWhen[k] = arr;
    }
    const p = { ...form, when: cleanWhen };
    ["__new", "id", "system", "created_at", "updated_at", "created_by"].forEach(k => delete p[k]);
    onSave(p);
  };

  return (
    <DetailDrawer
      open={!!rule}
      onClose={onClose}
      title={rule?.__new ? "Nueva regla" : `Editar regla`}
      subtitle={rule?.system ? "(Se guardará como custom)" : rule?.cause_title}
      description="Editor de regla"
      width="620px"
      actions={
        <button className="admin-btn admin-btn-accent" onClick={submit} data-testid="admin-rule-save">
          <FloppyDisk size={13} /> Guardar
        </button>
      }
    >
      <div className="p-6 space-y-4">
        <F label="Objetivo aplicable">
          <select className="admin-select" value={form.goal_key} onChange={(e) => { set("goal_key", e.target.value); onGoalChange(e.target.value); }}>
            {goals.map(g => <option key={g.key} value={g.key}>{g.title}</option>)}
          </select>
        </F>
        <F label="Título de la causa">
          <input className="admin-input" value={form.cause_title} onChange={(e) => set("cause_title", e.target.value)} />
        </F>
        <F label="Descripción de la causa">
          <textarea className="admin-textarea" rows={3} value={form.cause_detail} onChange={(e) => set("cause_detail", e.target.value)} />
        </F>

        <div className="pt-2">
          <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-2">
            Condición: si las respuestas contienen alguna de estas palabras clave
          </div>
          <div className="space-y-2">
            {questions.map(q => {
              const kws = form.when?.[q.id];
              const on = kws !== undefined;
              return (
                <div key={q.id} className="admin-surface p-3 rounded-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium truncate" style={{ color: "var(--a-text)" }}>{q.text}</div>
                      <code className="text-[10.5px] admin-text-faint">{q.id}</code>
                    </div>
                    <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                      <input type="checkbox" checked={on} onChange={(e) => {
                        if (e.target.checked) setWhen(q.id, []);
                        else removeWhen(q.id);
                      }} className="accent-current" />
                      <span className="text-[11px] admin-text-muted">Aplica</span>
                    </label>
                  </div>
                  {on ? (
                    <input
                      className="admin-input mt-2"
                      placeholder="palabras clave separadas por coma"
                      value={Array.isArray(kws) ? kws.join(", ") : (kws || "")}
                      onChange={(e) => setWhen(q.id, e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <F label="Prioridades sugeridas (una por línea)">
          <textarea className="admin-textarea" rows={4}
            value={(form.priorities || []).join("\n")}
            onChange={(e) => set("priorities", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} />
        </F>

        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={form.active !== false} onChange={(e) => set("active", e.target.checked)} className="accent-current" />
          <span style={{ color: "var(--a-text)" }}>Regla activa</span>
        </label>
      </div>
    </DetailDrawer>
  );
}

function F({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.1em] admin-text-faint font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
