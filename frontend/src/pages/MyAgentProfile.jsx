import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { agents as agentsApi } from "@/lib/api";
import { AGENTS } from "@/constants/testIds";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowUpRight, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

const AGENT_TYPES = ["Persona", "Organización", "Institución", "Espacio cultural"];
const ROLES = ["Artista", "Gestor cultural", "Productor", "Técnico", "Docente", "Investigador", "Mediador", "Comunicador", "Diseñador", "Fotógrafo", "Sonidista", "Iluminador"];
const DISCIPLINES = ["Música", "Danza", "Teatro", "Artes visuales", "Audiovisual", "Literatura", "Patrimonio", "Circo", "Artes comunitarias", "Diseño", "Gestión cultural", "Multidisciplinar"];
const AVAILABILITY = ["Disponible", "Parcialmente disponible", "En proyecto", "No disponible"];
const CAPABILITIES = ["Producción", "Formulación de proyectos", "Gestión de públicos", "Comunicación", "Diseño", "Sonido", "Iluminación", "Mediación", "Investigación", "Docencia", "Gestión administrativa"];
const INTERESTS = ["Festivales", "Educación", "Infancia", "Patrimonio", "Circulación", "Investigación", "Formación", "Comunidad", "Innovación"];

const emptyForm = {
  name: "",
  role: "",
  agent_type: "Persona",
  discipline: "",
  city: "",
  neighborhood: "",
  organization: "",
  availability: "Disponible",
  years: 0,
  website: "",
  instagram: "",
  linkedin: "",
  capabilities: [],
  interests: [],
  offers: "",
  offers_tags: [],
  needs: "",
  needs_tags: [],
  projects: [""],
  bio: "",
  photo: "",
};

export default function MyAgentProfile() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentsApi.mine().then((r) => {
      setPublished(Boolean(r.published));
      if (r.profile && Object.keys(r.profile).length) {
        setForm({ ...emptyForm, ...r.profile, name: r.profile.name || user?.name || "" });
      } else {
        setForm((f) => ({ ...f, name: user?.name || "" }));
      }
      setLoading(false);
    });
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleArr = (key, v) => {
    setForm((f) => {
      const arr = f[key] || [];
      return { ...f, [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });
  };

  const setProject = (idx, v) => {
    setForm((f) => {
      const list = [...(f.projects || [])];
      list[idx] = v;
      return { ...f, projects: list };
    });
  };

  const addProject = () => setForm((f) => ({ ...f, projects: [...(f.projects || []), ""] }));
  const removeProject = (idx) =>
    setForm((f) => ({ ...f, projects: (f.projects || []).filter((_, i) => i !== idx) }));

  const setTagList = (key, csv) => {
    const arr = csv.split(",").map((x) => x.trim()).filter(Boolean);
    set(key, arr);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.role || !form.discipline || !form.city) {
      toast.error("Completa al menos rol, disciplina y ciudad.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        projects: (form.projects || []).filter(Boolean),
        years: Number(form.years) || 0,
      };
      const r = await agentsApi.saveMine(payload);
      setPublished(true);
      toast.success(published ? "Perfil actualizado" : "Perfil publicado en el directorio");
      nav(`/agentes/${r.agent_id}`);
    } catch (err) {
      toast.error("No pudimos guardar el perfil");
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    try {
      await agentsApi.unpublishMine();
      setPublished(false);
      toast.success("Perfil retirado del directorio");
    } catch {
      toast.error("No pudimos retirar el perfil");
    } finally {
      setBusy(false);
    }
  };

  const projectsInput = useMemo(() => form.projects || [""], [form.projects]);

  if (loading) return <div className="font-serif-display text-2xl text-obsidian/50">Cargando…</div>;

  return (
    <div className="max-w-4xl">
      <Link to="/agentes" className="inline-flex items-center gap-2 text-sm text-obsidian/50 hover:text-terracotta mb-8 group">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
        Volver al directorio
      </Link>

      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono-meta text-terracotta mb-4">mi perfil de agente</div>
          <h1 className="font-serif-display text-5xl md:text-6xl italic text-terracotta leading-none mb-4">
            {published ? "Editar mi perfil" : "Publicar mi perfil"}
          </h1>
          <p className="text-obsidian/70 max-w-2xl leading-relaxed">
            Aparecerás en el directorio profesional visible para toda la plataforma. Puedes actualizar o retirar tu perfil cuando quieras.
          </p>
        </div>
        {published ? (
          <div className="text-right">
            <span className="chip">Publicado</span>
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="space-y-10">
        <Section title="Identidad">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nombre público">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-11 bg-white border-obsidian/15" />
            </Field>
            <SelectField testId={AGENTS.myForm.agentType} label="Tipo de agente" value={form.agent_type} onChange={(v) => set("agent_type", v)} options={AGENT_TYPES} />
            <SelectField testId={AGENTS.myForm.role} label="Rol principal *" value={form.role} onChange={(v) => set("role", v)} options={ROLES} />
            <SelectField testId={AGENTS.myForm.discipline} label="Disciplina *" value={form.discipline} onChange={(v) => set("discipline", v)} options={DISCIPLINES} />
            <Field label="Ciudad *">
              <Input data-testid={AGENTS.myForm.city} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Ej. Bogotá" className="h-11 bg-white border-obsidian/15" />
            </Field>
            <Field label="Barrio o zona">
              <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Ej. La Candelaria" className="h-11 bg-white border-obsidian/15" />
            </Field>
            <Field label="Organización">
              <Input value={form.organization} onChange={(e) => set("organization", e.target.value)} placeholder="Ej. Compañía o colectivo (opcional)" className="h-11 bg-white border-obsidian/15" />
            </Field>
            <Field label="Años de experiencia">
              <Input type="number" min="0" value={form.years} onChange={(e) => set("years", e.target.value)} className="h-11 bg-white border-obsidian/15" />
            </Field>
            <SelectField testId={AGENTS.myForm.availability} label="Disponibilidad" value={form.availability} onChange={(v) => set("availability", v)} options={AVAILABILITY} />
            <Field label="URL de foto (opcional)">
              <Input value={form.photo} onChange={(e) => set("photo", e.target.value)} placeholder="https://…" className="h-11 bg-white border-obsidian/15" />
            </Field>
          </div>
        </Section>

        <Section title="Presentación">
          <Field label="Descripción breve">
            <Textarea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="En 2-3 líneas, cuéntanos quién eres profesionalmente." className="bg-white border-obsidian/15 resize-none" />
          </Field>
        </Section>

        <Section title="Enlaces">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Sitio web">
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="misitio.com" className="h-11 bg-white border-obsidian/15" />
            </Field>
            <Field label="Instagram">
              <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@usuario" className="h-11 bg-white border-obsidian/15" />
            </Field>
            <Field label="LinkedIn">
              <Input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="usuario" className="h-11 bg-white border-obsidian/15" />
            </Field>
          </div>
        </Section>

        <Section title="Capacidades" hint="Habilidades y servicios que puedes aportar">
          <ChipGrid values={CAPABILITIES} selected={form.capabilities} onToggle={(v) => toggleArr("capabilities", v)} />
        </Section>

        <Section title="Intereses" hint="Áreas en las que te interesa colaborar" accent>
          <ChipGrid accent values={INTERESTS} selected={form.interests} onToggle={(v) => toggleArr("interests", v)} />
        </Section>

        <Section title="Qué ofreces y qué necesitas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Field label="Qué ofreces">
                <Textarea rows={3} value={form.offers} onChange={(e) => set("offers", e.target.value)} className="bg-white border-obsidian/15 resize-none" />
              </Field>
              <div className="mt-3">
                <Field label="Etiquetas (separadas por coma)">
                  <Input value={(form.offers_tags || []).join(", ")} onChange={(e) => setTagList("offers_tags", e.target.value)} placeholder="producción, mentoría, giras" className="h-11 bg-white border-obsidian/15" />
                </Field>
              </div>
            </div>
            <div>
              <Field label="Qué necesitas">
                <Textarea rows={3} value={form.needs} onChange={(e) => set("needs", e.target.value)} className="bg-white border-obsidian/15 resize-none" />
              </Field>
              <div className="mt-3">
                <Field label="Etiquetas (separadas por coma)">
                  <Input value={(form.needs_tags || []).join(", ")} onChange={(e) => setTagList("needs_tags", e.target.value)} placeholder="financiamiento, aliados" className="h-11 bg-white border-obsidian/15" />
                </Field>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Proyectos destacados" hint="Uno por línea">
          <div className="space-y-2">
            {projectsInput.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={p} onChange={(e) => setProject(i, e.target.value)} placeholder="Ej. Festival X (2023)" className="h-11 bg-white border-obsidian/15 flex-1" />
                {projectsInput.length > 1 ? (
                  <button type="button" onClick={() => removeProject(i)} className="text-obsidian/40 hover:text-terracotta p-2" aria-label="Eliminar">
                    <Trash size={16} />
                  </button>
                ) : null}
              </div>
            ))}
            <button type="button" onClick={addProject} className="text-sm text-terracotta hover:underline underline-offset-4 mt-2">
              + Añadir otro proyecto
            </button>
          </div>
        </Section>

        <div className="sticky bottom-0 -mx-6 md:-mx-12 px-6 md:px-12 py-4 bg-alabaster/90 backdrop-blur border-t border-obsidian/10 flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={busy}
            data-testid={AGENTS.myForm.submit}
            className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-8 lift"
          >
            {busy ? "Guardando…" : published ? "Guardar cambios" : "Publicar en el directorio"}
            <ArrowUpRight size={14} weight="bold" className="ml-2" />
          </Button>
          {published ? (
            <Button
              type="button"
              variant="outline"
              onClick={unpublish}
              disabled={busy}
              data-testid={AGENTS.myForm.unpublish}
              className="rounded-full border-obsidian/15 bg-transparent hover:bg-linen h-12 px-6"
            >
              Retirar del directorio
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="font-mono-meta text-obsidian/50 mb-2">{label}</div>
      {children}
    </label>
  );
}

function SelectField({ testId, label, value, onChange, options }) {
  return (
    <Field label={label}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger data-testid={testId} className="h-11 bg-white border-obsidian/15">
          <SelectValue placeholder="Selecciona" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function Section({ title, hint, children, accent }) {
  return (
    <section className="border-t border-obsidian/8 pt-8">
      <div className={`font-mono-meta mb-1 ${accent ? "text-terracotta" : "text-obsidian/60"}`}>{title}</div>
      {hint ? <div className="text-xs text-obsidian/40 mb-4">{hint}</div> : <div className="mb-4" />}
      {children}
    </section>
  );
}

function ChipGrid({ values, selected, onToggle, accent }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => {
        const active = (selected || []).includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            className={`text-xs font-medium px-3.5 h-8 rounded-full border transition-colors ${
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
  );
}
