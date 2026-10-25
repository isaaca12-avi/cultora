import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { diagnostic } from "@/lib/api";
import { DIAGNOSTIC } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CaretRight, Sparkle } from "@phosphor-icons/react";

export default function Diagnostic() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    try {
      const s = await diagnostic.get(sessionId);
      setSession(s);
    } catch (e) {
      toast.error("Sesión no encontrada");
      nav("/objetivos");
    }
  };

  useEffect(() => {
    load();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) {
    return <div className="text-obsidian/50 font-serif-display text-2xl">Cargando…</div>;
  }

  const total = session.questions.length;
  const idx = session.current_index;
  const done = session.status !== "in_progress";
  const q = done ? null : session.questions[idx];
  const progressPct = Math.round(((done ? total : idx) / total) * 100);

  const submitAnswer = async () => {
    if (!answer.trim()) {
      toast.error("Escribe tu respuesta");
      return;
    }
    setBusy(true);
    try {
      const updated = await diagnostic.answer(sessionId, answer.trim());
      setSession(updated);
      setAnswer("");
    } catch (e) {
      toast.error("No pudimos guardar la respuesta");
    } finally {
      setBusy(false);
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    toast.info("Generando tu plan personalizado. Puede tardar unos segundos.");
    try {
      const plan = await diagnostic.generate(sessionId);
      nav(`/plan/${plan.id}`);
    } catch (e) {
      toast.error("No pudimos generar el plan");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono-meta text-terracotta mb-2">diagnóstico</div>
          <div className="font-serif-display text-3xl md:text-4xl">{session.goal_title}</div>
        </div>
        <div className="text-right">
          <div className="font-mono-meta text-obsidian/50" data-testid={DIAGNOSTIC.progress}>
            {done ? total : idx} / {total}
          </div>
          <div className="font-mono-meta text-obsidian/30">preguntas</div>
        </div>
      </div>

      <Progress value={progressPct} className="h-1 bg-linen mb-12" />

      {!done ? (
        <div className="animate-fade-up">
          <div className="ribbon-question mb-8">
            <div className="font-mono-meta text-obsidian/40 mb-3">pregunta {idx + 1}</div>
            <h2
              data-testid={DIAGNOSTIC.questionText}
              className="font-serif-display text-3xl md:text-4xl leading-tight text-obsidian"
            >
              {q.text}
            </h2>
            {q.hint ? <div className="text-obsidian/60 text-sm mt-4 italic">{q.hint}</div> : null}
          </div>

          <Textarea
            data-testid={DIAGNOSTIC.answerInput}
            rows={5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Responde con tus palabras. Cuanto más específica sea la respuesta, más útil el plan."
            className="bg-white border-obsidian/15 resize-none text-base"
          />
          <div className="mt-6 flex items-center gap-4">
            <Button
              onClick={submitAnswer}
              disabled={busy}
              data-testid={DIAGNOSTIC.submitAnswer}
              className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-8 lift"
            >
              {busy ? "Guardando…" : "Siguiente"}
              <CaretRight size={16} className="ml-2" />
            </Button>
            <div className="font-mono-meta text-obsidian/40">respuesta libre — sin límite</div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-up">
          <div className="grid-frame p-10 text-center">
            <Sparkle size={30} weight="duotone" className="text-terracotta mx-auto mb-4" />
            <h2 className="font-serif-display text-4xl md:text-5xl mb-3">Diagnóstico listo.</h2>
            <p className="text-obsidian/70 max-w-xl mx-auto mb-8">
              Tenemos toda la información que necesitamos. Ahora Cultora combina el motor de decisión con IA para armar tu plan de acción.
            </p>
            <Button
              onClick={generatePlan}
              disabled={generating}
              data-testid={DIAGNOSTIC.generatePlan}
              className="rounded-full bg-terracotta text-alabaster hover:bg-terracotta/90 h-12 px-10 lift"
            >
              {generating ? "Generando tu plan…" : "Generar mi plan de acción"}
            </Button>
          </div>
        </div>
      )}

      {/* Answered summary */}
      {session.answers.length > 0 ? (
        <div className="mt-16">
          <div className="font-mono-meta text-obsidian/50 mb-4">respuestas capturadas</div>
          <ul className="divide-y divide-obsidian/10 grid-frame">
            {session.answers.map((a, i) => (
              <li key={i} className="p-6">
                <div className="font-mono-meta text-obsidian/40 mb-2">P{i + 1}</div>
                <div className="font-medium text-obsidian/80 mb-1">{a.question}</div>
                <div className="text-obsidian/70 text-sm whitespace-pre-line">{a.answer}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
