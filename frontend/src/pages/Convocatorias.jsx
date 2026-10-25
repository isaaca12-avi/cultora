import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { convocatorias as convApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  MagnifyingGlass,
  FunnelSimple,
  X,
  ArrowUpRight,
  CalendarBlank,
  MapPin,
  Buildings,
  CurrencyCircleDollar,
  SortAscending,
  Sparkle,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const ANY = "__any__";

const STATUS_TONE = {
  Abierta: "bg-olive/12 text-olive border-olive/30",
  Próxima: "bg-terracotta/10 text-terracotta border-terracotta/30",
  Permanente: "bg-obsidian/8 text-obsidian border-obsidian/20",
  Cerrada: "bg-obsidian/5 text-obsidian/45 border-obsidian/10",
};

function useDebounced(v, ms = 250) {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return x;
}

function fmtAmount(min, max, moneda) {
  if (!min && !max) return "Sin monto";
  const f = (n) => new Intl.NumberFormat("es").format(n);
  if (min === max || !min) return `${f(max)} ${moneda || ""}`.trim();
  if (!max) return `desde ${f(min)} ${moneda || ""}`.trim();
  return `${f(min)}–${f(max)} ${moneda || ""}`.trim();
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export default function Convocatorias() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [opts, setOpts] = useState(null);
  const [filters, setFilters] = useState({});
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("close_date");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const debouncedQ = useDebounced(q, 250);

  useEffect(() => {
    convApi.filters().then(setOpts);
  }, []);

  useEffect(() => {
    if (!user) return;
    setRecsLoading(true);
    convApi.recommendations()
      .then((r) => setRecs(r))
      .catch(() => setRecs(null))
      .finally(() => setRecsLoading(false));
  }, [user]);

  const refreshRecs = async () => {
    setRecsLoading(true);
    try {
      const r = await convApi.recommendations(true);
      setRecs(r);
      toast.success("Recomendaciones actualizadas");
    } catch {
      toast.error("No pudimos actualizar las recomendaciones");
    } finally {
      setRecsLoading(false);
    }
  };

  const params = useMemo(() => {
    const p = { sort };
    if (debouncedQ) p.q = debouncedQ;
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") p[k] = v;
    });
    return p;
  }, [debouncedQ, filters, sort]);

  useEffect(() => {
    setLoading(true);
    convApi.list(params).then((r) => {
      setItems(r.items);
      setCount(r.count);
      setLoading(false);
    });
  }, [params]);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v === ANY ? undefined : v }));
  const clearAll = () => {
    setFilters({});
    setQ("");
  };

  const activeCount = Object.values(filters).filter((v) => v !== undefined && v !== null && v !== "").length;
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => ({ label: v, remove: () => setFilter(k, ANY) }));

  return (
    <div data-testid="convocatorias-root" className="-mx-6 md:-mx-12 -my-8 md:-my-12">
      <header className="px-6 md:px-12 pt-8 md:pt-10 pb-8 md:pb-10 border-b border-obsidian/8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-obsidian/50 hover:text-terracotta mb-8">
          ← <span className="ml-1">Volver a la página principal</span>
        </Link>
        <div className="max-w-6xl">
          <div className="font-mono-meta text-terracotta mb-6">directorio · convocatorias</div>
          <h1 className="font-serif-display text-6xl md:text-7xl lg:text-8xl italic text-terracotta leading-none mb-8 tracking-tight">
            Convocatorias.
          </h1>
          <p className="text-obsidian/70 max-w-2xl leading-relaxed text-lg mb-6">
            Oportunidades de financiación, formación, residencias y cooperación para el sector cultural, artístico, científico y social. Colombia y contexto internacional.
          </p>
        </div>
      </header>

      {/* Sticky bar */}
      <div className="sticky top-0 z-30 bg-alabaster/85 backdrop-blur-md border-b border-obsidian/8">
        <div className="px-6 md:px-12 py-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian/40" />
            <Input
              data-testid="conv-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, entidad, área o país..."
              className="h-11 pl-11 pr-4 bg-white border-obsidian/12 text-sm rounded-full focus-visible:ring-terracotta/40"
            />
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="h-11 px-5 rounded-full border border-obsidian/12 bg-white hover:border-obsidian/40 inline-flex items-center gap-2 lift text-sm font-medium">
                <FunnelSimple size={14} /> Filtros
                {activeCount > 0 ? (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-obsidian text-alabaster text-[10px] font-mono flex items-center justify-center">
                    {activeCount}
                  </span>
                ) : null}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md bg-alabaster overflow-y-auto">
              <SheetHeader className="mb-8">
                <SheetTitle className="font-serif-display text-4xl italic text-terracotta">Filtrar</SheetTitle>
              </SheetHeader>
              {opts ? (
                <div className="space-y-6 pb-24">
                  <FSel label="Estado" value={filters.status} onChange={(v) => setFilter("status", v)} options={opts.statuses} />
                  <FSel label="País" value={filters.country} onChange={(v) => setFilter("country", v)} options={opts.countries} />
                  <FSel label="Tipo" value={filters.type} onChange={(v) => setFilter("type", v)} options={opts.types} />
                  <FSel label="Área" value={filters.area} onChange={(v) => setFilter("area", v)} options={opts.areas} />
                  <FSel label="Tipo de proponente" value={filters.proponent} onChange={(v) => setFilter("proponent", v)} options={opts.proponents} />
                  <FSel label="Modalidad" value={filters.modalidad} onChange={(v) => setFilter("modalidad", v)} options={opts.modalidades} />
                  <div>
                    <div className="font-mono-meta text-obsidian/50 mb-2">Rango de monto</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Mínimo" type="number" value={filters.amount_min || ""} onChange={(e) => setFilter("amount_min", e.target.value ? Number(e.target.value) : undefined)} className="h-10 bg-white border-obsidian/15" />
                      <Input placeholder="Máximo" type="number" value={filters.amount_max || ""} onChange={(e) => setFilter("amount_max", e.target.value ? Number(e.target.value) : undefined)} className="h-10 bg-white border-obsidian/15" />
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="fixed bottom-0 left-0 right-0 sm:max-w-md sm:left-auto p-4 bg-alabaster border-t border-obsidian/10 flex gap-3">
                <Button variant="outline" onClick={clearAll} className="flex-1 rounded-full border-obsidian/15 bg-transparent hover:bg-linen h-11">Limpiar</Button>
                <Button onClick={() => setOpen(false)} className="flex-1 rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11">Ver {count} resultados</Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <SortAscending size={14} className="text-obsidian/40" />
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-9 border-0 bg-transparent px-2 text-sm text-obsidian/70 focus:ring-0 shadow-none w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="close_date">Fecha de cierre</SelectItem>
                  <SelectItem value="open_date">Fecha de publicación</SelectItem>
                  <SelectItem value="amount">Monto</SelectItem>
                  <SelectItem value="title">Nombre</SelectItem>
                  <SelectItem value="country">País</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="font-mono-meta text-obsidian/50">
              {count} {count === 1 ? "convocatoria" : "convocatorias"}
            </div>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="px-6 md:px-12 pb-4 flex flex-wrap items-center gap-2">
            {chips.map((c, i) => (
              <button key={i} onClick={c.remove} className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-obsidian text-alabaster text-xs font-medium lift">
                {c.label} <X size={10} weight="bold" />
              </button>
            ))}
            <button onClick={clearAll} className="text-xs text-obsidian/50 hover:text-terracotta underline underline-offset-4 ml-1">Limpiar todo</button>
          </div>
        ) : null}
      </div>

      <div className="px-6 md:px-12 py-10 md:py-14">
        {/* AI Recommendations (only for logged users with profile, no active filters) */}
        {user && recs?.has_profile && recs.recommendations?.length > 0 && !debouncedQ && Object.values(filters).every((v) => !v) ? (
          <section className="mb-14" data-testid="conv-recommendations">
            <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkle size={15} weight="fill" className="text-terracotta" />
                  <div className="font-mono-meta text-terracotta">recomendadas para ti</div>
                </div>
                <div className="font-serif-display text-3xl md:text-4xl italic text-terracotta leading-tight">
                  Seleccionadas por Cultora IA.
                </div>
                <div className="text-sm text-obsidian/60 mt-2">
                  Basadas en tu perfil ({user.name?.split(" ")[0]}) y tus objetivos activos.
                </div>
              </div>
              <button
                onClick={refreshRecs}
                disabled={recsLoading}
                className="inline-flex items-center gap-2 text-xs text-obsidian/60 hover:text-terracotta font-mono-meta group"
              >
                <ArrowsClockwise size={12} weight="bold" className={recsLoading ? "animate-spin" : "transition-transform group-hover:rotate-180"} />
                {recsLoading ? "actualizando…" : "regenerar"}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {recs.recommendations.map((r, i) => (
                <div key={r.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up">
                  <RecCard c={r} />
                </div>
              ))}
            </div>
            <div className="rule-divider mt-14" />
          </section>
        ) : null}

        {/* Main grid */}
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="border border-obsidian/10 bg-white p-14 text-center rounded-md max-w-2xl mx-auto">
            <div className="font-serif-display text-4xl italic text-terracotta mb-3">Sin resultados</div>
            <p className="text-obsidian/60 mb-6">Ajusta la búsqueda o los filtros.</p>
            <Button onClick={clearAll} variant="outline" className="rounded-full border-obsidian/20 bg-transparent hover:bg-linen h-10 px-6">Limpiar filtros</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {items.map((c, i) => (
              <div key={c.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }} className="animate-fade-up">
                <ConvCard c={c} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FSel({ label, value, onChange, options }) {
  return (
    <div>
      <div className="font-mono-meta text-obsidian/50 mb-2">{label}</div>
      <Select value={value || ANY} onValueChange={onChange}>
        <SelectTrigger className="h-11 bg-white border-obsidian/12">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ConvCard({ c }) {
  const tone = STATUS_TONE[c.status] || "bg-obsidian/8 text-obsidian border-obsidian/20";
  return (
    <Link to={`/convocatorias/${c.id}`} data-testid={`conv-card-${c.id}`} className="group block bg-white border border-obsidian/10 hover:border-obsidian/30 p-6 lift">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 h-6 rounded-full border ${tone}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {c.status}
        </span>
        <span className="font-mono-meta text-obsidian/40">{c.types[0]}</span>
        {c.types[1] ? <span className="font-mono-meta text-obsidian/30">· {c.types[1]}</span> : null}
      </div>
      <div className="font-serif-display text-2xl md:text-3xl leading-tight mb-3 group-hover:text-terracotta transition-colors">
        {c.title}
      </div>
      <p className="text-sm text-obsidian/60 line-clamp-2 mb-5">{c.summary}</p>
      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs pt-4 border-t border-obsidian/8">
        <Meta icon={Buildings}>{c.entity}</Meta>
        <Meta icon={MapPin}>{c.country}</Meta>
        <Meta icon={CalendarBlank}>Cierra {fmtDate(c.close_date)}</Meta>
        <Meta icon={CurrencyCircleDollar}>{fmtAmount(c.amount_min, c.amount_max, c.moneda)}</Meta>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {c.areas.slice(0, 3).map((a) => (
            <span key={a} className="chip">{a}</span>
          ))}
          {c.areas.length > 3 ? <span className="chip">+{c.areas.length - 3}</span> : null}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-obsidian group-hover:text-terracotta transition-colors">
          Ver más <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

function RecCard({ c }) {
  const tone = STATUS_TONE[c.status] || "bg-obsidian/8 text-obsidian border-obsidian/20";
  return (
    <Link
      to={`/convocatorias/${c.id}`}
      data-testid={`conv-rec-${c.id}`}
      className="group block bg-white border border-terracotta/25 hover:border-terracotta shadow-[0_1px_0_rgba(182,70,38,0.08)] lift overflow-hidden"
    >
      {/* AI reason banner */}
      <div className="bg-terracotta/6 border-b border-terracotta/15 px-6 py-4">
        <div className="flex items-start gap-3">
          <Sparkle size={16} weight="fill" className="text-terracotta shrink-0 mt-0.5" />
          <div>
            <div className="font-mono-meta text-terracotta mb-1">por qué te la recomendamos</div>
            <p className="text-sm text-obsidian/85 leading-relaxed">{c.reason}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 h-6 rounded-full border ${tone}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {c.status}
          </span>
          <span className="font-mono-meta text-obsidian/40">{c.types[0]}</span>
        </div>
        <div className="font-serif-display text-2xl leading-tight mb-3 group-hover:text-terracotta transition-colors">
          {c.title}
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs pt-3 border-t border-obsidian/8">
          <Meta icon={Buildings}>{c.entity}</Meta>
          <Meta icon={MapPin}>{c.country}</Meta>
          <Meta icon={CalendarBlank}>Cierra {fmtDate(c.close_date)}</Meta>
          <Meta icon={CurrencyCircleDollar}>{fmtAmount(c.amount_min, c.amount_max, c.moneda)}</Meta>
        </div>
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-obsidian group-hover:text-terracotta transition-colors">
          Ver convocatoria <ArrowUpRight size={13} weight="bold" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}

function Meta({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-obsidian/70 min-w-0">
      <Icon size={12} className="text-obsidian/40 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-obsidian/10 p-6">
      <div className="h-5 w-1/3 bg-linen animate-pulse rounded mb-4" />
      <div className="h-6 w-4/5 bg-linen animate-pulse rounded mb-2" />
      <div className="h-4 w-2/3 bg-linen/70 animate-pulse rounded mb-5" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-3 bg-linen/60 animate-pulse rounded" />
        <div className="h-3 bg-linen/60 animate-pulse rounded" />
        <div className="h-3 bg-linen/60 animate-pulse rounded" />
        <div className="h-3 bg-linen/60 animate-pulse rounded" />
      </div>
    </div>
  );
}
