import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { knowledge } from "@/lib/api";
import { KNOWLEDGE } from "@/constants/testIds";
import { BookOpen } from "@phosphor-icons/react";

const CAT_LABELS = {
  marketing: "Marketing cultural",
  financiamiento: "Financiamiento",
  sostenibilidad: "Sostenibilidad",
  publicos: "Desarrollo de públicos",
  formulacion: "Formulación de proyectos",
  gestion: "Gestión y organización",
  presupuestos: "Presupuestos",
  indicadores: "Indicadores y evaluación",
  legal: "Aspectos legales",
  casos: "Casos y buenas prácticas",
};

export default function Knowledge() {
  const [docs, setDocs] = useState([]);
  const [cats, setCats] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    knowledge.categories()
      .then((r) => setCats(Array.isArray(r) ? r : []))
      .catch(() => setCats([]));
  }, []);

  useEffect(() => {
    knowledge.list(active || undefined)
      .then((r) => setDocs(Array.isArray(r) ? r : []))
      .catch(() => setDocs([]));
  }, [active]);

  return (
    <div data-testid={KNOWLEDGE.root}>
      <div className="font-mono-meta text-terracotta mb-4">biblioteca</div>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight mb-3">Conocimiento cultural aplicado.</h1>
      <p className="text-obsidian/70 max-w-2xl leading-relaxed mb-10">
        Guías, principios y casos que respaldan las recomendaciones. Todo curado para el sector cultural iberoamericano.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActive(null)}
          className={`chip ${active === null ? "bg-obsidian text-alabaster border-obsidian" : ""}`}
        >
          Todos
        </button>
        {cats.map((c) => (
          <button
            key={c.key}
            data-testid={KNOWLEDGE.category(c.key)}
            onClick={() => setActive(c.key)}
            className={`chip ${active === c.key ? "bg-obsidian text-alabaster border-obsidian" : ""}`}
          >
            {CAT_LABELS[c.key] || c.key} · {c.count}
          </button>
        ))}
      </div>

      <div className="grid-frame divide-y divide-obsidian/10">
        {docs.map((d) => (
          <Link
            key={d.id}
            to={`/conocimiento/${d.id}`}
            data-testid={KNOWLEDGE.doc(d.id)}
            className="block p-6 md:p-8 lift hover:bg-linen/40"
          >
            <div className="flex items-start gap-5">
              <BookOpen size={22} weight="duotone" className="text-terracotta shrink-0 mt-1" />
              <div className="flex-1">
                <div className="font-mono-meta text-obsidian/40 mb-2">{CAT_LABELS[d.category] || d.category}</div>
                <div className="font-serif-display text-2xl mb-2">{d.title}</div>
                <div className="text-obsidian/70 text-sm leading-relaxed">{d.summary}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
