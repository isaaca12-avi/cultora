import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { AdminPageHeader, MetricCard, AdminSection } from "@/components/admin/AdminUI";
import AdminMotorStatusWidget from "@/components/admin/AdminMotorStatusWidget";
import {
  Users, UsersFour, ChatsCircle, Megaphone, Warning, ClockCounterClockwise,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { admin } = useAdmin();
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(() => setData(null));
  }, []);

  const m = data?.metrics || {};

  return (
    <div data-testid="admin-dashboard">
      <AdminPageHeader
        eyebrow={admin?.role_label}
        title={`Buen día, ${admin?.name?.split(" ")[0] || ""}.`}
        description="Vista general del estado de la plataforma. Todo en un mismo lugar."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Usuarios" value={m.users_total ?? "—"} hint={m.users_new_7d != null ? `+${m.users_new_7d} en 7 días` : null} icon={Users} testId="metric-users" />
        <MetricCard label="Activos 7d" value={m.users_active_7d ?? "—"} icon={Users} testId="metric-active" />
        <MetricCard label="Agentes publicados" value={m.agents_published ?? "—"} hint={m.agents_pending ? `${m.agents_pending} pendientes` : null} icon={UsersFour} testId="metric-agents" />
        <MetricCard label="Temas del foro" value={m.forum_topics ?? "—"} hint={`${m.forum_replies ?? 0} respuestas`} icon={ChatsCircle} testId="metric-forum" />
        <MetricCard label="Convocatorias activas" value={m.convocatorias_active ?? "—"} hint={m.convocatorias_draft ? `${m.convocatorias_draft} borradores` : null} icon={Megaphone} testId="metric-conv" />
        <MetricCard label="Reportes abiertos" value={m.forum_reports_open ?? 0} icon={Warning} testId="metric-reports" />
        <MetricCard label="Nuevos 7d" value={m.users_new_7d ?? 0} icon={Users} testId="metric-new" />
        <MetricCard label="Borradores conv." value={m.convocatorias_draft ?? 0} icon={Megaphone} testId="metric-draft" />
      </div>

      <AdminMotorStatusWidget />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <AdminSection
            title="Temas recientes del foro"
            description="Últimas discusiones creadas por la comunidad."
            actions={
              <Link to="/admin/foro" className="admin-btn admin-btn-ghost text-xs">Ver todo</Link>
            }
          >
            <ul className="divide-y admin-border">
              {(data?.recent_topics || []).length === 0 ? (
                <li className="text-sm admin-text-muted py-6">Sin actividad reciente.</li>
              ) : (
                data.recent_topics.map((t) => (
                  <li key={t.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium truncate" style={{ color: "var(--a-text)" }}>{t.title}</div>
                      <div className="text-[11.5px] admin-text-muted mt-0.5">
                        {t.author_name} · {t.category}
                      </div>
                    </div>
                    <div className="text-[11.5px] admin-text-faint whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("es")}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </AdminSection>
        </div>

        <AdminSection
          title="Actividad administrativa"
          description="Últimas acciones registradas."
          actions={
            <Link to="/admin/actividad" className="admin-btn admin-btn-ghost text-xs">
              Ver bitácora
            </Link>
          }
        >
          <ul className="space-y-2.5">
            {(data?.recent_activity || []).length === 0 ? (
              <li className="text-sm admin-text-muted py-4">Aún no hay registros.</li>
            ) : (
              data.recent_activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mt-0.5" style={{ background: "var(--a-surface-2)" }}>
                    <ClockCounterClockwise size={12} style={{ color: "var(--a-text-muted)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px]" style={{ color: "var(--a-text)" }}>
                      <span className="font-medium">{a.actor_name || "—"}</span>{" "}
                      <span className="admin-text-muted">{humanize(a.action)}</span>
                    </div>
                    <div className="text-[10.5px] admin-text-faint mt-0.5 uppercase tracking-wider">
                      {a.target_type} · {new Date(a.at).toLocaleString("es")}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </AdminSection>
      </div>
    </div>
  );
}

function humanize(action = "") {
  const map = {
    "user.role_changed": "cambió el rol de un usuario",
    "user.suspended": "suspendió a un usuario",
    "user.active": "reactivó a un usuario",
    "user.blocked": "bloqueó a un usuario",
    "agent.approved": "aprobó a un agente",
    "agent.hidden": "ocultó a un agente",
    "agent.suspended": "suspendió a un agente",
    "agent.pending": "solicitó corrección a un agente",
    "agent.verify": "verificó a un agente",
    "agent.unverify": "quitó verificación a un agente",
    "forum.topic_updated": "editó un tema del foro",
    "forum.topic_deleted": "eliminó un tema del foro",
    "convocatoria.created": "creó una convocatoria",
    "convocatoria.updated": "editó una convocatoria",
    "convocatoria.abierta": "publicó una convocatoria",
    "convocatoria.cerrada": "cerró una convocatoria",
    "convocatoria.archivada": "archivó una convocatoria",
    "convocatoria.duplicated": "duplicó una convocatoria",
    "resource.created": "creó un recurso",
    "resource.updated": "editó un recurso",
    "resource.deleted": "eliminó un recurso",
    "space.created": "creó un espacio",
    "space.updated": "editó un espacio",
    "space.deleted": "eliminó un espacio",
    "config.updated": "actualizó configuración",
  };
  return map[action] || action;
}
