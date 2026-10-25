import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { forum as forumApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, ChatCircleText, Question, Lightbulb, Sparkle, PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";

const KIND_META = {
  pregunta: { label: "Pregunta", icon: Question, tone: "bg-terracotta/10 text-terracotta border-terracotta/30" },
  experiencia: { label: "Experiencia", icon: Sparkle, tone: "bg-olive/10 text-olive border-olive/30" },
  buena_practica: { label: "Buena práctica", icon: Lightbulb, tone: "bg-obsidian/8 text-obsidian border-obsidian/20" },
};

export default function ForumTopic() {
  const { topicId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    try {
      const d = await forumApi.get(topicId);
      if (!d?.topic) throw new Error("empty");
      setData(d);
      setNotFound(false);
    } catch {
      setNotFound(true);
      toast.error("No pudimos cargar el tema");
    }
  };

  useEffect(() => {
    load();
  }, [topicId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg border border-obsidian/10 bg-white p-12 text-center rounded-md">
        <div className="font-serif-display text-3xl italic text-terracotta mb-3">Tema no encontrado</div>
        <p className="text-obsidian/60 mb-6">Puede que se haya eliminado o no tengas acceso.</p>
        <Link to="/foro" className="text-sm font-medium text-obsidian underline underline-offset-4 hover:text-terracotta">
          Volver al foro
        </Link>
      </div>
    );
  }

  if (!data) return <div className="font-serif-display text-2xl text-obsidian/50">Cargando…</div>;

  const { topic } = data;
  const replies = Array.isArray(data.replies) ? data.replies : [];
  const meta = KIND_META[topic.kind] || KIND_META.pregunta;
  const Icon = meta.icon;

  const submitReply = async (e) => {
    e.preventDefault();
    if (reply.trim().length < 2) return toast.error("Escribe tu respuesta");
    setBusy(true);
    try {
      await forumApi.reply(topicId, reply.trim());
      setReply("");
      await load();
    } catch {
      toast.error("No pudimos publicar tu respuesta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <Link to="/foro" className="inline-flex items-center gap-2 text-sm text-obsidian/50 hover:text-terracotta mb-8 group">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
        Volver al foro
      </Link>

      {/* Topic head */}
      <article className="mb-12">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 h-6 rounded-full border ${meta.tone}`}>
            <Icon size={11} weight="bold" />
            {meta.label}
          </span>
          <span className="font-mono-meta text-obsidian/40">{topic.category}</span>
        </div>
        <h1 data-testid="forum-topic-title" className="font-serif-display text-4xl md:text-5xl leading-tight mb-6">
          {topic.title}
        </h1>
        <AuthorLine name={topic.author_name} date={topic.created_at} />
        <div className="mt-8 text-lg text-obsidian/85 leading-relaxed whitespace-pre-wrap">{topic.body}</div>
        {topic.tags?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {topic.tags.map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
        ) : null}
      </article>

      {/* Replies */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <ChatCircleText size={18} className="text-obsidian/60" />
          <div className="font-mono-meta text-obsidian/50">
            {replies.length} {replies.length === 1 ? "respuesta" : "respuestas"}
          </div>
        </div>

        {replies.length === 0 ? (
          <div className="text-obsidian/50 italic mb-8">Aún no hay respuestas. Sé la primera persona en aportar.</div>
        ) : (
          <ul className="space-y-6">
            {replies.map((r) => (
              <li key={r.id} data-testid={`forum-reply-${r.id}`} className="pl-6 border-l-2 border-obsidian/10">
                <AuthorLine name={r.author_name} date={r.created_at} compact />
                <div className="mt-3 text-obsidian/85 leading-relaxed whitespace-pre-wrap">{r.body}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reply composer */}
      <section className="border-t border-obsidian/10 pt-8">
        {user ? (
          <form onSubmit={submitReply}>
            <div className="font-mono-meta text-obsidian/50 mb-3">tu respuesta como {user.name}</div>
            <Textarea
              data-testid="forum-reply-input"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={5}
              placeholder="Comparte tu experiencia, aporta un dato, o haz una repregunta."
              className="bg-white border-obsidian/15 resize-none text-base"
            />
            <div className="mt-4">
              <Button
                type="submit"
                disabled={busy}
                data-testid="forum-reply-submit"
                className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11 px-6 lift"
              >
                <PaperPlaneTilt size={15} className="mr-2" />
                {busy ? "Publicando…" : "Publicar respuesta"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-obsidian/60">
            <Link to="/login" className="text-terracotta hover:underline underline-offset-4 font-medium">Inicia sesión</Link> para participar en la conversación.
          </div>
        )}
      </section>
    </div>
  );
}

function AuthorLine({ name, date, compact }) {
  const initials = (name || "").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "w-8 h-8" : "w-10 h-10"} rounded-full bg-linen text-obsidian flex items-center justify-center font-mono text-xs`}>
        {initials}
      </div>
      <div>
        <div className={`font-medium ${compact ? "text-sm" : "text-base"} text-obsidian`}>{name}</div>
        <div className="font-mono-meta text-obsidian/40">
          {new Date(date).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}
