import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forum as forumApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function ForumNew() {
  const nav = useNavigate();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({
    category: "",
    kind: "pregunta",
    title: "",
    body: "",
    tags: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    forumApi.meta().then(setMeta);
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category) return toast.error("Selecciona una categoría");
    if (form.title.length < 6) return toast.error("El título debe tener al menos 6 caracteres");
    if (form.body.length < 10) return toast.error("Escribe un poco más en el cuerpo del tema");
    setBusy(true);
    try {
      const payload = {
        category: form.category,
        kind: form.kind,
        title: form.title.trim(),
        body: form.body.trim(),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const t = await forumApi.create(payload);
      toast.success("Tema publicado");
      nav(`/foro/tema/${t.id}`);
    } catch {
      toast.error("No pudimos publicar el tema");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Link to="/foro" className="inline-flex items-center gap-2 text-sm text-obsidian/50 hover:text-terracotta mb-8 group">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
        Volver al foro
      </Link>
      <div className="font-mono-meta text-terracotta mb-4">nuevo tema</div>
      <h1 className="font-serif-display text-5xl italic text-terracotta leading-none mb-8">Abre una conversación.</h1>

      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Categoría *">
            <Select value={form.category || undefined} onValueChange={(v) => set("category", v)}>
              <SelectTrigger data-testid="forum-new-category" className="h-11 bg-white border-obsidian/15">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {(meta?.categories || []).map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo de publicación *">
            <Select value={form.kind} onValueChange={(v) => set("kind", v)}>
              <SelectTrigger data-testid="forum-new-kind" className="h-11 bg-white border-obsidian/15">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(meta?.kinds || []).map((k) => (
                  <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Título *">
          <Input
            data-testid="forum-new-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ej. ¿Cómo estructuran su primer presupuesto de gira?"
            className="h-12 bg-white border-obsidian/15 text-lg"
            maxLength={180}
          />
        </Field>

        <Field label="Cuerpo *">
          <Textarea
            data-testid="forum-new-body"
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            rows={8}
            placeholder="Cuenta contexto, comparte tu experiencia o formula tu pregunta con detalle. Cuanto más específico, mejor la conversación."
            className="bg-white border-obsidian/15 resize-none text-base"
          />
        </Field>

        <Field label="Etiquetas (separadas por coma)">
          <Input
            data-testid="forum-new-tags"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="convocatorias, primera vez, colombia"
            className="h-11 bg-white border-obsidian/15"
          />
        </Field>

        <div className="pt-4 border-t border-obsidian/10 flex items-center gap-3">
          <Button
            type="submit"
            disabled={busy}
            data-testid="forum-new-submit"
            className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-12 px-8 lift"
          >
            {busy ? "Publicando…" : "Publicar tema"}
          </Button>
          <Link to="/foro" className="text-sm text-obsidian/50 hover:text-terracotta">Cancelar</Link>
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
