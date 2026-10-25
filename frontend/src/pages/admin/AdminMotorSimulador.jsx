import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminUI";
import { Play, Sparkle, BookOpen, CheckCircle, WarningCircle, Info } from "@phosphor-icons/react";
import { toast } from "sonner";

const GOALS = [
  { key: "vender_entradas", label: "Vender entradas" },
  { key: "financiamiento", label: "Financiamiento" },
  { key: "sostenibilidad", label: "Sostenibilidad" },
  { key: "publicos", label: "Públicos" },
  { key: "organizacion_interna", label: "Organización interna" },
  { key: "espacio_cultural", label: "Espacio cultural" },
];

export default function AdminMotorSimulador() {
  const [goalKey, setGoalKey] = useState("financiamiento");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [profile, setProfile] = useState({ agent_type: "colectivo", discipline: "Música", territory: "Argentina", stage: "emergente" });
  const [includeRag, setIncludeRag] = useState(true);
  const [runLlm, setRunLlm] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    adminApi.motor.questions(goalKey).then((r) => {
      setQuestions(r.questions || []);
      setAnswers({});
      setResult(null);
    }).catch(() => setQuestions([]));
  }, [goalKey]);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const r = await adminApi.motor.simulate({
        goal_key: goalKey,
        answers, profile,
        include_rag: includeRag, run_llm: runLlm, top_k: 5,
      });
      setResult(r);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error al simular");
    } finally { setRunning(false); }
  };

  return (
    <div data-testid="admin-motor-simulador">
      <AdminPageHeader
        eyebrow="Motor de decisión"
        title="Simulador"
        description="Prueba el motor con un diagnóstico ficticio. Observa qué reglas disparan, qué textos se recuperan y qué recomendaría la IA — sin generar un plan real."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        {/* Panel de entrada */}
        <div className="space-y-3">
          <AdminSection title="Configuración del caso">
            <div className="space-y-3">
              <F label="Objetivo">
                <select className="admin-select" value={goalKey} onChange={(e) => setGoalKey(e.target.value)} data-testid="sim-goal">
                  {GOALS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                </select>
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Tipo de agente"><input className="admin-input" value={profile.agent_type} onChange={(e) => setProfile({ ...profile, agent_type: e.target.value })} /></F>
                <F label="Disciplina"><input className="admin-input" value={profile.discipline} onChange={(e) => setProfile({ ...profile, discipline: e.target.value })} /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Territorio"><input className="admin-input" value={profile.territory} onChange={(e) => setProfile({ ...profile, territory: e.target.value })} /></F>
                <F label="Etapa"><input className="admin-input" value={profile.stage} onChange={(e) => setProfile({ ...profile, stage: e.target.value })} /></F>
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Respuestas del diagnóstico">
            <div className="space-y-3">
              {questions.map(q => (
                <F key={q.id} label={q.text}>
                  <textarea
                    className="admin-textarea" rows={2}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={q.hint || ""}
                    data-testid={`sim-answer-${q.id}`}
                  />
                </F>
              ))}
            </div>
          </AdminSection>

          <div className="admin-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 text-[12.5px] cursor-pointer" title="El motor buscará documentos relevantes en tu biblioteca y los usará como contexto para responder. Recomendado.">
                <input type="checkbox" checked={includeRag} onChange={(e) => setIncludeRag(e.target.checked)} className="accent-current" />
                <span>Consultar biblioteca</span>
                <Info size={11} style={{ color: "var(--a-text-muted)" }} />
              </label>
              <label className="flex items-center gap-1.5 text-[12.5px] cursor-pointer" title="Genera el plan con IA (GPT). Más lento pero más rico. Sin esto, solo se muestran las reglas disparadas.">
                <input type="checkbox" checked={runLlm} onChange={(e) => setRunLlm(e.target.checked)} className="accent-current" />
                <span>Correr LLM (más lento)</span>
                <Info size={11} style={{ color: "var(--a-text-muted)" }} />
              </label>
            </div>
            <button className="admin-btn admin-btn-accent" onClick={run} disabled={running} data-testid="sim-run">
              <Play size={12} weight="fill" /> {running ? "Simulando…" : "Simular diagnóstico"}
            </button>
          </div>
        </div>

        {/* Panel de resultado */}
        <div className="space-y-3">
          {!result && !running ? (
            <div className="admin-card p-10 text-center">
              <div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
                <Sparkle size={20} style={{ color: "var(--a-text-muted)" }} />
              </div>
              <div className="text-[14px] font-semibold" style={{ color: "var(--a-text)" }}>Listo para simular</div>
              <p className="text-[12.5px] admin-text-muted mt-1">Responde las preguntas y presiona <b>Simular</b> para ver el motor en acción.</p>
            </div>
          ) : null}

          {running ? (
            <div className="admin-card p-10 text-center">
              <div className="w-6 h-6 mx-auto mb-3 border-2 rounded-full animate-spin" style={{ borderColor: "var(--a-border-strong)", borderTopColor: "var(--a-accent)" }} />
              <div className="text-[13px] admin-text-muted">Ejecutando pipeline del motor…</div>
            </div>
          ) : null}

          {result ? (
            <>
              <AdminSection title="Reglas disparadas" description={`${result.rules_triggered?.length ?? 0} de ${result.rules_evaluated ?? 0} evaluadas`}>
                {result.rules_triggered?.length ? (
                  <ul className="space-y-2.5">
                    {result.rules_triggered.map((c, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle size={14} weight="fill" style={{ color: "var(--a-success)", marginTop: 2 }} />
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: "var(--a-text)" }}>{c.cause_title}</div>
                          <div className="text-[11.5px] admin-text-muted">{c.cause_detail}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-[12.5px] admin-text-muted">
                    <WarningCircle size={13} /> Ninguna regla coincidió. El motor caerá en la plantilla base.
                  </div>
                )}
              </AdminSection>

              {result.priorities?.length ? (
                <AdminSection title="Prioridades resultantes">
                  <ul className="list-disc list-inside space-y-1 text-[13px]" style={{ color: "var(--a-text)" }}>
                    {result.priorities.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </AdminSection>
              ) : null}

              <AdminSection
                title={`Documentos recuperados de la biblioteca (${result.rag_results?.length ?? 0})`}
                description="Fragmentos que el motor consultó para fundamentar la recomendación. Mayor score = más relevancia."
              >
                {result.rag_results?.length ? (
                  <ul className="space-y-2.5">
                    {result.rag_results.map((r) => (
                      <li key={r.id} className="admin-surface p-3 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen size={12} style={{ color: "var(--a-accent)" }} />
                          <div className="text-[12.5px] font-medium" style={{ color: "var(--a-text)" }}>{r.doc_title}</div>
                          <span className="admin-chip text-[10px] ml-auto">score {r.score}</span>
                        </div>
                        <div className="text-[11.5px] admin-text-muted line-clamp-3">{r.text}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[12.5px] admin-text-muted">Sin resultados relevantes en la biblioteca para este caso.</div>
                )}
              </AdminSection>

              {result.llm_plan ? (
                <AdminSection title="Plan generado por la IA" description="Salida del LLM combinando reglas + biblioteca">
                  {result.llm_plan.situacion_actual ? (
                    <div className="mb-3">
                      <div className="text-[10.5px] uppercase tracking-wider admin-text-faint mb-1">Situación actual</div>
                      <div className="text-[13px]" style={{ color: "var(--a-text)" }}>{result.llm_plan.situacion_actual}</div>
                    </div>
                  ) : null}
                  {result.llm_plan.lectura_estrategica ? (
                    <div className="mb-3">
                      <div className="text-[10.5px] uppercase tracking-wider admin-text-faint mb-1">Lectura estratégica</div>
                      <div className="text-[13px]" style={{ color: "var(--a-text)" }}>{result.llm_plan.lectura_estrategica}</div>
                    </div>
                  ) : null}
                  {Array.isArray(result.llm_plan.recomendaciones) ? (
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wider admin-text-faint mb-1">Recomendaciones</div>
                      <ul className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--a-text)" }}>
                        {result.llm_plan.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {result.llm_plan.raw ? (
                    <pre className="text-[11px] whitespace-pre-wrap admin-text-muted">{result.llm_plan.raw}</pre>
                  ) : null}
                </AdminSection>
              ) : null}

              <details className="admin-card p-4 text-[11.5px]">
                <summary className="cursor-pointer admin-text-muted">Ver prompt completo (debug)</summary>
                <pre className="mt-3 whitespace-pre-wrap admin-text-faint text-[11px]">{result.prompt_preview}</pre>
              </details>
            </>
          ) : null}
        </div>
      </div>
    </div>
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
