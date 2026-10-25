import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Brain,
  Database,
  ShareNetwork,
  Buildings,
  Coins,
  UsersThree,
  Code,
  PaintBrush,
  Target,
  ChartLineUp,
  CheckCircle,
  Globe,
  Sparkle,
} from "@phosphor-icons/react";

const POTENTIAL = [
  {
    icon: Brain,
    title: "El motor como activo acumulativo",
    text: "Cada diagnóstico, plan, valoración y documento curado mejora el motor. Con el tiempo, Cultora acumula un mapa único de problemas y estrategias que funcionan, por disciplina y territorio.",
  },
  {
    icon: Database,
    title: "Datos para políticas públicas",
    text: "Con datos agregados y anonimizados, instituciones pueden ver brechas de financiamiento, disciplinas con dificultades para formar públicos y territorios desatendidos.",
  },
  {
    icon: ShareNetwork,
    title: "Red profesional del sector",
    text: "Directorio, foro y convocatorias forman un grafo de relaciones: quién colabora con quién y quién postula a qué. El lugar donde el sector se encuentra y trabaja.",
  },
  {
    icon: Buildings,
    title: "Infraestructura cultural",
    text: "De herramienta de consultoría a infraestructura de conocimiento e inteligencia del sector cultural independiente de habla hispana.",
  },
];

const ROADMAP = [
  {
    phase: "Ahora",
    tag: "P0 · consolidar",
    tone: "terracotta",
    title: "Una base sólida",
    items: [
      "Rol Contribuidor con flujo de aprobación",
      "Carga masiva a la biblioteca (ZIP / Drive)",
      "Recuperación de contraseña y verificación de email",
      "Valoración de planes y tareas",
    ],
  },
  {
    phase: "Siguiente",
    tag: "P1 · valor para la usuaria",
    tone: "olive",
    title: "Más control y acompañamiento",
    items: [
      "Exportar el plan a PDF con identidad Cultora",
      "Recordatorios y resumen semanal por email",
      "Streaming de la narrativa del plan",
      "Re-diagnóstico ligero y calendario del plan",
      "Asistente de postulación a convocatorias",
    ],
  },
  {
    phase: "Después",
    tag: "P2 · ecosistema",
    tone: "obsidian",
    title: "Comunidad y monetización",
    items: [
      "Donaciones y suscripción premium con Stripe",
      "Importación automática de convocatorias",
      "Mensajería entre agentes del directorio",
      "Gamificación ligera del progreso",
      "Asistente por WhatsApp y multi-idioma",
    ],
  },
  {
    phase: "Más adelante",
    tag: "P3 · institucional",
    tone: "soft",
    title: "Plataforma para cohortes",
    items: [
      "Cuentas institucionales con tableros agregados",
      "Benchmarks sectoriales anónimos",
      "Pruebas A/B del motor de decisión",
      "API pública para socios",
    ],
  },
];

const MODELS = [
  { icon: Sparkle, title: "Freemium", text: "Diagnóstico y plan básico gratis; premium con planes ilimitados, exportes, asistente de postulación y recordatorios." },
  { icon: Buildings, title: "Institucional (B2B/B2G)", text: "Licencias para fundaciones, ministerios, redes e incubadoras que acompañan a muchos agentes a la vez." },
  { icon: UsersThree, title: "Marketplace de expertos", text: "Conexión con consultores humanos verificados para sesiones pagadas; Cultora toma una comisión." },
  { icon: Coins, title: "Donaciones / mecenazgo", text: "Apoyo de la comunidad y de aliados culturales para sostener el acceso gratuito." },
];

const DEV_RECS = [
  "Conservar el dominio y el modelo de datos validados; reorganizar sin rehacer desde cero.",
  "Backend modular por dominio: routers, services y repositories.",
  "Frontend tipado, con React Query y un sistema de diseño propio.",
  "Abstraer el proveedor de LLM detrás de una interfaz e instrumentar costo y latencia.",
  "Cookies HttpOnly con refresh tokens, Redis para rate limiting y caché.",
  "Observabilidad con logs estructurados, trazas de embudo y alertas.",
  "CI con pruebas de backend, E2E y la suite de seguridad como contrato.",
  "Almacenamiento S3/R2 y base vectorial gestionada al crecer la biblioteca.",
];

const DESIGN_RECS = [
  { icon: PaintBrush, title: "Tokens antes que pantallas", text: "Formalizar el sistema de diseño actual en Figma: componentes, estados y escala tipográfica." },
  { icon: Target, title: "Tres momentos clave", text: "Priorizar el primer diagnóstico, la lectura del plan y el seguimiento semanal." },
  { icon: Globe, title: "Mobile-first de verdad", text: "El diagnóstico y el seguimiento se usan en contexto real; diseñar primero para el teléfono." },
  { icon: CheckCircle, title: "Explicabilidad visible", text: "Mostrar por qué se recomienda cada tarea y de qué fuente sale." },
  { icon: Code, title: "Dos lenguajes", text: "Mantener separado el lenguaje editorial público del lenguaje de herramienta del panel admin." },
];

const METRICS = [
  "% de diagnósticos completados",
  "Tiempo hasta el primer plan",
  "Planes con al menos una tarea hecha",
  "Retorno semanal al seguimiento",
  "Valoración media de los planes",
  "Postulaciones desde convocatorias",
];

export default function Vision() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-alabaster">
      <header className="sticky top-0 z-40 border-b border-obsidian/8 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-5 md:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-obsidian font-display text-lg font-extrabold text-alabaster">C</span>
            <span className="font-display text-[20px] font-bold tracking-tight text-obsidian">Cultora</span>
          </Link>
          <span className="hidden items-center gap-2 text-[12px] text-obsidian/35 sm:flex">
            <span className="h-3 w-px bg-obsidian/15" />
            Visión y hoja de ruta
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="px-3 py-2 text-[13px] font-medium text-obsidian/55 transition-colors hover:text-obsidian">
              Volver al inicio
            </Link>
            <Link to={user ? "/dashboard" : "/registro"}>
              <Button className="h-9 rounded-lg bg-obsidian px-4 text-[13px] text-alabaster hover:bg-obsidian/90">
                {user ? "Ir a mi panel" : "Empezar gratis"}
                <ArrowRight size={15} className="ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 md:px-8 md:pb-20 md:pt-24">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Visión · Documento vivo</span>
            </div>
            <h1 className="font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.045em] text-obsidian sm:text-[54px]">
              La infraestructura de conocimiento del sector cultural.
            </h1>
            <p className="mt-6 max-w-2xl text-[15.5px] leading-relaxed text-obsidian/60">
              Cultora nace para democratizar la gestión cultural profesional: que una música independiente en una ciudad
              intermedia tenga el mismo acceso a pensamiento estratégico que una compañía con un gestor a tiempo completo.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-obsidian/8 bg-obsidian/8 md:grid-cols-4">
            {[
              { label: "Misión", value: "Democratizar" },
              { label: "Corto plazo", value: "Consolidar" },
              { label: "Modelo", value: "Freemium + B2G" },
              { label: "Horizonte", value: "Infraestructura" },
            ].map((s) => (
              <div key={s.label} className="bg-white px-5 py-5 md:px-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-obsidian/35">{s.label}</div>
                <div className="mt-1.5 font-display text-[17px] font-semibold tracking-tight text-obsidian">{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-obsidian/8 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
            <div className="mb-12 grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Potencial a largo plazo</div>
                <h2 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[38px]">
                  Un motor que se vuelve más inteligente con cada proyecto.
                </h2>
              </div>
              <p className="max-w-xl text-[14px] leading-relaxed text-obsidian/50 lg:col-span-5 lg:ml-auto">
                El conocimiento estructurado del sector —qué problemas existen y qué estrategias funcionan— es difícil de replicar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {POTENTIAL.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="app-card p-7">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-terracotta/8 text-terracotta">
                      <Icon size={19} weight="duotone" />
                    </span>
                    <h3 className="mt-5 font-display text-[18px] font-semibold tracking-tight text-obsidian">{p.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-obsidian/55">{p.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="mb-12 max-w-2xl">
            <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Hoja de ruta</div>
            <h2 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[38px]">
              Lo que sigue, en orden de prioridad.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {ROADMAP.map((r) => (
              <div key={r.tag} className="app-card flex flex-col p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-obsidian/35">{r.phase}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      r.tone === "terracotta" ? "bg-terracotta" : r.tone === "olive" ? "bg-olive" : r.tone === "obsidian" ? "bg-obsidian/50" : "bg-obsidian/20"
                    }`}
                  />
                </div>
                <h3 className="mt-3 font-display text-[18px] font-semibold tracking-tight text-obsidian">{r.title}</h3>
                <div className="mt-1 text-[10.5px] font-medium text-obsidian/35">{r.tag}</div>
                <ul className="mt-5 space-y-2.5">
                  {r.items.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-obsidian/55">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-obsidian/20" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-obsidian/8 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
            <div className="mb-12 grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Sostenibilidad</div>
                <h2 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[38px]">
                  Modelos de negocio posibles.
                </h2>
              </div>
              <p className="max-w-xl text-[14px] leading-relaxed text-obsidian/50 lg:col-span-5 lg:ml-auto">
                El acceso básico se mantiene abierto. La sostenibilidad viene de quienes acompañan a muchos agentes a la vez.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {MODELS.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.title} className="rounded-xl border border-obsidian/8 bg-alabaster/50 p-6">
                    <Icon size={20} weight="duotone" className="text-terracotta" />
                    <h3 className="mt-5 font-display text-[15.5px] font-semibold tracking-tight text-obsidian">{m.title}</h3>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-obsidian/50">{m.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="mb-12 max-w-2xl">
            <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-terracotta">Cómo construimos la próxima versión</div>
            <h2 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-obsidian sm:text-[38px]">
              Menos deuda, más aprendizaje.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-obsidian/55">
              Las recomendaciones de producto, ingeniería y diseño que guían esta etapa.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="app-card p-7">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-obsidian/5 text-obsidian">
                  <Code size={17} weight="duotone" />
                </span>
                <h3 className="font-display text-[17px] font-semibold tracking-tight text-obsidian">Producto e ingeniería</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {DEV_RECS.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-obsidian/55">
                    <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-olive/60" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="app-card p-7">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-obsidian/5 text-obsidian">
                    <PaintBrush size={17} weight="duotone" />
                  </span>
                  <h3 className="font-display text-[17px] font-semibold tracking-tight text-obsidian">Diseño y experiencia</h3>
                </div>
                <div className="mt-5 space-y-4">
                  {DESIGN_RECS.map((d) => {
                    const Icon = d.icon;
                    return (
                      <div key={d.title} className="flex items-start gap-3">
                        <Icon size={15} weight="duotone" className="mt-0.5 shrink-0 text-terracotta" />
                        <div>
                          <div className="text-[13px] font-medium text-obsidian">{d.title}</div>
                          <div className="text-[12px] leading-relaxed text-obsidian/45">{d.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-obsidian/8 bg-obsidian p-7 text-alabaster">
                <div className="flex items-center gap-2.5">
                  <ChartLineUp size={18} weight="duotone" className="text-terracotta" />
                  <h3 className="font-display text-[16px] font-semibold tracking-tight">Métricas de éxito</h3>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {METRICS.map((m) => (
                    <div key={m} className="rounded-lg border border-alabaster/10 bg-alabaster/5 px-3 py-2 text-[11.5px] leading-snug text-alabaster/60">
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-obsidian px-7 py-12 text-alabaster md:px-12 md:py-16">
            <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-terracotta/25" />
            <div className="relative z-10 grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-8">
                <div className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-alabaster/40">Súmate</div>
                <h2 className="font-display text-[28px] font-semibold leading-[1.1] tracking-tight sm:text-[36px]">
                  Construyamos juntos la infraestructura cultural del futuro.
                </h2>
              </div>
              <div className="md:col-span-4 md:flex md:justify-end">
                <Link to={user ? "/objetivos" : "/registro"}>
                  <Button className="h-11 rounded-lg bg-terracotta px-6 text-[14px] font-medium text-alabaster hover:bg-terracotta/90">
                    {user ? "Empezar un diagnóstico" : "Crear mi cuenta gratis"}
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-obsidian/8 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-obsidian font-display text-[15px] font-extrabold text-alabaster">C</span>
            <span className="font-display text-[17px] font-bold tracking-tight text-obsidian">Cultora</span>
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-obsidian/50">
            <Link to="/convocatorias" className="transition-colors hover:text-obsidian">Convocatorias</Link>
            <Link to="/agentes" className="transition-colors hover:text-obsidian">Agentes</Link>
            <Link to="/foro" className="transition-colors hover:text-obsidian">Foro</Link>
            <Link to="/apoyar" className="font-medium text-terracotta transition-colors hover:text-terracotta/80">Donar / apoyar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
