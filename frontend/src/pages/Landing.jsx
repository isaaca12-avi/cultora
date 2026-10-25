import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LANDING, NAV } from "@/constants/testIds";
import { agents as agentsApi, forum as forumApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Ticket,
  Coins,
  Plant,
  UsersThree,
  TreeStructure,
  Storefront,
  ArrowRight,
  ChatCircleText,
  Question,
  Lightbulb,
  Sparkle,
} from "@phosphor-icons/react";

const GOAL_PREVIEW = [
  { key: "vender_entradas", title: "Vender más entradas", icon: Ticket },
  { key: "financiamiento", title: "Conseguir financiamiento", icon: Coins },
  { key: "sostenibilidad", title: "Sostenibilidad del proyecto", icon: Plant },
  { key: "publicos", title: "Ampliar tus públicos", icon: UsersThree },
  { key: "organizacion_interna", title: "Fortalecer la organización", icon: TreeStructure },
  { key: "espacio_cultural", title: "Abrir un espacio cultural", icon: Storefront },
];

export default function Landing() {
  const { user } = useAuth();
  const initial = (user?.name || "?")[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-alabaster relative z-10">
      {/* Header */}
      <header className="border-b border-obsidian/10 bg-alabaster">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Link to="/" className="block">
            <div className="font-mono-meta text-obsidian/50">plataforma</div>
            <div className="font-serif-display text-3xl italic text-terracotta leading-none">Cultora</div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/convocatorias" data-testid="landing-convocatorias-link" className="nav-link text-sm text-obsidian/70 hover:text-obsidian px-3 py-2 hidden md:inline">Convocatorias</Link>
            <Link to="/agentes" className="nav-link text-sm text-obsidian/70 hover:text-obsidian px-3 py-2 hidden md:inline">Agentes</Link>
            <Link to="/foro" data-testid="landing-foro-link" className="nav-link text-sm text-obsidian/70 hover:text-obsidian px-3 py-2 hidden md:inline">Foro</Link>
            <Link
              to="/apoyar"
              data-testid="landing-donate-link"
              className="nav-link text-sm text-terracotta hover:text-terracotta/80 px-3 py-2 hidden sm:inline font-medium"
            >
              Donar
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="nav-link text-sm text-obsidian/70 hover:text-obsidian px-3 py-2 hidden md:inline">Panel</Link>
                <Link
                  to="/perfil"
                  data-testid="landing-my-profile-link"
                  className="inline-flex items-center gap-2.5 pl-1.5 pr-4 h-10 rounded-full border border-obsidian/12 hover:border-obsidian/30 bg-white lift group"
                >
                  <span className="w-7 h-7 rounded-full bg-obsidian text-alabaster flex items-center justify-center font-mono text-xs">
                    {initial}
                  </span>
                  <span className="text-sm font-medium text-obsidian max-w-[120px] truncate">
                    Mi perfil
                  </span>
                </Link>
                <Link to="/dashboard" data-testid="landing-goto-panel">
                  <Button className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 px-6 h-11 lift">
                    Ir a mi panel
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" data-testid={NAV.login} className="nav-link text-sm text-obsidian/70 hover:text-obsidian px-3 py-2">Ingresar</Link>
                <Link to="/registro" data-testid={NAV.register}>
                  <Button data-testid={LANDING.ctaStart} className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 px-6 h-11 lift">
                    Empezar diagnóstico
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20 md:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <div className="font-mono-meta text-terracotta mb-6">gestión cultural / copiloto estratégico</div>
          <h1 className="font-serif-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-obsidian mb-8">
            ¿Qué quieres<br />
            <span className="italic text-terracotta">lograr</span> con tu proyecto?
          </h1>
          <p className="text-lg md:text-xl max-w-2xl text-obsidian/70 leading-relaxed mb-10">
            Cultora traduce tus objetivos en diagnósticos claros, prioridades y planes de acción. Sin metodologías rimbombantes. Sin diagnósticos genéricos. Solo lo que necesitas hacer, en el orden en que conviene hacerlo.
          </p>
          <div className="flex flex-wrap gap-4">
            {user ? (
              <>
                <Link to="/objetivos">
                  <Button
                    data-testid="landing-hero-cta"
                    className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 px-8 h-14 text-base lift"
                  >
                    Nuevo diagnóstico
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    className="rounded-full border-obsidian/20 hover:bg-linen px-8 h-14 text-base lift bg-transparent"
                  >
                    Ir a mi panel
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/registro">
                  <Button
                    data-testid="landing-hero-cta"
                    className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 px-8 h-14 text-base lift"
                  >
                    Empezar mi diagnóstico
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    data-testid={LANDING.ctaLogin}
                    variant="outline"
                    className="rounded-full border-obsidian/20 hover:bg-linen px-8 h-14 text-base lift bg-transparent"
                  >
                    Ya tengo cuenta
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 hidden lg:block">
          <div className="relative border border-obsidian/10 bg-white p-8">
            <div className="font-mono-meta text-obsidian/50 mb-4">método</div>
            <ol className="space-y-4">
              {[
                "Cuentas qué quieres lograr en tus propias palabras.",
                "Diagnóstico conversacional adaptado a tu contexto.",
                "Motor de decisión especializado en gestión cultural.",
                "Plan accionable con prioridades, tareas e indicadores.",
              ].map((t, i) => (
                <li key={i} className="flex gap-4">
                  <span className="font-serif-display text-2xl text-terracotta w-8">0{i + 1}</span>
                  <span className="text-sm text-obsidian/80 leading-relaxed pt-1">{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="rule-divider" />
      </div>

      {/* Goals grid */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14">
          <div className="lg:col-span-4">
            <div className="font-mono-meta text-terracotta mb-4">objetivos frecuentes</div>
            <h2 className="font-serif-display text-4xl sm:text-5xl mb-4">Empieza donde te duele.</h2>
            <p className="text-obsidian/70 leading-relaxed">
              No hace falta tener todo claro. Elige el objetivo más urgente y Cultora orquesta el resto — diagnóstico, prioridades, tareas y seguimiento.
            </p>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-px bg-obsidian/10 border border-obsidian/10">
            {GOAL_PREVIEW.map((g) => {
              const Icon = g.icon;
              return (
                <Link
                  key={g.key}
                  to="/registro"
                  data-testid={LANDING.goalCard(g.key)}
                  className="bg-white p-8 lift hover:bg-linen/40 flex items-start gap-5"
                >
                  <Icon size={30} weight="duotone" className="text-terracotta shrink-0 mt-1" />
                  <div>
                    <div className="font-serif-display text-2xl mb-2">{g.title}</div>
                    <div className="font-mono-meta text-obsidian/40">explorar objetivo</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Agentes section (preview) */}
      <AgentesPreview />

      {/* Foro section (preview) */}
      <ForoPreview />

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 pb-28">
        <div className="bg-obsidian text-alabaster p-10 md:p-16 grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-8">
            <div className="font-mono-meta text-alabaster/50 mb-4">arranca hoy</div>
            <h3 className="font-serif-display text-4xl md:text-5xl leading-tight">
              Tu proyecto merece consultoría estratégica.<br/>
              <span className="italic text-alabaster/80">No un chatbot genérico.</span>
            </h3>
          </div>
          <div className="md:col-span-4 md:text-right">
            <Link to={user ? "/objetivos" : "/registro"}>
              <Button className="rounded-full bg-terracotta text-alabaster hover:bg-terracotta/90 px-8 h-14 lift">
                {user ? "Empezar un nuevo diagnóstico" : "Crear mi cuenta gratis"}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-obsidian/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono-meta text-obsidian/50">© Cultora — copiloto de gestión cultural</div>
          <div className="flex items-center gap-6">
            <Link to="/apoyar" data-testid="footer-donate-link" className="font-mono-meta text-terracotta hover:text-terracotta/80 nav-link">
              Donar / apoyar
            </Link>
            <div className="font-mono-meta text-obsidian/50">hecho para artistas, colectivos y espacios</div>
          </div>
        </div>
      </footer>
    </div>
  );
}


function AgentesPreview() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    agentsApi
      .list({})
      .then((r) => setItems((r.items || []).filter((a) => a.photo).slice(0, 4)))
      .catch(() => {});
  }, []);

  return (
    <section className="bg-linen/40 border-y border-obsidian/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
          <div className="lg:col-span-8">
            <div className="font-mono-meta text-terracotta mb-4">directorio profesional</div>
            <h2 className="font-serif-display text-5xl md:text-6xl lg:text-7xl italic text-terracotta leading-none">
              Agentes culturales
            </h2>
            <p className="text-obsidian/70 leading-relaxed mt-6 max-w-2xl">
              Un directorio curado de artistas, gestores, productores, técnicos y organizaciones iberoamericanas. Encuentra a quien necesitas para tu próximo proyecto.
            </p>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link to="/agentes" data-testid="landing-agentes-cta">
              <Button className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-6 lift">
                Explorar directorio
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((a) => (
              <Link
                key={a.id}
                to="/agentes"
                data-testid={`landing-agent-${a.id}`}
                className="block bg-white border border-obsidian/8 hover:border-obsidian/20 lift"
              >
                <div className="aspect-[3/4] bg-linen overflow-hidden">
                  <img
                    src={a.photo}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                    style={{ filter: "grayscale(100%) contrast(1.02)" }}
                  />
                </div>
                <div className="p-5 space-y-1">
                  <div className="font-sans font-bold text-lg leading-snug">{a.name}</div>
                  <div className="text-sm text-obsidian/70">{a.role}</div>
                  <div className="text-sm text-obsidian/70">{a.discipline}</div>
                  <div className="text-sm text-obsidian/70">{a.city}</div>
                  <div className="text-sm text-obsidian/50 truncate">
                    {a.organization || (a.agent_type === "Persona" ? "Independiente" : a.agent_type)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

const KIND_META = {
  pregunta: { label: "Pregunta", icon: Question, tone: "text-terracotta" },
  experiencia: { label: "Experiencia", icon: Sparkle, tone: "text-olive" },
  buena_practica: { label: "Buena práctica", icon: Lightbulb, tone: "text-obsidian" },
};

function ForoPreview() {
  const [topics, setTopics] = useState([]);
  useEffect(() => {
    forumApi
      .list({ featured: true, limit: 4 })
      .then((r) => {
        if (r.items && r.items.length) return setTopics(r.items.slice(0, 4));
        // fallback to most recent
        return forumApi.list({}).then((r2) => setTopics((r2.items || []).slice(0, 4)));
      })
      .catch(() => {});
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
        <div className="lg:col-span-8">
          <div className="font-mono-meta text-terracotta mb-4">foro · hilos destacados</div>
          <h2 className="font-serif-display text-5xl md:text-6xl lg:text-7xl italic text-terracotta leading-none">
            Foro Cultora.
          </h2>
          <p className="text-obsidian/70 leading-relaxed mt-6 max-w-2xl">
            Conversaciones seleccionadas por el equipo — las experiencias, preguntas y buenas prácticas más valiosas del ecosistema para arrancar con contexto útil.
          </p>
        </div>
        <div className="lg:col-span-4 lg:text-right">
          <Link to="/foro" data-testid="landing-foro-cta">
            <Button className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-6 lift">
              Entrar al foro
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {topics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-obsidian/10 border border-obsidian/10">
          {topics.map((t) => {
            const meta = KIND_META[t.kind] || KIND_META.pregunta;
            const Icon = meta.icon;
            return (
              <Link
                key={t.id}
                to={`/foro/tema/${t.id}`}
                data-testid={`landing-topic-${t.id}`}
                className="bg-white p-8 lift hover:bg-linen/40 group block relative"
              >
                {t.featured ? (
                  <span className="absolute top-6 right-6 text-[10px] font-mono uppercase tracking-widest text-terracotta">
                    destacado
                  </span>
                ) : null}
                <div className="flex items-center gap-2 mb-4">
                  <Icon size={14} weight="bold" className={meta.tone} />
                  <span className={`font-mono-meta ${meta.tone}`}>{meta.label}</span>
                  <span className="font-mono-meta text-obsidian/30">·</span>
                  <span className="font-mono-meta text-obsidian/40">{t.category}</span>
                </div>
                <div className="font-serif-display text-2xl md:text-3xl leading-tight mb-3 group-hover:text-terracotta transition-colors pr-16">
                  {t.title}
                </div>
                <p className="text-sm text-obsidian/70 line-clamp-2 mb-5">{t.body}</p>
                <div className="flex items-center justify-between text-xs text-obsidian/50">
                  <span>{t.author_name}</span>
                  <span className="inline-flex items-center gap-1">
                    <ChatCircleText size={12} />
                    {t.replies_count} {t.replies_count === 1 ? "respuesta" : "respuestas"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

