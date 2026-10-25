import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { convocatorias as convApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowSquareOut,
  CalendarBlank,
  MapPin,
  Buildings,
  CurrencyCircleDollar,
  Clock,
  Globe,
  UsersThree,
  CheckCircle,
  Warning,
  BookmarkSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const STATUS_TONE = {
  Abierta: "bg-olive/12 text-olive border-olive/30",
  Próxima: "bg-terracotta/10 text-terracotta border-terracotta/30",
  Permanente: "bg-obsidian/8 text-obsidian border-obsidian/20",
  Cerrada: "bg-obsidian/5 text-obsidian/45 border-obsidian/10",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}
function fmtAmount(min, max, moneda) {
  if (!min && !max) return "Sin monto específico";
  const f = (n) => new Intl.NumberFormat("es").format(n);
  if (min === max || !min) return `${f(max)} ${moneda || ""}`.trim();
  if (!max) return `desde ${f(min)} ${moneda || ""}`.trim();
  return `${f(min)}–${f(max)} ${moneda || ""}`.trim();
}

export default function ConvocatoriaDetail() {
  const { convId } = useParams();
  const [c, setC] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setNotFound(false);
    convApi.get(convId)
      .then((data) => {
        if (!alive) return;
        if (!data || typeof data !== "object") {
          setNotFound(true);
          return;
        }
        const arr = (v) => (Array.isArray(v) ? v : []);
        setC({
          ...data,
          types: arr(data.types),
          proponents: arr(data.proponents),
          requirements: arr(data.requirements),
          benefits: arr(data.benefits),
          documents: arr(data.documents),
          fundable: arr(data.fundable),
          restrictions: arr(data.restrictions),
          areas: arr(data.areas),
        });
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => { alive = false; };
  }, [convId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg border border-obsidian/10 bg-white p-12 text-center rounded-md">
        <div className="font-serif-display text-3xl italic text-terracotta mb-3">Convocatoria no encontrada</div>
        <p className="text-obsidian/60 mb-6">Puede que se haya cerrado o eliminado.</p>
        <Link to="/convocatorias" className="text-sm font-medium text-obsidian underline underline-offset-4 hover:text-terracotta">
          Volver al directorio
        </Link>
      </div>
    );
  }

  if (!c) return <div className="font-serif-display text-2xl text-obsidian/50">Cargando…</div>;

  const tone = STATUS_TONE[c.status];

  return (
    <div className="max-w-5xl">
      <Link to="/convocatorias" className="inline-flex items-center gap-2 text-sm text-obsidian/50 hover:text-terracotta mb-8 group">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
        Volver al directorio
      </Link>

      {/* Header */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2.5 h-7 rounded-full border ${tone}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {c.status}
          </span>
          {c.types.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
        <div className="font-mono-meta text-terracotta mb-4">convocatoria</div>
        <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight mb-6">{c.title}</h1>
        <p className="text-lg text-obsidian/70 leading-relaxed max-w-3xl mb-8">{c.summary}</p>

        <div className="flex flex-wrap gap-3">
          {c.official_url ? (
            <a href={c.official_url} target="_blank" rel="noreferrer">
              <Button className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11 px-6 lift">
                <ArrowSquareOut size={15} className="mr-2" />
                Ir al enlace oficial
              </Button>
            </a>
          ) : null}
          <Button
            variant="outline"
            onClick={() => toast.info("Función de guardado disponible próximamente.")}
            className="rounded-full border-obsidian/15 bg-transparent hover:bg-linen h-11 px-6 lift"
          >
            <BookmarkSimple size={15} className="mr-2" />
            Guardar
          </Button>
        </div>
      </header>

      {/* Key facts grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-obsidian/10 border border-obsidian/10 mb-12">
        <KeyFact icon={Buildings} label="Entidad">{c.entity}</KeyFact>
        <KeyFact icon={MapPin} label="País · Cobertura">{c.country} · {c.coverage}</KeyFact>
        <KeyFact icon={CalendarBlank} label="Apertura">{fmtDate(c.open_date)}</KeyFact>
        <KeyFact icon={CalendarBlank} label="Cierre" accent>{fmtDate(c.close_date)}</KeyFact>
        <KeyFact icon={CurrencyCircleDollar} label="Monto">{fmtAmount(c.amount_min, c.amount_max, c.moneda)}</KeyFact>
        <KeyFact icon={Clock} label="Duración">{c.duration}</KeyFact>
        <KeyFact icon={Globe} label="Modalidad">{c.modalidad} · {c.language}</KeyFact>
        <KeyFact icon={UsersThree} label="Proponentes">{c.proponents.slice(0, 2).join(", ")}{c.proponents.length > 2 ? "…" : ""}</KeyFact>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-16">
        <div className="lg:col-span-2 space-y-10">
          <Section title="Requisitos">
            <ul className="space-y-2.5">
              {c.requirements.map((r, i) => (
                <li key={i} className="flex gap-3 text-obsidian/85">
                  <CheckCircle size={16} weight="duotone" className="text-olive shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Elegibilidad">
            <p className="text-obsidian/85 leading-relaxed">{c.eligibility}</p>
          </Section>

          <Section title="Beneficios">
            <ul className="space-y-2.5">
              {c.benefits.map((b, i) => (
                <li key={i} className="flex gap-3 text-obsidian/85">
                  <span className="font-serif-display text-lg text-terracotta w-6">0{i + 1}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Documentación requerida">
            <div className="flex flex-wrap gap-2">
              {c.documents.map((d) => (
                <span key={d} className="chip">{d}</span>
              ))}
            </div>
          </Section>

          <Section title="Proyectos financiables">
            <ul className="space-y-2 text-obsidian/85">
              {c.fundable.map((f, i) => (
                <li key={i} className="pl-4 border-l-2 border-terracotta/40">{f}</li>
              ))}
            </ul>
          </Section>

          {c.restrictions?.length ? (
            <Section title="Restricciones" accent>
              <ul className="space-y-2.5">
                {c.restrictions.map((r, i) => (
                  <li key={i} className="flex gap-3 text-obsidian/85">
                    <Warning size={16} weight="duotone" className="text-terracotta shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        {/* Right rail */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="border border-obsidian/10 bg-white p-6">
            <div className="font-mono-meta text-obsidian/50 mb-3">áreas temáticas</div>
            <div className="flex flex-wrap gap-1.5">
              {c.areas.map((a) => (
                <span key={a} className="chip">{a}</span>
              ))}
            </div>
          </div>

          <div className="border border-obsidian/10 bg-white p-6">
            <div className="font-mono-meta text-obsidian/50 mb-3">tipos de proponente</div>
            <ul className="space-y-1.5 text-sm text-obsidian/80">
              {c.proponents.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </div>

          {c.official_url ? (
            <a href={c.official_url} target="_blank" rel="noreferrer" className="block border border-obsidian/10 bg-white p-6 hover:border-obsidian/30 lift">
              <div className="font-mono-meta text-obsidian/50 mb-2">enlace oficial</div>
              <div className="font-medium text-obsidian truncate">{c.official_url.replace(/^https?:\/\//, "")}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm text-terracotta font-medium">
                Abrir sitio <ArrowSquareOut size={13} />
              </div>
            </a>
          ) : null}

          <div className="text-xs text-obsidian/40">
            Última actualización: {fmtDate(c.updated_at)}
          </div>
        </aside>
      </div>
    </div>
  );
}

function KeyFact({ icon: Icon, label, children, accent }) {
  return (
    <div className={`bg-white p-5 md:p-6 ${accent ? "bg-terracotta/5" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className={accent ? "text-terracotta" : "text-obsidian/40"} />
        <div className={`font-mono-meta ${accent ? "text-terracotta" : "text-obsidian/50"}`}>{label}</div>
      </div>
      <div className="font-medium text-obsidian text-sm leading-snug">{children}</div>
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <section>
      <div className={`font-mono-meta mb-4 ${accent ? "text-terracotta" : "text-obsidian/60"}`}>{title}</div>
      {children}
    </section>
  );
}
