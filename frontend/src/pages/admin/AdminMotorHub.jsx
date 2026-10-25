import React from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminUI";
import { useAdmin } from "@/lib/admin-context";
import { BookOpen, Robot, TestTube, ArrowRight, Sparkle } from "@phosphor-icons/react";

const MODULES = [
  {
    to: "/admin/motor/biblioteca",
    icon: BookOpen,
    title: "Biblioteca",
    desc: "Nutre el motor con textos, guías, casos y reglamentos. Cuanto más rico el corpus, mejores las recomendaciones.",
    perm: "engine.kb.view",
    tag: "RAG",
  },
  {
    to: "/admin/motor/reglas",
    icon: Robot,
    title: "Reglas del motor",
    desc: "Edita las reglas explícitas si/entonces por objetivo. Garantiza recomendaciones deterministas y auditables.",
    perm: "engine.rules.view",
    tag: "Determinista",
  },
  {
    to: "/admin/motor/simulador",
    icon: TestTube,
    title: "Simulador",
    desc: "Prueba un diagnóstico y observa qué reglas disparan, qué textos se recuperan y qué recomienda la IA — antes de publicar cambios.",
    perm: "engine.simulate",
    tag: "Debug",
  },
];

export default function AdminMotorHub() {
  const { has } = useAdmin();
  const visible = MODULES.filter((m) => has(m.perm));
  return (
    <div data-testid="admin-motor-hub">
      <AdminPageHeader
        eyebrow="Motor de decisión"
        title="Cómo aprende Cultora"
        description="Tres capas trabajan juntas: biblioteca de textos (RAG), reglas explícitas y capa de IA. Gestionalas desde aquí sin tocar código."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {visible.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.to} to={m.to} className="admin-card p-5 group hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--a-surface-2)" }}>
                  <Icon size={20} style={{ color: "var(--a-accent)" }} />
                </div>
                <span className="admin-chip text-[10px]">{m.tag}</span>
              </div>
              <div className="text-[15.5px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
                {m.title}
              </div>
              <p className="text-[12.5px] admin-text-muted mt-1 leading-relaxed">{m.desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-[12px]" style={{ color: "var(--a-accent)" }}>
                Abrir <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <AdminSection title="Cómo funciona el motor" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold"
                style={{ background: "var(--a-accent)", color: "var(--a-accent-fg)" }}>1</div>
              <div className="font-semibold" style={{ color: "var(--a-text)" }}>Reglas explícitas</div>
            </div>
            <p className="admin-text-muted leading-relaxed">
              El sistema detecta causas conocidas del sector (falta de formalización, dependencia de una sola fuente…) según respuestas del diagnóstico.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold"
                style={{ background: "var(--a-accent)", color: "var(--a-accent-fg)" }}>2</div>
              <div className="font-semibold" style={{ color: "var(--a-text)" }}>Recuperación (RAG)</div>
            </div>
            <p className="admin-text-muted leading-relaxed">
              Se buscan los fragmentos más relevantes de la biblioteca para el contexto de este caso específico. Curas los textos, el motor los usa.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold"
                style={{ background: "var(--a-accent)", color: "var(--a-accent-fg)" }}>3</div>
              <div className="font-semibold" style={{ color: "var(--a-text)" }}>Redacción con IA</div>
            </div>
            <p className="admin-text-muted leading-relaxed">
              GPT-5.2 sintetiza el plan con narrativa, tareas e indicadores, citando la biblioteca cuando corresponde. La IA nunca inventa: usa lo que curas.
            </p>
          </div>
        </div>
      </AdminSection>
    </div>
  );
}
