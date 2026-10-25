import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { profile as profileApi } from "@/lib/api";
import { PROFILE } from "@/constants/testIds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const AGENT_TYPES = ["Artista individual", "Colectivo", "Compañía", "Espacio cultural", "Organización cultural"];
const DISCIPLINES = ["Música", "Artes escénicas", "Artes visuales", "Literatura", "Audiovisual", "Gestión cultural", "Multidisciplinar", "Otro"];
const STAGES = ["Idea", "Inicio", "Consolidación", "Madurez"];
const TEAM = ["Solo", "2-5", "6-15", "15+"];
const INCOME = ["Sin ingresos", "0-500 USD", "500-2000 USD", "2000-8000 USD", "8000+ USD"];
const AUDIENCE = ["Ninguna", "Pequeña (< 500)", "Media (500-5.000)", "Grande (5.000+)"];
const FORMAL = ["Informal", "Autónomo/Monotributista", "Asociación/ONG", "Empresa"];

export default function ProfilePage() {
  const { setUser, refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    agent_type: "",
    discipline: "",
    stage: "",
    territory: "",
    team_size: "",
    monthly_income: "",
    audience_base: "",
    channels: [],
    formalized: "",
    bio: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    profileApi.get().then((p) => setForm((prev) => ({ ...prev, ...(p || {}) })));
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await profileApi.save(form);
      setUser(u);
      await refresh();
      toast.success("Perfil guardado");
      nav("/objetivos");
    } catch (e) {
      toast.error("No pudimos guardar el perfil");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="font-mono-meta text-terracotta mb-4">tu proyecto cultural</div>
      <h1 className="font-serif-display text-4xl md:text-5xl mb-3">Cuéntame sobre ti.</h1>
      <p className="text-obsidian/70 max-w-2xl leading-relaxed mb-10">
        Cada dato aquí afina el motor de decisión. No se comparte, no se publica: solo mejora tu diagnóstico.
      </p>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <SelectField testId={PROFILE.agentType} label="Tipo de agente" value={form.agent_type} onChange={(v) => setField("agent_type", v)} options={AGENT_TYPES} />
        <SelectField testId={PROFILE.discipline} label="Disciplina / sector" value={form.discipline} onChange={(v) => setField("discipline", v)} options={DISCIPLINES} />
        <SelectField testId={PROFILE.stage} label="Etapa del proyecto" value={form.stage} onChange={(v) => setField("stage", v)} options={STAGES} />
        <Field label="Territorio (ciudad, país)">
          <Input
            data-testid={PROFILE.territory}
            value={form.territory}
            onChange={(e) => setField("territory", e.target.value)}
            placeholder="Ej. Bogotá, Colombia"
            className="h-12 bg-white border-obsidian/15"
          />
        </Field>
        <SelectField testId={PROFILE.teamSize} label="Tamaño del equipo" value={form.team_size} onChange={(v) => setField("team_size", v)} options={TEAM} />
        <SelectField testId={PROFILE.income} label="Ingresos mensuales aprox." value={form.monthly_income} onChange={(v) => setField("monthly_income", v)} options={INCOME} />
        <SelectField testId={PROFILE.audience} label="Base de público actual" value={form.audience_base} onChange={(v) => setField("audience_base", v)} options={AUDIENCE} />
        <SelectField testId={PROFILE.formalized} label="Formalización" value={form.formalized} onChange={(v) => setField("formalized", v)} options={FORMAL} />

        <div className="md:col-span-2">
          <Field label="Descríbelo en 2-3 líneas (opcional)">
            <Textarea
              data-testid={PROFILE.bio}
              value={form.bio}
              onChange={(e) => setField("bio", e.target.value)}
              rows={3}
              className="bg-white border-obsidian/15 resize-none"
              placeholder="Ej. Compañía de teatro con 6 años de trayectoria en Medellín…"
            />
          </Field>
        </div>

        <div className="md:col-span-2 pt-2">
          <Button
            type="submit"
            disabled={busy}
            data-testid={PROFILE.submit}
            className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-10 lift"
          >
            {busy ? "Guardando…" : "Guardar y continuar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="font-mono-meta text-obsidian/60 mb-2">{label}</div>
      {children}
    </label>
  );
}

function SelectField({ testId, label, value, onChange, options }) {
  return (
    <Field label={label}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger data-testid={testId} className="h-12 bg-white border-obsidian/15">
          <SelectValue placeholder="Selecciona una opción" />
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
