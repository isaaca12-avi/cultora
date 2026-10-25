import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { agents as agentsApi } from "@/lib/api";
import { AGENTS } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import {
  CaretLeft,
  MapPin,
  BookmarkSimple,
  EnvelopeSimple,
  Globe,
  InstagramLogo,
  LinkedinLogo,
  UsersFour,
  Handshake,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const AVAIL_TONE = {
  "Disponible": "text-olive",
  "Parcialmente disponible": "text-terracotta",
  "En proyecto": "text-obsidian/60",
  "No disponible": "text-obsidian/40",
};

export default function AgentProfile() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    setNotFound(false);
    try {
      const a = await agentsApi.get(agentId);
      if (!a || typeof a !== "object") throw new Error("empty");
      const arr = (v) => (Array.isArray(v) ? v : []);
      setAgent({
        ...a,
        capabilities: arr(a.capabilities),
        interests: arr(a.interests),
        offers_tags: arr(a.offers_tags),
        needs_tags: arr(a.needs_tags),
        projects: arr(a.projects),
      });
    } catch {
      setNotFound(true);
      toast.error("Agente no encontrado");
    }
  };

  useEffect(() => {
    load();
  }, [agentId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg border border-obsidian/10 bg-white p-12 text-center rounded-md">
        <div className="font-serif-display text-3xl italic text-terracotta mb-3">Agente no encontrado</div>
        <p className="text-obsidian/60 mb-6">Puede que el perfil ya no esté publicado.</p>
        <Link
          to="/agentes"
          className="inline-flex items-center justify-center rounded-full bg-obsidian text-alabaster h-10 px-6 text-sm font-medium hover:bg-obsidian/90"
        >
          Volver al directorio
        </Link>
      </div>
    );
  }

  if (!agent) return <div className="font-serif-display text-2xl text-obsidian/50">Cargando…</div>;

  const initials = (agent.name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  const toggleSave = async () => {
    setSaving(true);
    try {
      if (agent.saved) {
        await agentsApi.unsave(agentId);
        setAgent({ ...agent, saved: false });
      } else {
        await agentsApi.save(agentId);
        setAgent({ ...agent, saved: true });
        toast.success("Agente guardado");
      }
    } catch {
      toast.error("No pudimos actualizar");
    } finally {
      setSaving(false);
    }
  };

  const invite = () => {
    toast.info("Función de invitación a colaborar disponible próximamente.");
  };

  const addToProject = () => {
    toast.info("Función 'Agregar a proyecto' disponible próximamente.");
  };

  return (
    <div className="max-w-5xl">
      <Link to="/agentes" className="inline-flex items-center gap-2 text-sm text-obsidian/60 hover:text-terracotta mb-8">
        <CaretLeft size={16} /> Volver al directorio
      </Link>

      {/* Header */}
      <header className="grid-frame p-8 md:p-10 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-8 items-start">
          {agent.photo ? (
            <img src={agent.photo} alt="" className="w-32 h-40 rounded-sm object-cover" style={{ filter: "grayscale(100%) contrast(1.02)" }} />
          ) : (
            <div className="w-32 h-40 rounded-sm bg-linen text-obsidian flex items-center justify-center font-serif-display text-6xl leading-none">
              {initials}
            </div>
          )}

          <div className="min-w-0">
            <div className="font-mono-meta text-terracotta mb-2">{agent.agent_type}</div>
            <h1 data-testid={AGENTS.profileName} className="font-serif-display text-4xl md:text-5xl leading-tight">
              {agent.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-obsidian/70">
              <span className="font-medium">{agent.role}</span>
              <span className="text-obsidian/30">·</span>
              <span>{agent.discipline}</span>
              <span className="text-obsidian/30">·</span>
              <span>{agent.years} años de experiencia</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-obsidian/70">
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-obsidian/40" /> {agent.city}{agent.neighborhood ? ` · ${agent.neighborhood}` : ""}</span>
              {agent.organization ? <span>· {agent.organization}</span> : null}
            </div>
            <div className={`mt-3 font-mono-meta flex items-center gap-2 ${AVAIL_TONE[agent.availability] || "text-obsidian/60"}`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
              {agent.availability}
            </div>
          </div>

          <div className="flex md:flex-col gap-2 md:items-stretch">
            <Button
              data-testid={AGENTS.profileContact}
              onClick={() => (window.location.href = `mailto:${agent.email}`)}
              className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11 px-6 lift"
            >
              <EnvelopeSimple size={16} className="mr-2" />
              Contactar
            </Button>
            <Button
              data-testid={AGENTS.profileSave}
              onClick={toggleSave}
              disabled={saving}
              variant="outline"
              className="rounded-full border-obsidian/20 bg-transparent hover:bg-linen h-11 px-6 lift"
            >
              <BookmarkSimple size={16} className="mr-2" weight={agent.saved ? "fill" : "regular"} />
              {agent.saved ? "Guardado" : "Guardar"}
            </Button>
          </div>
        </div>
      </header>

      {/* Bio */}
      <section className="mb-10">
        <div className="font-mono-meta text-obsidian/50 mb-3">descripción</div>
        <p className="font-serif-display text-2xl md:text-3xl leading-tight text-obsidian/85 max-w-3xl">
          {agent.bio}
        </p>
      </section>

      {/* Contact chips */}
      <section className="mb-12">
        <div className="font-mono-meta text-obsidian/50 mb-3">información de contacto</div>
        <div className="flex flex-wrap gap-3">
          {agent.email ? (
            <a href={`mailto:${agent.email}`} className="chip lift">
              <EnvelopeSimple size={12} /> {agent.email}
            </a>
          ) : null}
          {agent.website ? (
            <a href={`https://${agent.website}`} target="_blank" rel="noreferrer" className="chip lift">
              <Globe size={12} /> {agent.website}
            </a>
          ) : null}
          {agent.socials?.instagram ? (
            <span className="chip"><InstagramLogo size={12} /> {agent.socials.instagram}</span>
          ) : null}
          {agent.socials?.linkedin ? (
            <span className="chip"><LinkedinLogo size={12} /> {agent.socials.linkedin}</span>
          ) : null}
        </div>
      </section>

      {/* Grid of capabilities/interests */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-obsidian/10 border border-obsidian/10 mb-12">
        <Block title="Capacidades" hint="Habilidades y servicios que puede aportar">
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </div>
        </Block>
        <Block title="Intereses" hint="Áreas donde busca colaborar">
          <div className="flex flex-wrap gap-2">
            {agent.interests.map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </div>
        </Block>

        <Block title="Qué ofrece" hint="Aportes específicos al ecosistema">
          <p className="text-obsidian/80 leading-relaxed mb-4">{agent.offers}</p>
          <div className="flex flex-wrap gap-2">
            {agent.offers_tags.map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
        </Block>
        <Block title="Qué necesita" hint="Búsquedas activas de colaboración">
          <p className="text-obsidian/80 leading-relaxed mb-4">{agent.needs}</p>
          <div className="flex flex-wrap gap-2">
            {agent.needs_tags.map((t) => (
              <span key={t} className="chip" style={{ borderColor: "rgba(182,70,38,0.4)" }}>{t}</span>
            ))}
          </div>
        </Block>
      </section>

      {/* Projects */}
      <section className="mb-12">
        <div className="font-mono-meta text-obsidian/50 mb-4">proyectos destacados</div>
        <ul className="grid-frame divide-y divide-obsidian/10">
          {agent.projects.map((p, i) => (
            <li key={i} className="p-5 md:p-6 flex items-start gap-4">
              <span className="font-serif-display text-2xl text-terracotta w-8">0{i + 1}</span>
              <span className="text-obsidian/80 leading-relaxed pt-1">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Actions bar */}
      <section className="bg-obsidian text-alabaster p-8 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="font-mono-meta text-alabaster/50 mb-2">acciones</div>
            <div className="font-serif-display text-3xl md:text-4xl leading-tight">¿Quieres articular con {agent.name.split(" ")[0]}?</div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button
              onClick={() => (window.location.href = `mailto:${agent.email}`)}
              className="rounded-full bg-terracotta hover:bg-terracotta/90 text-alabaster h-11 px-6 lift"
            >
              <EnvelopeSimple size={16} className="mr-2" />
              Contactar
            </Button>
            <Button
              data-testid={AGENTS.profileInvite}
              onClick={invite}
              variant="outline"
              className="rounded-full border-alabaster/30 bg-transparent hover:bg-alabaster/10 text-alabaster h-11 px-6 lift"
            >
              <Handshake size={16} className="mr-2" />
              Invitar a colaborar
            </Button>
            <Button
              onClick={addToProject}
              variant="outline"
              className="rounded-full border-alabaster/30 bg-transparent hover:bg-alabaster/10 text-alabaster h-11 px-6 lift"
            >
              <UsersFour size={16} className="mr-2" />
              Agregar a proyecto
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Block({ title, hint, children }) {
  return (
    <div className="bg-white p-7">
      <div className="font-mono-meta text-obsidian/50 mb-1">{title}</div>
      <div className="text-xs text-obsidian/40 mb-4">{hint}</div>
      {children}
    </div>
  );
}
