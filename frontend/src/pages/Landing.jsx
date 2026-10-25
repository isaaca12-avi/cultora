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
  CheckCircle,
  ChartLineUp,
  Compass,
  BookOpen,
  ArrowUpRight,
} from "@phosphor-icons/react";

const GOAL_PREVIEW = [
  { key: "vender_entradas", title: "Vender más entradas", icon: Ticket },
  { key: "financiamiento", title: "Conseguir financiamiento", icon: Coins },
  { key: "sostenibilidad", title: "Sostenibilidad del proyecto", icon: Plant },
  { key: "publicos", title: "Ampliar tus públicos", icon: UsersThree },
  { key: "organizacion_interna", title: "Fortalecer la organización", icon: TreeStructure },
  { key: "espacio_cultural", title: "Abrir un espacio cultural", icon: Storefront },
];

const STEPS = [
  { n: "01", title: "Cuéntanos tu objetivo", text: "En tus palabras. Sin formularios interminables ni jerga de consultoría." },
  { n: "02", title: "Hacemos el diagnóstico", text: "Preguntas adaptadas a tu disciplina, etapa y territorio." },
  { n: "03", title: "Recibe tu plan", text: "Prioridades, tareas e indicadores con una razón clara detrás." },
  { n: "04", title: "Sigue el avance", text: "Marca tareas, guarda notas y ajusta cuando cambie tu contexto." },
];

const PILLARS = [
  { icon: BookOpen, title: "Método sectorial curado", text: "Reglas de decisión y una biblioteca validada por expertos. No es un chatbot genérico." },
  { icon: ChartLineUp, title: "De la conversación a la acción", text: "El resultado no es una respuesta: es un plan estructurado con tareas que se siguen." },
  { icon: UsersThree, title: "Un ecosistema, no una isla", text: "Directorio de agentes, foro entre pares y convocatorias recomendadas por IA." },
];

const ROADMAP_PREVIEW = [
  { phase: "Hoy", title: "Diagnóstico y plan", text: "Motor de decisión, planes accionables y seguimiento.", tone: "terracotta" },
  { phase: "Próximo", title: "Más control", text: "Valoraciones, export PDF, recuperación de cuenta y verificación." },
  { phase: "Después", title: "Ecosistema", text: "Postulaciones asistidas, recordatorios y cuentas institucionales." },
];

export default function Landing() {
  const { user } = useAuth();
  const initial = (user?.name || "?")[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-alabaster">
      <header className="sticky top-0 z-40 border-b border-obsidian/8 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-5 md:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-obsidian font-display text-lg font-extrabold text-alabaster">C</span>
            <span className="font-display text-[20px] font-bold tracking-tight text-obsidian">Cultora</span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            <Link to="/vision" className="rounded-lg px-3 py-2 text-[13px] font-medium text-obsidian/60 transition-colors hover:bg-surface-muted hover:text-obsidian">
              Visión
            </Link>
            <Link to="/convocatorias" data-testid="landing-convocatorias-link" className="rounded-lg px-3 py-2 text-[13px] font-medium text-obsidian/60 transition-colors hover:bg-surface-muted hover:text-obsidian">
              Convocatorias
            </Link>
            <Link to="/agentes" className="rounded-lg px-3 py-2 text-[13px] font-medium text-obsidian/60 transition-colors hover:bg-surface-muted hover:text-obsidian">
              Agentes
            </Link>
            <Link to="/foro" data-testid="landing-foro-link" className="rounded-lg px-3 py-2 text-[13px] font-medium text-obsidian/60 transition-colors hover:bg-surface-muted hover:text-obsidian">
              Foro
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/apoyar" data-testid="landing-donate-link" className="hidden px-3 py-2 text-[13px] font-medium text-terracotta transition-colors hover:text-terracotta/80 sm:inline">
              Donar
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" data-testid="landing-goto-panel" className="hidden sm:inline-flex">
                  <Button className="h-9 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
                    Ir a mi panel
                    <ArrowRight size={15} className="ml-1.5" />
                  </Button>
                </Link>
                <Link
                  to="/perfil"
                  data-testid="landing-my-profile-link"
                  className="inline-flex items-center gap-2 rounded-full border border-obsidian/10 bg-white py-1 pl-1 pr-3 transition-colors hover:border-obsidian/20"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-terracotta/10 font-display text-[11px] font-bold text-terracotta">
                    {initial}
                  </span>
                  <span className="max-w-[100px] truncate text-[12px] font-medium text-obsidian/70">Mi perfil</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" data-testid={NAV.login} className="px-3 py-2 text-[13px] font-medium text-obsidian/60 transition-colors hover:text-obsidian">
                  Ingresar
                </Link>
                <Link to="/registro" data-testid={NAV.register}>
                  <Button data-testid={LANDING.ctaStart} className="h-9 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
                    Empezar gratis
                    <ArrowRight size={15} className="ml-1.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-14 md:px-8 md:pt-20 lg:grid-cols-12 lg:gap-10 lg:pb-24">
          <div className="lg:col-span-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-obsidian/8 bg-white px-3 py-1.5 shadow-xs">
              <Sparkle size={13} weight="fill" className="text-terracotta" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-obsidian/55">
                Copiloto estratégico cultural
              </span>
            </div>
            <h1 className="font-display text-[42px] font-semibold leading-[1.03] tracking-[-0.045em] text-obsidian sm:text-[56px] xl:text-[64px]">
              Convierte lo que quieres lograr en un{" "}
              <span className="text-terracotta">plan que sí avanza</span>.
            </h1>
            <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-obsidian/60">
              Cultora traduce tus objetivos en un diagnóstico claro, prioridades y un plan de acción con tareas e indicadores.
              Sin humo, sin diagnósticos genéricos.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {user ? (
                <>
                  <Link to="/objetivos">
                    <Button data-testid="landing-hero-cta" className="h-11 rounded-lg bg-terracotta px-6 text-[14px] font-medium text-alabaster hover:bg-terracotta/90">
                      Nuevo diagnóstico
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button variant="outline" className="h-11 rounded-lg border-obsidian/12 bg-white px-6 text-[14px] font-medium text-obsidian hover:bg-surface-muted">
                      Ir a mi panel
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/registro">
                    <Button data-testid="landing-hero-cta" className="h-11 rounded-lg bg-terracotta px-6 text-[14px] font-medium text-alabaster hover:bg-terracotta/90">
                      Empezar mi diagnóstico
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button data-testid={LANDING.ctaLogin} variant="outline" className="h-11 rounded-lg border-obsidian/12 bg-white px-6 text-[14px] font-medium text-obsidian hover:bg-surface-muted">
                      Ya tengo cuenta
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-obsidian/45">
              {["Diagnóstico en minutos", "Plan accionable", "Seguimiento semanal"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle size={14} weight="fill" className="text-olive/70" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <ProductPreview />
          </div>
        </div>

        <div className="border-y border-obsidian/8 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-obsidian/8 px-2 md:grid-cols-4">
            {[
              { label: "Objetivos sectoriales", value: "6" },
              { label: "Disciplinas cubiertas", value: "9" },
              { label: "Pasos al primer plan", value: "3" },
              { label: "Online, sin costo inicial", value: "100%" },
            ].map((s) => (
              <div key={s.label} className="px-5 py-5 md:px-7">
                <div className="stat-value text-[22px] font-semibold text-obsidian">{s.value}</div>
                <div className="mt-0.5 text-[11.5px] text-obsidian/45">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Cómo funciona</div>
            <h2 className="font-display text-[32px] font-semibold leading-[1.08] tracking-tight text-obsidian sm:text-[40px]">
              De una idea difusa a la siguiente acción concreta.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="max-w-xl text-[14.5px] leading-relaxed text-obsidian/55 lg:ml-auto">
              El motor combina reglas de decisión para el sector cultural, una biblioteca curada y un modelo de lenguaje que
              redacta la narrativa. Tú solo respondes con tus palabras.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="app-card group p-6 transition-colors hover:border-obsidian/15">
              <div className="stat-value text-[13px] font-semibold text-terracotta">{s.n}</div>
              <div className="mt-5 h-px w-full bg-obsidian/8">
                <div className="h-px w-8 bg-terracotta transition-all duration-300 group-hover:w-14" />
              </div>
              <h3 className="mt-5 font-display text-[17px] font-semibold tracking-tight text-obsidian">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-obsidian/55">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-obsidian/8 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">
              <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Objetivos frecuentes</div>
              <h2 className="font-display text-[32px] font-semibold leading-[1.08] tracking-tight text-obsidian sm:text-[38px]">
                Empieza donde te duele.
              </h2>
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-obsidian/55">
                No necesitas tenerlo todo claro. Elige el objetivo más urgente y Cultora orquesta el resto.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
              {GOAL_PREVIEW.map((g) => {
                const Icon = g.icon;
                return (
                  <Link
                    key={g.key}
                    to="/registro"
                    data-testid={LANDING.goalCard(g.key)}
                    className="group flex items-center gap-4 rounded-xl border border-obsidian/8 bg-alabaster/60 p-4 transition-all hover:-translate-y-0.5 hover:border-terracotta/25 hover:bg-white hover:shadow-card"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-terracotta shadow-xs">
                      <Icon size={19} weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[14.5px] font-semibold tracking-tight text-obsidian">{g.title}</span>
                      <span className="mt-0.5 block text-[11.5px] text-obsidian/40">Explorar objetivo</span>
                    </span>
                    <ArrowUpRight size={15} className="text-obsidian/25 transition-colors group-hover:text-terracotta" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
        <div className="grid gap-4 lg:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="app-card p-7">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-terracotta/8 text-terracotta">
                  <Icon size={19} weight="duotone" />
                </span>
                <h3 className="mt-6 font-display text-[19px] font-semibold tracking-tight text-obsidian">{p.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-obsidian/55">{p.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <AgentesPreview />
      <ForoPreview />

      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-8 md:pb-24">
        <div className="app-card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-obsidian/8 p-7 md:p-9">
            <div>
              <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Hacia dónde va Cultora</div>
              <h2 className="font-display text-[28px] font-semibold tracking-tight text-obsidian sm:text-[34px]">
                Un motor que aprende con el sector.
              </h2>
            </div>
            <Link to="/vision" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-obsidian/60 transition-colors hover:text-terracotta">
              Ver visión y hoja de ruta
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid divide-y divide-obsidian/8 md:grid-cols-3 md:divide-x md:divide-y-0">
            {ROADMAP_PREVIEW.map((r, i) => (
              <div key={r.title} className="p-7 md:p-8">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-terracotta" : i === 1 ? "bg-olive" : "bg-obsidian/25"}`} />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-obsidian/35">{r.phase}</span>
                </div>
                <h3 className="mt-4 font-display text-[18px] font-semibold tracking-tight text-obsidian">{r.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-obsidian/50">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-obsidian px-7 py-12 text-alabaster md:px-12 md:py-16">
          <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-terracotta/25" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-olive/40" />
          <div className="relative z-10 grid gap-8 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <div className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-alabaster/40">Arranca hoy</div>
              <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-tight sm:text-[38px]">
                Tu proyecto merece consultoría estratégica.
                <br />
                <span className="text-alabaster/55">No un chatbot genérico.</span>
              </h2>
            </div>
            <div className="md:col-span-4 md:flex md:justify-end">
              <Link to={user ? "/objetivos" : "/registro"}>
                <Button className="h-11 rounded-lg bg-terracotta px-6 text-[14px] font-medium text-alabaster hover:bg-terracotta/90">
                  {user ? "Empezar un nuevo diagnóstico" : "Crear mi cuenta gratis"}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-obsidian/8 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-obsidian font-display text-[15px] font-extrabold text-alabaster">C</span>
              <span className="font-display text-[18px] font-bold tracking-tight text-obsidian">Cultora</span>
            </Link>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-obsidian/40">
              Gestión cultural profesional para quienes hacen cultura todos los días.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-obsidian/50">
            <Link to="/vision" className="transition-colors hover:text-obsidian">Visión</Link>
            <Link to="/convocatorias" className="transition-colors hover:text-obsidian">Convocatorias</Link>
            <Link to="/agentes" className="transition-colors hover:text-obsidian">Agentes</Link>
            <Link to="/foro" className="transition-colors hover:text-obsidian">Foro</Link>
            <Link to="/apoyar" data-testid="footer-donate-link" className="font-medium text-terracotta transition-colors hover:text-terracotta/80">
              Donar / apoyar
            </Link>
          </div>
          <div className="text-[11px] text-obsidian/35">© {new Date().getFullYear()} Cultora</div>
        </div>
      </footer>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-[560px]">
      <div className="app-card p-2.5 shadow-lift sm:p-3">
        <div className="rounded-xl bg-surface-muted p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-obsidian/35">Panel</div>
              <div className="mt-1 font-display text-[17px] font-semibold tracking-tight text-obsidian">Tu plan de esta semana</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-olive/15 bg-olive/8 px-2.5 py-1 text-[10px] font-semibold text-olive">
              <span className="h-1.5 w-1.5 rounded-full bg-olive" />
              En curso
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Avance", value: "42%", sub: "+8 pts" },
              { label: "Tareas", value: "6/14", sub: "3 esta semana" },
              { label: "Racha", value: "5 sem", sub: "seguimiento" },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-obsidian/8 bg-white p-3">
                <div className="text-[10px] font-medium text-obsidian/40">{m.label}</div>
                <div className="stat-value mt-1 text-[18px] font-semibold text-obsidian">{m.value}</div>
                <div className="mt-0.5 text-[9.5px] text-obsidian/35">{m.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-lg border border-obsidian/8 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-obsidian/15 bg-white">
                <CheckCircle size={14} weight="fill" className="text-terracotta" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip">Alta prioridad</span>
                  <span className="chip">7 días</span>
                </div>
                <div className="mt-2 text-[13px] font-medium leading-snug text-obsidian">
                  Definir el presupuesto de producción de la próxima obra
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-obsidian/45">
                  Por qué: sin un presupuesto base no puedes postular a fondos ni negociar con el espacio.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-obsidian/8 bg-white p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-obsidian/40">
                <Compass size={12} />
                Próximo hito
              </div>
              <div className="mt-1.5 text-[12px] font-medium text-obsidian">Cierre de postulación</div>
              <div className="mt-0.5 text-[10px] text-obsidian/35">Fondo Concursable · 12 nov</div>
            </div>
            <div className="rounded-lg border border-obsidian/8 bg-white p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-obsidian/40">
                <Sparkle size={12} />
                Recomendado
              </div>
              <div className="mt-1.5 text-[12px] font-medium text-obsidian">3 convocatorias</div>
              <div className="mt-0.5 text-[10px] text-obsidian/35">Según tu perfil y territorio</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 left-4 hidden items-center gap-2 rounded-xl border border-obsidian/8 bg-white px-3 py-2 shadow-card sm:flex">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-olive/10 text-olive">
          <ChartLineUp size={14} weight="bold" />
        </span>
        <div>
          <div className="text-[10px] font-medium text-obsidian/40">Método Cultora</div>
          <div className="text-[11px] font-semibold text-obsidian">Reglas + curaduría experta</div>
        </div>
      </div>
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
    <section className="border-y border-obsidian/8 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Directorio profesional</div>
            <h2 className="font-display text-[32px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[40px]">
              Agentes culturales
            </h2>
            <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-obsidian/55">
              Un directorio curado de artistas, gestores, productores, técnicos y organizaciones iberoamericanas.
            </p>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link to="/agentes" data-testid="landing-agentes-cta">
              <Button className="h-10 rounded-lg bg-obsidian px-5 text-[13px] text-alabaster hover:bg-obsidian/90">
                Explorar directorio
                <ArrowRight size={15} className="ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {items.map((a) => (
              <Link
                key={a.id}
                to="/agentes"
                data-testid={`landing-agent-${a.id}`}
                className="group overflow-hidden rounded-xl border border-obsidian/8 bg-white transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="aspect-[4/3] overflow-hidden bg-linen">
                  <img
                    src={a.photo}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                  />
                </div>
                <div className="space-y-0.5 p-4">
                  <div className="font-display text-[14px] font-semibold tracking-tight text-obsidian">{a.name}</div>
                  <div className="text-[12px] text-obsidian/55">{a.role}</div>
                  <div className="truncate text-[11.5px] text-obsidian/40">{a.discipline} · {a.city}</div>
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
        return forumApi.list({}).then((r2) => setTopics((r2.items || []).slice(0, 4)));
      })
      .catch(() => {});
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
      <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Foro · hilos destacados</div>
          <h2 className="font-display text-[32px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[40px]">
            Conversaciones del sector.
          </h2>
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-obsidian/55">
            Experiencias, preguntas y buenas prácticas seleccionadas por el equipo.
          </p>
        </div>
        <div className="lg:col-span-4 lg:text-right">
          <Link to="/foro" data-testid="landing-foro-cta">
            <Button className="h-10 rounded-lg bg-obsidian px-5 text-[13px] text-alabaster hover:bg-obsidian/90">
              Entrar al foro
              <ArrowRight size={15} className="ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {topics.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {topics.map((t) => {
            const meta = KIND_META[t.kind] || KIND_META.pregunta;
            const Icon = meta.icon;
            return (
              <Link
                key={t.id}
                to={`/foro/tema/${t.id}`}
                data-testid={`landing-topic-${t.id}`}
                className="group relative block rounded-xl border border-obsidian/8 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-obsidian/15 hover:shadow-card"
              >
                {t.featured ? (
                  <span className="absolute right-5 top-5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-terracotta">
                    Destacado
                  </span>
                ) : null}
                <div className="mb-3 flex items-center gap-2">
                  <Icon size={13} weight="bold" className={meta.tone} />
                  <span className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${meta.tone}`}>{meta.label}</span>
                  <span className="text-[10px] text-obsidian/25">·</span>
                  <span className="text-[10.5px] text-obsidian/40">{t.category}</span>
                </div>
                <div className="pr-20 font-display text-[19px] font-semibold leading-snug tracking-tight text-obsidian transition-colors group-hover:text-terracotta">
                  {t.title}
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-obsidian/50">{t.body}</p>
                <div className="mt-5 flex items-center justify-between text-[11.5px] text-obsidian/40">
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
