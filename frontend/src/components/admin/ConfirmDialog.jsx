import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "default",
  loading = false,
}) {
  const confirmCls =
    variant === "danger" ? "admin-btn admin-btn-danger" :
    variant === "accent" ? "admin-btn admin-btn-accent" :
    "admin-btn admin-btn-primary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-0 shadow-2xl p-0 max-w-md"
        style={{ background: "var(--a-surface)", color: "var(--a-text)" }}
        data-testid="admin-confirm-dialog"
      >
        <div className="p-6">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-[17px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="admin-text-muted text-sm leading-relaxed">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
        </div>
        <DialogFooter className="p-4 border-t admin-border sm:justify-end gap-2" style={{ background: "var(--a-surface-2)" }}>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={() => onOpenChange(false)}
            data-testid="admin-confirm-cancel"
          >
            {cancelLabel}
          </button>
          <button
            className={confirmCls}
            onClick={onConfirm}
            disabled={loading}
            data-testid="admin-confirm-ok"
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
