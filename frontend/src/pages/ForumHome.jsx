import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { forum as forumApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MagnifyingGlass,
  Plus,
  ChatCircleText,
  Question,
  Lightbulb,
  Sparkle,
  ArrowUpRight,
  Star,
  SortAscending,
} from "@phosphor-icons/react";

const KIND_META = {
  pregunta: { label: "Pregunta", icon: Question, tone: "bg-terracotta/10 text-terracotta border-terracotta/30" },
  experiencia: { label: "Experiencia", icon: Sparkle, tone: "bg-olive/10 text-olive border-olive/30" },
  buena_practica: { label: "Buena práctica", icon: Lightbulb, tone: "bg-obsidian/8 text-obsidian border-obsidian/20" },
};

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "hace instantes";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es");
}

export default function ForumHome() {
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    forumApi.meta().then(setMeta);
    forumApi.list({ featured: true, limit: 3 }).then((r) => setFeatured(r.items || [])).catch(() => {});
  }, []);

  const params = useMemo(() => {
    const p = { sort };
    if (category) p.category = category;
    if (kind) p.kind = kind;
    if (q) p.q = q;
    return p;
  }, [category, kind, q, sort]);

  useEffect(() => {
    forumApi.list(params).then((r) => setItems(r.items));
  }, [params]);

  const hasActiveFilters = Boolean(category) || Boolean(kind) || Boolean(q);

  return (
    <div data-testid="forum-root" className="-mx-6 md:-mx-12 -my-8 md:-my-12">
      <header className="px-6 md:px-12 pt-8 md:pt-10 pb-10 border-b border-obsidian/8">
        <div className="max-w-6xl">
          <div className="font-mono-meta text-terracotta mb-6">foro · aprendizaje entre pares</div>
          <h1 className="font-serif-display text-6xl md:text-7xl lg:text-8xl italic text-terracotta leading-none mb-8 tracking-tight">
            Foro Cultora.
          </h1>
          <p className="text-obsidian/70 max-w-2xl leading-relaxed text-lg mb-10">
            Un espacio para compartir experiencias, formular preguntas y documentar buenas prácticas en gestión cultural iberoamericana.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/foro/nuevo" data-testid="forum-new-topic">
              <Button className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11 px-6 lift">
                <Plus size={15} className="mr-2" />
                Nuevo tema
              </Button>
            </Link>
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian/40" />
              <Input
                data-testid="forum-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar en el foro..."
                className="h-11 pl-11 pr-4 bg-white border-obsidian/12 rounded-full text-sm"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar filters */}
        <aside className="lg:col-span-3 space-y-8">
          <div>
            <div className="font-mono-meta text-obsidian/50 mb-3">categorías</div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setCategory("")}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${!category ? "text-obsidian font-medium" : "text-obsidian/60 hover:text-obsidian"}`}
                >
                  Todas
                </button>
              </li>
              {(meta?.categories || []).map((c) => (
                <li key={c.key}>
                  <button
                    data-testid={`forum-cat-${c.key}`}
                    onClick={() => setCategory(c.key)}
                    className={`w-full flex justify-between items-center text-sm px-2 py-1.5 rounded transition-colors ${category === c.key ? "text-obsidian font-medium bg-linen/50" : "text-obsidian/60 hover:text-obsidian"}`}
                  >
                    <span>{c.label}</span>
                    <span className="font-mono text-[10px] text-obsidian/40">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-mono-meta text-obsidian/50 mb-3">tipo</div>
            <div className="flex flex-wrap gap-2">
              <KindPill active={!kind} onClick={() => setKind("")}>Todos</KindPill>
              {(meta?.kinds || []).map((k) => (
                <KindPill key={k.key} active={kind === k.key} onClick={() => setKind(k.key)}>{k.label}</KindPill>
              ))}
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="lg:col-span-9 space-y-10">
          {/* Featured strip — only when no filters applied */}
          {featured.length > 0 && !hasActiveFilters ? (
            <section data-testid="forum-featured-section">
              <div className="flex items-center gap-2 mb-4">
                <Star size={14} weight="fill" className="text-terracotta" />
                <div className="font-mono-meta text-terracotta">destacados por el equipo</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featured.slice(0, 3).map((t) => {
                  const meta = KIND_META[t.kind] || KIND_META.pregunta;
                  const Icon = meta.icon;
                  return (
                    <Link
                      key={t.id}
                      to={`/foro/tema/${t.id}`}
                      data-testid={`forum-featured-${t.id}`}
                      className="block bg-white border border-obsidian/10 hover:border-obsidian/30 p-6 lift group relative"
                    >
                      <span className="absolute top-4 right-4 text-terracotta">
                        <Star size={13} weight="fill" />
                      </span>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon size={12} weight="bold" className={meta.tone.split(" ")[1] || "text-obsidian"} />
                        <span className="font-mono-meta text-obsidian/50">{meta.label}</span>
                      </div>
                      <div className="font-serif-display text-xl leading-tight mb-2 group-hover:text-terracotta transition-colors pr-4">
                        {t.title}
                      </div>
                      <div className="text-xs text-obsidian/60 line-clamp-2 mb-3">{t.body}</div>
                      <div className="flex items-center justify-between text-xs text-obsidian/40">
                        <span className="truncate">{t.author_name}</span>
                        <span className="inline-flex items-center gap-1 shrink-0">
                          <ChatCircleText size={11} />
                          {t.replies_count}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Topics list */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono-meta text-obsidian/50">
                {items.length} {items.length === 1 ? "tema" : "temas"}
              </div>
              <div className="flex items-center gap-2">
                <SortAscending size={13} className="text-obsidian/40" />
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-9 border-0 bg-transparent px-2 text-sm text-obsidian/70 focus:ring-0 shadow-none w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="recent">Actividad reciente</SelectItem>
                    <SelectItem value="most_replied">Más respondidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {items.length === 0 ? (
              <div className="border border-obsidian/10 bg-white p-12 text-center">
                <div className="font-serif-display text-3xl italic text-terracotta mb-2">Aún sin temas</div>
                <p className="text-obsidian/60 mb-6">Sé la primera persona en abrir esta conversación.</p>
                <Link to="/foro/nuevo">
                  <Button className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11 px-6 lift">
                    Crear tema
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="border border-obsidian/10 divide-y divide-obsidian/8 bg-white">
                {items.map((t) => (
                  <TopicRow key={t.id} topic={t} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function KindPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-3 h-7 rounded-full border transition-colors ${
        active
          ? "bg-obsidian text-alabaster border-obsidian"
          : "bg-white border-obsidian/12 text-obsidian/70 hover:border-obsidian/40"
      }`}
    >
      {children}
    </button>
  );
}

function TopicRow({ topic }) {
  const meta = KIND_META[topic.kind] || KIND_META.pregunta;
  const Icon = meta.icon;
  const initials = topic.author_name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <Link to={`/foro/tema/${topic.id}`} data-testid={`forum-topic-${topic.id}`} className="block p-6 hover:bg-linen/30 lift group">
      <div className="flex items-start gap-5">
        <div className="w-11 h-11 rounded-full bg-linen text-obsidian flex items-center justify-center font-mono text-xs shrink-0 mt-1">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 h-6 rounded-full border ${meta.tone}`}>
              <Icon size={11} weight="bold" />
              {meta.label}
            </span>
            <span className="font-mono-meta text-obsidian/40">{topic.category}</span>
          </div>
          <div className="font-serif-display text-2xl leading-tight mb-2 group-hover:text-terracotta transition-colors">
            {topic.title}
          </div>
          <div className="text-sm text-obsidian/60 line-clamp-2 mb-3">{topic.body}</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-obsidian/50">
            <span>{topic.author_name}</span>
            <span className="text-obsidian/25">·</span>
            <span>{timeAgo(topic.updated_at || topic.created_at)}</span>
            <span className="text-obsidian/25">·</span>
            <span className="inline-flex items-center gap-1">
              <ChatCircleText size={12} />
              {topic.replies_count} {topic.replies_count === 1 ? "respuesta" : "respuestas"}
            </span>
          </div>
        </div>
        <ArrowUpRight size={16} weight="bold" className="text-obsidian/30 group-hover:text-terracotta transition-colors mt-2 shrink-0" />
      </div>
    </Link>
  );
}
