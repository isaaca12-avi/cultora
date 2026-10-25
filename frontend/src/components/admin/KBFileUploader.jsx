import React, { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-api";
import {
  Paperclip, FilePdf, FileDoc, FileTxt, FileText,
  X, CircleNotch, CheckCircle, WarningCircle, Plus,
} from "@phosphor-icons/react";

const ACCEPT = ".pdf,.docx,.txt,.md,.markdown";
const ACCEPT_MIMES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
  "text/markdown": ".md",
};

/**
 * Zona de upload multi-archivo para la biblioteca del motor.
 * Extrae texto en el backend (PDF/DOCX/TXT/MD) y ofrece anexar o reemplazar el contenido.
 */
export default function KBFileUploader({ onExtracted, hasContent, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batch, setBatch] = useState(null); // resultado del último lote
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    async (rawFiles) => {
      const arr = Array.from(rawFiles || []);
      if (arr.length === 0) return;
      if (arr.length > 5) {
        toast.error("Máximo 5 archivos por lote");
        return;
      }
      setUploading(true);
      try {
        const res = await adminApi.motor.kb.extractFiles(arr);
        setBatch(res);
        const s = res.stats || {};
        if (s.successful > 0 && s.failed === 0) {
          toast.success(`${s.successful} archivo${s.successful > 1 ? "s" : ""} procesado${s.successful > 1 ? "s" : ""} · ${s.total_chars.toLocaleString()} caracteres`);
        } else if (s.successful > 0 && s.failed > 0) {
          toast.warning(`${s.successful} ok, ${s.failed} con error`);
        } else {
          toast.error("No se pudo extraer texto de los archivos");
        }
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Error al procesar archivos");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [],
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    handleFiles(e.dataTransfer.files);
  };

  const insert = (mode) => {
    if (!batch?.combined_text) return;
    // Solo pasamos archivos exitosos (con storage y sin error)
    const successful = (batch.files || []).filter((f) => !f.error);
    onExtracted?.(batch.combined_text, mode, successful);
    setBatch(null);
    toast.success(mode === "append" ? "Texto anexado al contenido" : "Contenido reemplazado");
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`relative rounded-md border-2 border-dashed transition-colors cursor-pointer ${uploading ? "cursor-wait" : ""}`}
        style={{
          borderColor: dragOver ? "var(--a-accent)" : "var(--a-border)",
          background: dragOver
            ? "color-mix(in oklab, var(--a-accent) 8%, transparent)"
            : "var(--a-surface-2)",
          opacity: disabled ? 0.5 : 1,
        }}
        data-testid="kb-file-uploader"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          data-testid="kb-file-input"
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "var(--a-surface)" }}
          >
            {uploading ? (
              <CircleNotch size={16} className="animate-spin" style={{ color: "var(--a-text-muted)" }} />
            ) : (
              <Paperclip size={15} style={{ color: "var(--a-text-muted)" }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium" style={{ color: "var(--a-text)" }}>
              {uploading
                ? "Extrayendo texto…"
                : dragOver
                ? "Suelta los archivos aquí"
                : "Adjuntar archivos como contexto"}
            </div>
            <div className="text-[11px] admin-text-muted mt-0.5">
              PDF · DOCX · TXT · MD — hasta 5 archivos, 10 MB cada uno
            </div>
          </div>
          {!uploading ? (
            <button
              type="button"
              className="admin-btn admin-btn-ghost text-[11.5px] shrink-0"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              disabled={disabled}
            >
              <Plus size={11} className="mr-1" /> Elegir
            </button>
          ) : null}
        </div>
      </div>

      {batch ? (
        <div
          className="rounded-md overflow-hidden"
          style={{ border: "1px solid var(--a-border)", background: "var(--a-surface-2)" }}
          data-testid="kb-file-batch"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b admin-border">
            <div className="text-[11px] uppercase tracking-[0.14em] admin-text-faint font-medium">
              {batch.stats.successful}/{batch.stats.total} procesado{batch.stats.total !== 1 ? "s" : ""} · {batch.stats.total_chars.toLocaleString()} caracteres
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-icon admin-btn-ghost h-6 w-6"
              onClick={() => setBatch(null)}
              title="Descartar"
              data-testid="kb-file-batch-dismiss"
            >
              <X size={11} />
            </button>
          </div>
          <ul className="divide-y admin-border">
            {batch.files.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 px-3 py-2 text-[12px]">
                <FileIcon name={f.name} error={!!f.error} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate font-medium" style={{ color: "var(--a-text)" }} title={f.name}>
                      {f.name}
                    </span>
                    {f.language ? (
                      <span
                        className="admin-chip text-[10px] shrink-0"
                        title={`Idioma detectado: ${f.language.label} (${Math.round(f.language.confidence * 100)}%)`}
                        data-testid="kb-file-language"
                      >
                        <span className="mr-0.5">{f.language.flag}</span>
                        {f.language.code}
                      </span>
                    ) : null}
                    {f.storage_path ? (
                      <span
                        className="text-[10px] admin-text-faint shrink-0"
                        title="Original guardado en object storage"
                      >
                        · guardado
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10.5px] admin-text-muted flex items-center gap-2 mt-0.5">
                    <span>{f.size_label}</span>
                    {!f.error ? (
                      <>
                        <span>·</span>
                        <span>{f.chars.toLocaleString()} caracteres</span>
                      </>
                    ) : null}
                    {f.error ? (
                      <>
                        <span>·</span>
                        <span style={{ color: "var(--a-danger)" }} title={f.error}>{f.error}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                {f.error ? (
                  <WarningCircle size={13} weight="fill" style={{ color: "var(--a-danger)" }} />
                ) : (
                  <CheckCircle size={13} weight="fill" style={{ color: "var(--a-accent)" }} />
                )}
              </li>
            ))}
          </ul>
          {batch.combined_text ? (
            <div className="flex items-center justify-end gap-2 px-3 py-2 border-t admin-border">
              {hasContent ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost text-[12px]"
                  onClick={() => insert("replace")}
                  data-testid="kb-file-replace"
                >
                  Reemplazar contenido
                </button>
              ) : null}
              <button
                type="button"
                className="admin-btn admin-btn-accent text-[12px]"
                onClick={() => insert("append")}
                data-testid="kb-file-append"
              >
                {hasContent ? "Anexar al contenido" : "Usar como contenido"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- helpers ---------- */

function FileIcon({ name = "", error }) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const color = error ? "var(--a-danger)" : "var(--a-text-muted)";
  const Icon =
    ext === "pdf" ? FilePdf :
    ext === "docx" || ext === "doc" ? FileDoc :
    ext === "txt" ? FileTxt :
    FileText;
  return (
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
      style={{ background: "var(--a-surface)" }}
    >
      <Icon size={13} style={{ color }} />
    </div>
  );
}
