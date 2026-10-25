import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { agents as agentsApi } from "@/lib/api";
import { AGENTS } from "@/constants/testIds";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  MagnifyingGlass,
  BookmarkSimple,
  FunnelSimple,
  X,
  ArrowUpRight,
  ArrowLeft,
  SortAscending,
  UserPlus,
  PencilSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const ANY = "__any__";

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const SORT_OPTIONS = [
  { key: "name", label: "Nombre A-Z" },
  { key: "city", label: "Ciudad" },
  { key: "availability", label: "Disponibilidad" },
];

const AVAILABILITY_ORDER = {
  "Disponible": 0,
  "Parcialmente disponible": 1,
  "En proyecto": 2,
  "No disponible": 3,
};

function sortItems(items, key) {
  const arr = [...items];
  if (key === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
  else if (key === "city") arr.sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  else if (key === "availability")
    arr.sort((a, b) => (AVAILABILITY_ORDER[a.availability] ?? 9) - (AVAILABILITY_ORDER[b.availability] ?? 9));
  return arr;
}

export default function AgentsList() {
  const [filters, setFilters] = useState({});
  const [q, setQ] = useState("");
  const [data, setData] = useState({ count: 0, items: [] });
  const [opts, setOpts] = useState(null);
  const [saved, setSaved] = useState(new Set());
  const [selectedCaps, setSelectedCaps] = useState([]);
  const [selectedInts, setSelectedInts] = useState([]);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState(null);
  const debouncedQ = useDebounced(q, 250);

  useEffect(() => {
    agentsApi.filters().then(setOpts);
    agentsApi.saved().then((r) => setSaved(new Set(r.items.map((i) => i.id)))).catch(() => {});
    agentsApi.mine().then(setMine).catch(() => {});
  }, []);

  const activeParams = useMemo(() => {
    const p = { ...filters };
    if (debouncedQ) p.q = debouncedQ;
    if (selectedCaps.length) p.capabilities = selectedCaps.join(",");
    if (selectedInts.length) p.interests = selectedInts.join(",");
    return p;
  }, [filters, debouncedQ, selectedCaps, selectedInts]);

  useEffect(() => {
    setLoading(true);
    agentsApi.list(activeParams).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [activeParams]);

  const items = useMemo(() => sortItems(data.items, sort), [data.items, sort]);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v === ANY ? undefined : v }));
  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const clearAll = () => {
    setFilters({});
    setQ("");
    setSelectedCaps([]);
    setSelectedInts([]);
  };

  const toggleSave = async (id, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      if (saved.has(id)) {
        await agentsApi.unsave(id);
        setSaved((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      } else {
        await agentsApi.save(id);
        setSaved((s) => new Set(s).add(id));
        toast.success("Agente guardado");
      }
    } catch {
      toast.error("No pudimos guardar el agente");
    }
  };

  const activeFilterCount =
    Object.values(filters).filter(Boolean).length + selectedCaps.length + selectedInts.length;
  const anyActive = Boolean(q) || activeFilterCount > 0;

  const activeChips = [
    ...Object.entries(filters).filter(([, v]) => v).map(([k, v]) => ({ label: v, remove: () => setFilter(k, ANY) })),
    ...selectedCaps.map((c) => ({ label: c, remove: () => toggle(selectedCaps, setSelectedCaps, c) })),
    ...selectedInts.map((c) => ({ label: c, remove: () => toggle(selectedInts, setSelectedInts, c) })),
  ];

  const isPublished = mine?.published;

  return (
    <div data-testid={AGENTS.root} className="-mx-6 md:-mx-12 -my-8 md:-my-12">
      {/* Editorial hero header */}
      <header className="px-6 md:px-12 pt-8 md:pt-10 pb-8 md:pb-10 border-b border-obsidian/8">
        <Link
          to="/"
          data-testid={AGENTS.back}
          className="inline-flex items-center gap-2 text-sm text-obsidian/50 hover:text-terracotta mb-8 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Volver a la página principal
        </Link>

        <div className="max-w-6xl">
          <div className="font-mono-meta text-terracotta mb-6">directorio profesional · cultora</div>
          <h1 className="font-serif-display text-6xl md:text-7xl lg:text-8xl italic text-terracotta leading-none mb-8 tracking-tight">
            Agentes<br />culturales.
          </h1>
          <p className="text-obsidian/70 max-w-2xl leading-relaxed text-lg mb-10">
            Un directorio curado de artistas, gestores, productores, técnicos y organizaciones iberoamericanas para articular tu próximo proyecto.
          </p>

          <div className="flex flex-wrap items-end justify-between gap-6 pt-6 border-t border-obsidian/10">
            {opts ? (
              <div className="flex flex-wrap gap-x-10 gap-y-4">
                <Stat label="agentes" value={data.count} />
                <Stat label="ciudades" value={opts.cities.length} />
                <Stat label="disciplinas" value={opts.disciplines.length} />
                <Stat label="capacidades" value={opts.capabilities.length} />
              </div>
            ) : <span />}

            <Link to="/agentes/mi-perfil" data-testid={AGENTS.publishMine}>
              <Button
                variant={isPublished ? "outline" : "default"}
                className={
                  isPublished
                    ? "rounded-full border-obsidian/15 bg-transparent hover:bg-linen h-11 px-5 lift"
                    : "rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11 px-5 lift"
                }
              >
                {isPublished ? <PencilSimple size={15} className="mr-2" /> : <UserPlus size={15} className="mr-2" />}
                {isPublished ? "Editar mi perfil" : "Publicar mi perfil"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Sticky search bar */}
      <div className="sticky top-0 z-30 bg-alabaster/85 backdrop-blur-md border-b border-obsidian/8">
        <div className="px-6 md:px-12 py-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian/40" />
            <Input
              data-testid={AGENTS.search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, disciplina, rol o ciudad..."
              className="h-11 pl-11 pr-4 bg-white border-obsidian/12 text-sm rounded-full focus-visible:ring-terracotta/40"
            />
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                data-testid={AGENTS.filterToggle}
                className="h-11 px-5 rounded-full border border-obsidian/12 bg-white hover:border-obsidian/40 inline-flex items-center gap-2 lift text-sm font-medium"
              >
                <FunnelSimple size={14} />
                Filtrar
                {activeFilterCount > 0 ? (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-obsidian text-alabaster text-[10px] font-mono flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md bg-alabaster overflow-y-auto">
              <SheetHeader className="mb-8">
                <SheetTitle className="font-serif-display text-4xl italic text-terracotta">Filtrar</SheetTitle>
              </SheetHeader>
              {opts ? (
                <div className="space-y-8 pb-24">
                  <FilterSelect testId={AGENTS.filterCity} label="Ciudad" value={filters.city} onChange={(v) => setFilter("city", v)} options={opts.cities} />
                  <FilterSelect testId={AGENTS.filterDiscipline} label="Disciplina" value={filters.discipline} onChange={(v) => setFilter("discipline", v)} options={opts.disciplines} />
                  <FilterSelect testId={AGENTS.filterRole} label="Rol" value={filters.role} onChange={(v) => setFilter("role", v)} options={opts.roles} />
                  <FilterSelect testId={AGENTS.filterType} label="Tipo de agente" value={filters.agent_type} onChange={(v) => setFilter("agent_type", v)} options={opts.agent_types} />
                  <FilterSelect testId={AGENTS.filterAvailability} label="Disponibilidad" value={filters.availability} onChange={(v) => setFilter("availability", v)} options={opts.availability} />

                  <ChipGroup title="Capacidades" values={opts.capabilities} selected={selectedCaps} onToggle={(v) => toggle(selectedCaps, setSelectedCaps, v)} testId={AGENTS.filterCapability} />
                  <ChipGroup title="Intereses" values={opts.interests} selected={selectedInts} onToggle={(v) => toggle(selectedInts, setSelectedInts, v)} testId={AGENTS.filterInterest} accent />
                </div>
              ) : null}
              <div className="fixed bottom-0 left-0 right-0 sm:max-w-md sm:left-auto p-4 bg-alabaster border-t border-obsidian/10 flex gap-3">
                <Button
                  data-testid={AGENTS.clearFilters}
                  variant="outline"
                  onClick={clearAll}
                  className="flex-1 rounded-full border-obsidian/15 bg-transparent hover:bg-linen h-11"
                >
                  Limpiar
                </Button>
                <Button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11"
                >
                  Ver {data.count} agentes
                </Button>
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
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div data-testid={AGENTS.count} className="font-mono-meta text-obsidian/50">
              {data.count} {data.count === 1 ? "agente" : "agentes"}
            </div>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="px-6 md:px-12 pb-4 flex flex-wrap items-center gap-2">
            {activeChips.map((c, i) => (
              <button
                key={i}
                onClick={c.remove}
                className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-obsidian text-alabaster text-xs font-medium lift"
              >
                {c.label} <X size={10} weight="bold" />
              </button>
            ))}
            <button
              onClick={clearAll}
              className="text-xs text-obsidian/50 hover:text-terracotta underline underline-offset-4 ml-1"
            >
              Limpiar todo
            </button>
          </div>
        ) : null}
      </div>

      {/* Grid */}
      <div className="px-6 md:px-12 py-10 md:py-14">
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="border border-obsidian/10 bg-white p-16 text-center rounded-md max-w-2xl mx-auto">
            <div className="font-serif-display text-4xl italic text-terracotta mb-3">Sin resultados</div>
            <p className="text-obsidian/60 mb-6">Ajusta la búsqueda o los filtros para encontrar agentes culturales.</p>
            {anyActive ? (
              <Button onClick={clearAll} variant="outline" className="rounded-full border-obsidian/20 bg-transparent hover:bg-linen h-10 px-6">
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((a, i) => (
              <div key={a.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }} className="animate-fade-up">
                <AgentCard agent={a} saved={saved.has(a.id)} onToggleSave={(e) => toggleSave(a.id, e)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-serif-display text-4xl md:text-5xl text-obsidian leading-none">{value}</div>
      <div className="font-mono-meta text-obsidian/50 mt-2">{label}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, testId }) {
  return (
    <div>
      <div className="font-mono-meta text-obsidian/50 mb-2">{label}</div>
      <Select value={value || ANY} onValueChange={onChange}>
        <SelectTrigger data-testid={testId} className="h-11 bg-white border-obsidian/12 rounded-md">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ChipGroup({ title, values, selected, onToggle, testId, accent }) {
  return (
    <div>
      <div className="font-mono-meta text-obsidian/50 mb-3">{title}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const active = selected.includes(v);
          return (
            <button
              key={v}
              data-testid={testId(v)}
              onClick={() => onToggle(v)}
              className={`text-xs font-medium px-3.5 h-8 rounded-full border transition-colors lift ${
                active
                  ? accent
                    ? "bg-terracotta text-alabaster border-terracotta"
                    : "bg-obsidian text-alabaster border-obsidian"
                  : "bg-white border-obsidian/12 text-obsidian/70 hover:border-obsidian/40 hover:text-obsidian"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Monogram (refined SVG dotted pattern) ----------------- */
function Monogram({ name, size = "lg" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-linen">
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#0F0F0F" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>
      <span
        className={`relative font-serif-display text-obsidian tracking-tight ${
          size === "xl" ? "text-8xl" : "text-6xl"
        }`}
      >
        {initials[0]}<span className="text-terracotta">{initials[1]}</span>
      </span>
    </div>
  );
}

/* ---------------- Regular Card ----------------- */
function AgentCard({ agent, saved, onToggleSave }) {
  return (
    <Link
      to={`/agentes/${agent.id}`}
      data-testid={`agent-card-${agent.id}`}
      className="group block bg-white border border-obsidian/8 hover:border-obsidian/25 lift overflow-hidden"
    >
      <div className="relative aspect-[3/4] bg-linen overflow-hidden">
        {agent.photo ? (
          <img
            src={agent.photo}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            style={{ filter: "grayscale(100%) contrast(1.05)" }}
          />
        ) : (
          <Monogram name={agent.name} />
        )}

        {/* Bottom gradient reveal on hover */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-obsidian/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <button
          data-testid={`agent-save-${agent.id}`}
          onClick={onToggleSave}
          aria-label="Guardar"
          className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-alabaster/85 backdrop-blur flex items-center justify-center transition ${
            saved ? "text-terracotta" : "text-obsidian/50 hover:text-terracotta"
          }`}
        >
          <BookmarkSimple size={14} weight={saved ? "fill" : "regular"} />
        </button>

        <div
          data-testid={`agent-view-${agent.id}`}
          className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-alabaster opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="font-mono-meta text-alabaster/80">{agent.city}</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            Ver perfil <ArrowUpRight size={12} weight="bold" />
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="font-sans font-semibold text-base text-obsidian leading-snug">{agent.name}</div>
          <AvailabilityDot value={agent.availability} className="mt-1.5 shrink-0" />
        </div>
        <div className="text-sm text-obsidian/70 leading-snug">{agent.role}</div>
        <div className="text-sm text-obsidian/70 leading-snug">{agent.discipline}</div>
        <div className="mt-2 pt-2 border-t border-obsidian/8 flex items-center justify-between text-xs">
          <span className="text-obsidian/60">{agent.city}</span>
          <span className="text-obsidian/40 truncate ml-2">
            {agent.organization || (agent.agent_type === "Persona" ? "Independiente" : agent.agent_type)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function AvailabilityDot({ value, className = "" }) {
  const color = {
    "Disponible": "bg-olive",
    "Parcialmente disponible": "bg-terracotta",
    "En proyecto": "bg-obsidian/50",
    "No disponible": "bg-obsidian/25",
  }[value] || "bg-obsidian/40";
  return (
    <span
      title={value}
      className={`inline-block w-2 h-2 rounded-full ${color} ${className}`}
      aria-label={value}
    />
  );
}

/* ---------------- Skeleton ----------------- */
function CardSkeleton() {
  return (
    <div className="bg-white border border-obsidian/8">
      <div className="aspect-[3/4] bg-linen animate-pulse" />
      <div className="p-5 space-y-2">
        <div className="h-4 w-3/4 bg-linen animate-pulse rounded" />
        <div className="h-3 w-1/2 bg-linen/70 animate-pulse rounded" />
        <div className="h-3 w-2/3 bg-linen/60 animate-pulse rounded" />
      </div>
    </div>
  );
}
