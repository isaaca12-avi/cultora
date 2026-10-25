import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, UsersFour, Megaphone, ChatsCircle, Users, Check, X, DotOutline,
} from "@phosphor-icons/react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { adminApi } from "@/lib/admin-api";
import { toast } from "sonner";

const KIND_ICONS = {
  "agent.pending": UsersFour,
  "convocatoria.expiring": Megaphone,
  "forum.reported": ChatsCircle,
  "users.recent_registrations": Users,
};

const KIND_ACCENTS = {
  "agent.pending": "var(--a-accent)",
  "convocatoria.expiring": "var(--a-warn)",
  "forum.reported": "var(--a-danger)",
  "users.recent_registrations": "var(--a-text-muted)",
};

const POLL_MS = 45000;

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

export default function NotificationsBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all"); // all | unread
  const [data, setData] = useState(null);
  const timerRef = useRef();

  const load = useCallback(async (silent = false) => {
    try {
      const r = await adminApi.notifications.list({ unread_only: tab === "unread" });
      setData(r);
    } catch {
      if (!silent) setData({ items: [], unread: 0 });
    }
  }, [tab]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line
  }, [tab]);

  // Polling en background
  useEffect(() => {
    timerRef.current = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [load]);

  // Refresh cada vez que se abre el popover
  useEffect(() => {
    if (open) load(true);
    // eslint-disable-next-line
  }, [open]);

  const openItem = async (n) => {
    if (!n.is_read) {
      try { await adminApi.notifications.read(n.id); } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.url) nav(n.url);
    load(true);
  };

  const dismiss = async (e, n) => {
    e.stopPropagation();
    try {
      await adminApi.notifications.dismiss(n.id);
      load(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error");
    }
  };

  const markAllRead = async () => {
    try {
      const r = await adminApi.notifications.markAllRead();
      if (r.modified > 0) toast.success(`${r.modified} notificaciones marcadas como leídas`);
      load(true);
    } catch (err) { toast.error("Error"); }
  };

  const items = data?.items || [];
  const unread = data?.unread || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="admin-btn admin-btn-icon admin-btn-ghost relative"
          aria-label={`Notificaciones (${unread} sin leer)`}
          data-testid="admin-notifications-bell"
        >
          <Bell size={15} weight={unread > 0 ? "fill" : "regular"} />
          {unread > 0 ? (
            <span
              className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full text-[9.5px] font-semibold"
              style={{ background: "var(--a-accent)", color: "var(--a-accent-fg)", lineHeight: 1 }}
              data-testid="admin-notifications-badge"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 shadow-2xl border-0"
        style={{
          background: "var(--a-surface)",
          border: "1px solid var(--a-border)",
          color: "var(--a-text)",
          width: 380,
        }}
        data-testid="admin-notifications-popover"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b admin-border">
          <div className="text-[14px] font-semibold" style={{ color: "var(--a-text)" }}>
            Notificaciones
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`text-[11.5px] px-2 py-1 rounded-md transition-colors ${tab === "all" ? "font-semibold" : "admin-text-muted"}`}
              style={{ background: tab === "all" ? "var(--a-surface-2)" : "transparent" }}
              onClick={() => setTab("all")}
              data-testid="notif-tab-all"
            >
              Todas
            </button>
            <button
              className={`text-[11.5px] px-2 py-1 rounded-md transition-colors ${tab === "unread" ? "font-semibold" : "admin-text-muted"}`}
              style={{ background: tab === "unread" ? "var(--a-surface-2)" : "transparent" }}
              onClick={() => setTab("unread")}
              data-testid="notif-tab-unread"
            >
              No leídas {unread > 0 ? `· ${unread}` : ""}
            </button>
          </div>
        </div>

        <div className="max-h-[440px] overflow-y-auto" data-testid="admin-notifications-list">
          {data === null ? (
            <div className="p-6 text-center text-sm admin-text-muted">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
                <Bell size={18} style={{ color: "var(--a-text-muted)" }} />
              </div>
              <div className="text-[13px] font-medium" style={{ color: "var(--a-text)" }}>
                {tab === "unread" ? "Sin notificaciones sin leer" : "Sin notificaciones"}
              </div>
              <div className="text-[11.5px] admin-text-muted mt-1">Te avisaremos cuando algo requiera tu atención.</div>
            </div>
          ) : (
            <ul className="divide-y admin-border">
              {items.map((n) => {
                const Icon = KIND_ICONS[n.kind] || Bell;
                const color = KIND_ACCENTS[n.kind] || "var(--a-text-muted)";
                return (
                  <li
                    key={n.id}
                    onClick={() => openItem(n)}
                    className="group px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors relative"
                    style={{ background: n.is_read ? "transparent" : "color-mix(in oklab, var(--a-accent) 5%, transparent)" }}
                    data-testid={`notif-item-${n.id}`}
                  >
                    {!n.is_read ? (
                      <DotOutline size={16} weight="fill" style={{ color: "var(--a-accent)", position: "absolute", left: 4, top: 12 }} />
                    ) : null}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-3"
                      style={{ background: "var(--a-surface-2)" }}
                    >
                      <Icon size={14} weight="regular" style={{ color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] leading-snug" style={{ color: "var(--a-text)", fontWeight: n.is_read ? 400 : 500 }}>
                        {n.title}
                      </div>
                      {n.subtitle ? (
                        <div className="text-[11.5px] admin-text-muted mt-0.5 line-clamp-2">{n.subtitle}</div>
                      ) : null}
                      <div className="text-[10.5px] admin-text-faint mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                    <button
                      onClick={(e) => dismiss(e, n)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                      aria-label="Descartar"
                      data-testid={`notif-dismiss-${n.id}`}
                    >
                      <X size={11} weight="bold" style={{ color: "var(--a-text-faint)" }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && unread > 0 ? (
          <div
            className="flex items-center justify-between px-4 py-2.5 border-t admin-border"
            style={{ background: "var(--a-surface-2)" }}
          >
            <button
              onClick={markAllRead}
              className="text-[11.5px] flex items-center gap-1.5 admin-text-muted hover:opacity-80"
              data-testid="notif-mark-all-read"
            >
              <Check size={11} weight="bold" /> Marcar todas como leídas
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
