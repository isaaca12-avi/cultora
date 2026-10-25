import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { knowledge } from "@/lib/api";
import { CaretLeft } from "@phosphor-icons/react";

export default function KnowledgeDoc() {
  const { docId } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    knowledge.get(docId).then(setDoc);
  }, [docId]);

  if (!doc) return <div className="font-serif-display text-2xl text-obsidian/50">Cargando…</div>;

  return (
    <div className="max-w-3xl">
      <Link to="/conocimiento" className="inline-flex items-center gap-2 text-sm text-obsidian/60 hover:text-terracotta mb-8">
        <CaretLeft size={16} />
        Volver a la biblioteca
      </Link>

      <div className="font-mono-meta text-terracotta mb-4">{doc.category}</div>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight mb-6">{doc.title}</h1>
      <p className="text-obsidian/70 leading-relaxed mb-10 italic">{doc.summary}</p>

      <div className="prose prose-lg max-w-none">
        <MarkdownLite content={doc.content} />
      </div>

      <div className="flex flex-wrap gap-2 mt-10">
        {(doc.tags || []).map((t) => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>
    </div>
  );
}

function MarkdownLite({ content }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        if (b.startsWith("**") && b.endsWith("**")) {
          return <h3 key={i} className="font-serif-display text-2xl mt-8">{b.slice(2, -2)}</h3>;
        }
        // Convert **bold** inside a paragraph
        const parts = b.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-obsidian/85 leading-relaxed whitespace-pre-line">
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**") ? (
                <strong key={j} className="font-semibold text-obsidian">{p.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{p}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}
