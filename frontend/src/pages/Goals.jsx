import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { goals as goalsApi, diagnostic } from "@/lib/api";
import { GOALS } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import * as PhIcons from "@phosphor-icons/react";
import { toast } from "sonner";

export default function GoalsPage() {
  const nav = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setError(false);
    goalsApi.catalog()
      .then((r) => setCatalog(Array.isArray(r) ? r : []))
      .catch(() => setError(true));
  }, [reload]);

  const start = async () => {
    if (!selected) {
      toast.error("Elige un objetivo primero");
      return;
    }
    setBusy(true);
    try {
      const s = await diagnostic.start(selected.key, text);
      nav(`/diagnostico/${s.id}`);
    } catch (e) {
      toast.error("No pudimos iniciar el diagnóstico");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="font-mono-meta text-terracotta mb-4">nuevo objetivo</div>
      <h1 className="font-serif-display text-5xl md:text-6xl leading-tight mb-3">
        ¿Qué quieres <span className="italic text-terracotta">lograr</span>?
      </h1>
      <p className="text-obsidian/70 max-w-2xl leading-relaxed mb-10">
        Elige el objetivo que más te apremia. En 5 minutos tendrás un diagnóstico y un plan concreto.
      </p>

      {error ? (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border border-obsidian/10 bg-white p-6 rounded-md">
          <div>
            <div className="font-medium text-obsidian">No pudimos cargar los objetivos</div>
            <div className="text-sm text-obsidian/60">Revisa tu conexión e inténtalo de nuevo.</div>
          </div>
          <Button variant="outline" onClick={() => setReload((n) => n + 1)} className="rounded-full border-obsidian/20 bg-transparent hover:bg-linen h-10 px-6">
            Reintentar
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-obsidian/10 border border-obsidian/10 mb-12">
        {catalog.map((g) => {
          const Icon = PhIcons[g.icon] || PhIcons.Star;
          const active = selected?.key === g.key;
          return (
            <button
              key={g.key}
              data-testid={GOALS.card(g.key)}
              onClick={() => setSelected(g)}
              className={`text-left bg-white p-8 lift transition-transform ${
                active ? "outline outline-2 outline-terracotta -outline-offset-2 bg-linen/40" : "hover:bg-linen/30"
              }`}
            >
              <Icon size={30} weight="duotone" className="text-terracotta mb-4" />
              <div className="font-serif-display text-2xl mb-2">{g.title}</div>
              <div className="text-sm text-obsidian/60 leading-relaxed">{g.description}</div>
              <div className="mt-6 font-mono-meta text-obsidian/40">
                {active ? "seleccionado" : "elegir"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="max-w-3xl">
        <div className="font-mono-meta text-obsidian/50 mb-3">describe tu situación (opcional)</div>
        <Textarea
          data-testid={GOALS.textInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="bg-white border-obsidian/15 resize-none text-base"
          placeholder={selected ? `Ej. Quiero ${selected.title.toLowerCase()} en los próximos 3 meses…` : "Cuéntame más sobre tu proyecto…"}
        />
        <div className="mt-6">
          <Button
            onClick={start}
            data-testid={GOALS.submit}
            disabled={busy || !selected}
            className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-10 lift"
          >
            {busy ? "Iniciando…" : "Empezar diagnóstico"}
          </Button>
        </div>
      </div>
    </div>
  );
}
