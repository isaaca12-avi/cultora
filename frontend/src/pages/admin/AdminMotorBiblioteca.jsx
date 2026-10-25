import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { AdminPageHeader, StatusPill, EmptyState, LoadingRows, MetricCard } from "@/components/admin/AdminUI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DetailDrawer, DetailSection, DetailRow } from "@/components/admin/DetailDrawer";
import Pagination from "@/components/admin/Pagination";
import { MagnifyingGlass, DotsThreeVertical, BookOpen, Plus, X, FloppyDisk, SealCheck, FileText, Books, Star } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import KBFileUploader from "@/components/admin/KBFileUploader";
import { toast } from "sonner";

const KINDS = ["guia", "caso", "reglamento", "manual", "articulo", "plantilla"];
const GOALS = [
  { key: "vender_entradas", label: "Vender entradas" },
  { key: "financiamiento", label: "Financiamiento" },
  { key: "sostenibilidad", label: "Sostenibilidad" },
  { key: "publicos", label: "Públicos" },
  { key: "organizacion_interna", label: "Organización interna" },
  { key: "espacio_cultural", label: "Espacio cultural" },
];

const EMPTY = {
  title: "", kind: "guia", category: "", summary: "", content: "",
  source_url: "", author: "", goal_keys: [], disciplines: [], countries: [],
  maturity: "", is_authoritative: false, status: "draft",
  language: null, original_files: [],
};

const DEFAULTS = { q: "", kind: "", status: "", goal_key: "", page: 1 };

export default function AdminMotorBiblioteca() {
  const { has } = useAdmin();
  const { values: f, set: setFilter } = useUrlFilters(DEFAULTS);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setData(null);
    const params = { page: f.page, limit: 20 };
    if (f.q) params.q = f.q;
    if (f.kind) params.kind = f.kind;
    if (f.status) params.status = f.status;
    if (f.goal_key) params.goal_key = f.goal_key;
    const r = await adminApi.motor.kb.list(params);
    setData(r);
  };
  const loadStats = async () => {
    try { setStats(await adminApi.motor.kb.stats()); } catch {}
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f.q, f.kind, f.status, f.goal_key, f.page]);
  useEffect(() => { loadStats(); }, []);

  const save = async (payload) => {
    try {
      if (editing.__new) {
        await adminApi.motor.kb.create(payload);
        toast.success("Documento agregado a la biblioteca");
      } else {
        await adminApi.motor.kb.update(editing.id, payload);
        toast.success("Documento actualizado");
      }
      setEditing(null);
      load(); loadStats();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error al guardar"); }
  };

  const remove = (d) => setConfirm({
    title: "Eliminar documento",
    description: `Se archivará "${d.title}" y sus chunks dejarán de usarse en el motor.`,
    variant: "danger",
    onConfirm: async () => {
      try { await adminApi.motor.kb.remove(d.id); toast.success("Eliminado"); setConfirm(null); load(); loadStats(); }
      catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
    },
  });

  const openDetail = async (d) => {
    try { setDetail(await adminApi.motor.kb.get(d.id)); }
    catch { setDetail(null); }
  };

  const authorize = async (d, on) => {
    try {
      await adminApi.motor.kb.authorize(d.id, on);
      toast.success(on ? "Marcado como autoritativo" : "Autoridad removida");
      load();
      if (detail?.id === d.id) openDetail(d);
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const items = data?.items || null;

  return (
    <div data-testid="admin-motor-biblioteca">
      <AdminPageHeader
        eyebrow="Motor de decisión"
        title="Biblioteca"
        description="Todo texto que agregues aquí alimenta el motor de decisión. Cuanto más rico y curado el corpus, mejores las recomendaciones."
        actions={has("engine.kb.create") ? (
          <button className="admin-btn admin-btn-accent" onClick={() => setEditing({ ...EMPTY, __new: true })} data-testid="admin-kb-new">
            <Plus size={13} weight="bold" /> Agregar documento
          </button>
        ) : null}
      />

      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MetricCard label="Documentos" value={stats.documents_total} icon={Books} />
          <MetricCard label="Publicados" value={stats.documents_published} icon={FileText} />
          <MetricCard label="Autoritativos" value={stats.documents_authoritative} icon={SealCheck} />
          <MetricCard label="Chunks indexados" value={stats.chunks_indexed} icon={BookOpen} />
        </div>
      ) : null}

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="relative">
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-faint)" }} />
          <input className="admin-input pl-8 w-64" placeholder="Buscar documento…" defaultValue={f.q}
            onKeyDown={(e) => { if (e.key === "Enter") setFilter({ q: e.currentTarget.value, page: 1 }); }} />
        </div>
        <select className="admin-select w-40" value={f.kind} onChange={(e) => setFilter({ kind: e.target.value, page: 1 })}>
          <option value="">Todos los tipos</option>
          {KINDS.map(k => <option key={k}>{k}</option>)}
        </select>
        <select className="admin-select w-48" value={f.goal_key} onChange={(e) => setFilter({ goal_key: e.target.value, page: 1 })}>
          <option value="">Todos los objetivos</option>
          {GOALS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
        </select>
        <select className="admin-select w-40" value={f.status} onChange={(e) => setFilter({ status: e.target.value, page: 1 })}>
          <option value="">Todos los estados</option>
          <option value="draft">Borradores</option>
          <option value="published">Publicados</option>
          <option value="archived">Archivados</option>
        </select>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Tipo</th>
                <th>Objetivos</th>
                <th>Chunks</th>
                <th>Estado</th>
                <th>Autoridad</th>
                <th className="text-right pr-4" style={{ width: 60 }}></th>
              </tr>
            </thead>
            {items === null ? <LoadingRows cols={7} /> : items.length === 0 ? (
              <tbody><tr><td colSpan={7}><EmptyState icon={BookOpen} title="Sin documentos" description="Agrega el primer texto para empezar a nutrir el motor de decisión." /></td></tr></tbody>
            ) : (
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} onClick={() => openDetail(d)} className="cursor-pointer">
                    <td className="max-w-[380px]">
                      <div className="font-medium truncate" style={{ color: "var(--a-text)" }}>{d.title}</div>
                      <div className="text-[11.5px] admin-text-muted mt-0.5 truncate">{d.summary || "—"}</div>
                    </td>
                    <td className="admin-text-muted capitalize">{d.kind}</td>
                    <td className="admin-text-muted text-[12px]">
                      {(d.goal_keys || []).slice(0, 2).map(g => GOALS.find(x => x.key === g)?.label || g).join(", ") || "—"}
                    </td>
                    <td className="admin-text-muted">{d.chunks_count ?? 0}</td>
                    <td><StatusPill status={d.status === "published" ? "published" : (d.status === "archived" ? "closed" : "draft")} /></td>
                    <td>{d.is_authoritative ? <span className="admin-chip admin-chip-accent"><SealCheck size={11} weight="fill" />Autoritativo</span> : <span className="admin-text-faint text-xs">—</span>}</td>
                    <td className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="admin-btn admin-btn-icon admin-btn-ghost"><DotsThreeVertical size={16} weight="bold" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[220px] p-1 shadow-lg"
                          style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}>
                          {has("engine.kb.edit") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => openDetail(d).then(() => setEditing({ ...EMPTY, ...d }))}>Editar</DropdownMenuItem>
                          ) : null}
                          {has("engine.kb.authorize") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-text)" }} onClick={() => authorize(d, !d.is_authoritative)}>
                              {d.is_authoritative ? "Quitar autoridad" : "Marcar autoritativo"}
                            </DropdownMenuItem>
                          ) : null}
                          {has("engine.kb.delete") ? (
                            <DropdownMenuItem className="text-[12.5px] focus:bg-transparent" style={{ color: "var(--a-danger)" }} onClick={() => remove(d)}>Eliminar</DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {data ? <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={(p) => setFilter({ page: p })} /> : null}
      </div>

      <KBDocEditor doc={editing} onClose={() => setEditing(null)} onSave={save} canAuthorize={has("engine.kb.authorize")} />

      <DetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title || ""}
        subtitle={detail?.summary}
        description="Detalle del documento"
        testId="admin-kb-detail"
        width="640px"
        actions={detail && has("engine.kb.edit") ? (
          <button className="admin-btn" onClick={() => { setEditing({ ...EMPTY, ...detail }); setDetail(null); }}>
            Editar
          </button>
        ) : null}
      >
        {detail ? (
          <>
            <DetailSection title="Metadatos">
              <DetailRow label="Tipo" value={detail.kind} />
              <DetailRow label="Categoría" value={detail.category} />
              <DetailRow label="Autor" value={detail.author} />
              <DetailRow label="Fuente" value={detail.source_url ? <a href={detail.source_url} target="_blank" rel="noreferrer" className="underline">{detail.source_url}</a> : null} />
              <DetailRow label="Objetivos" value={(detail.goal_keys || []).map(g => GOALS.find(x => x.key === g)?.label || g).join(", ")} />
              <DetailRow label="Estado" value={<StatusPill status={detail.status === "published" ? "published" : "draft"} />} />
              <DetailRow label="Autoritativo" value={detail.is_authoritative ? "Sí" : "No"} />
              <DetailRow label="Chunks" value={detail.chunks_count ?? 0} />
            </DetailSection>
            <DetailSection title="Contenido">
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--a-text)" }}>
                {detail.content}
              </div>
            </DetailSection>
            {detail.chunks?.length ? (
              <DetailSection title={`Fragmentos indexados (${detail.chunks.length})`}>
                <ul className="space-y-3">
                  {detail.chunks.slice(0, 10).map(c => (
                    <li key={c.id} className="admin-surface p-3 rounded-md text-[12.5px]">
                      <div className="text-[10.5px] admin-text-faint mb-1 uppercase tracking-wider">Chunk #{c.position + 1} · {c.token_est} tokens</div>
                      <div className="whitespace-pre-wrap admin-text-muted">{c.text}</div>
                    </li>
                  ))}
                  {detail.chunks.length > 10 ? (
                    <li className="text-[11.5px] admin-text-faint text-center py-2">
                      … y {detail.chunks.length - 10} chunks más
                    </li>
                  ) : null}
                </ul>
              </DetailSection>
            ) : null}
          </>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title} description={confirm?.description}
        onConfirm={confirm?.onConfirm} variant={confirm?.variant} />
    </div>
  );
}

function KBDocEditor({ doc, onClose, onSave, canAuthorize }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (doc) setForm({ ...EMPTY, ...doc });
  }, [doc]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k, val) => {
    const cur = form[k] || [];
    set(k, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);
  };

  const submit = () => {
    if (!form.title.trim() || !form.content.trim()) return toast.error("Título y contenido son obligatorios");
    const p = { ...form };
    ["__new", "id", "created_at", "updated_at", "created_by", "deleted_at", "chunks", "chunks_count", "usage_count"].forEach(k => delete p[k]);
    onSave(p);
  };

  return (
    <Sheet open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[640px] p-0 border-0 shadow-2xl" style={{ background: "var(--a-surface)", color: "var(--a-text)" }}>
        <SheetHeader className="px-6 py-4 border-b admin-border flex-row items-center justify-between">
          <SheetTitle className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
            {doc?.__new ? "Agregar documento a la biblioteca" : "Editar documento"}
          </SheetTitle>
          <SheetDescription className="sr-only">Editor de documento</SheetDescription>
          <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={onClose}><X size={15} /></button>
        </SheetHeader>
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-134px)]">
          <F label="Título"><input className="admin-input" value={form.title} onChange={(e) => set("title", e.target.value)} data-testid="admin-kb-title" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Tipo">
              <select className="admin-select" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
                {KINDS.map(k => <option key={k}>{k}</option>)}
              </select>
            </F>
            <F label="Estado">
              <select className="admin-select" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </F>
          </div>
          <F label="Resumen (opcional)"><textarea className="admin-textarea" rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} /></F>
          <F label="Archivos como contexto">
            <KBFileUploader
              hasContent={!!form.content?.trim()}
              onExtracted={(text, mode, uploadedFiles) => {
                if (mode === "replace" || !form.content?.trim()) {
                  set("content", text);
                } else {
                  set("content", `${form.content.trimEnd()}\n\n${text}`);
                }
                // Persistir referencias de los archivos originales
                const refs = (uploadedFiles || []).map((f) => ({
                  name: f.name,
                  extension: f.extension,
                  size_bytes: f.size_bytes,
                  size_label: f.size_label,
                  chars: f.chars,
                  language: f.language,
                  storage_path: f.storage_path,
                  uploaded_at: f.uploaded_at,
                })).filter((f) => f.storage_path); // solo los que se persistieron
                if (refs.length) {
                  const existing = form.original_files || [];
                  set("original_files", mode === "replace" ? refs : [...existing, ...refs]);
                }
                // Idioma del documento: usar el del primer archivo detectado
                if (!form.language) {
                  const firstLang = (uploadedFiles || []).find((f) => f.language)?.language;
                  if (firstLang) set("language", firstLang);
                }
              }}
            />
            <OriginalFilesList
              files={form.original_files || []}
              onRemove={(idx) => set("original_files", (form.original_files || []).filter((_, i) => i !== idx))}
            />
          </F>
          <F label="Contenido completo">
            <textarea className="admin-textarea" rows={14} value={form.content}
              onChange={(e) => set("content", e.target.value)} placeholder="Pega aquí el texto completo. Se fragmentará automáticamente en chunks para el motor." data-testid="admin-kb-content" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Autor"><input className="admin-input" value={form.author || ""} onChange={(e) => set("author", e.target.value)} /></F>
            <F label="URL fuente"><input className="admin-input" value={form.source_url || ""} onChange={(e) => set("source_url", e.target.value)} /></F>
          </div>
          <F label="Categoría"><input className="admin-input" value={form.category || ""} onChange={(e) => set("category", e.target.value)} /></F>
          <F label="Objetivos aplicables">
            <div className="flex flex-wrap gap-1.5">
              {GOALS.map(g => {
                const on = (form.goal_keys || []).includes(g.key);
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => toggleArr("goal_keys", g.key)}
                    className={`admin-chip cursor-pointer ${on ? "admin-chip-accent" : ""}`}
                    style={on ? { background: "color-mix(in oklab, var(--a-accent) 15%, transparent)" } : {}}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </F>
          {canAuthorize ? (
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={form.is_authoritative} onChange={(e) => set("is_authoritative", e.target.checked)} className="accent-current" />
              <span style={{ color: "var(--a-text)" }}>Marcar como fuente autoritativa</span>
              <span className="text-[11px] admin-text-faint ml-1">(prioriza en las recomendaciones)</span>
            </label>
          ) : null}
        </div>
        <div className="px-6 py-4 border-t admin-border flex justify-end gap-2" style={{ background: "var(--a-surface-2)" }}>
          <button className="admin-btn admin-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-accent" onClick={submit} data-testid="admin-kb-save"><FloppyDisk size={13} /> Guardar</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function F({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.1em] admin-text-faint font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function OriginalFilesList({ files, onRemove }) {
  if (!files || files.length === 0) return null;

  const download = async (path, name) => {
    try {
      const token = localStorage.getItem("cultora_token");
      const API = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(
        `${API}/api/admin/motor/kb/files/download?path=${encodeURIComponent(path)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        toast.error("No se pudo descargar el archivo");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name || path.split("/").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Error al descargar");
    }
  };

  return (
    <div
      className="mt-2 rounded-md overflow-hidden"
      style={{ border: "1px solid var(--a-border)", background: "var(--a-surface-2)" }}
      data-testid="kb-original-files"
    >
      <div className="px-3 py-2 text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium border-b admin-border">
        Archivos originales guardados ({files.length})
      </div>
      <ul className="divide-y admin-border">
        {files.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5 px-3 py-2 text-[12px]">
            <div
              className="w-6 h-6 rounded flex items-center justify-center shrink-0"
              style={{ background: "var(--a-surface)" }}
            >
              <FileText size={11} style={{ color: "var(--a-text-muted)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate" style={{ color: "var(--a-text)" }} title={f.name}>
                  {f.name}
                </span>
                {f.language ? (
                  <span
                    className="admin-chip text-[9.5px] shrink-0"
                    title={`${f.language.label} · ${Math.round((f.language.confidence || 0) * 100)}%`}
                  >
                    {f.language.flag} {f.language.code}
                  </span>
                ) : null}
              </div>
              <div className="text-[10.5px] admin-text-muted">
                {f.size_label || ""}
                {f.chars ? ` · ${f.chars.toLocaleString()} caracteres` : ""}
              </div>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-ghost text-[11px] h-7"
              onClick={() => download(f.storage_path, f.name)}
              data-testid={`kb-original-download-${i}`}
              title="Descargar original"
            >
              Descargar
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-icon admin-btn-ghost h-7 w-7"
              onClick={() => onRemove(i)}
              title="Quitar referencia"
              data-testid={`kb-original-remove-${i}`}
            >
              <X size={11} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
