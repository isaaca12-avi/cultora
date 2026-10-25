import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { AdminPageHeader, MetricCard, AdminSection } from "@/components/admin/AdminUI";
import { Users, UsersFour, ChatsCircle, Megaphone, Warning } from "@phosphor-icons/react";

export default function AdminAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => { adminApi.analytics().then(setData).catch(() => setData(null)); }, []);

  const real = data?.real || {};
  const series = data?.sample_series || [];
  const maxUsers = Math.max(1, ...series.map(s => s.users || 0));

  return (
    <div data-testid="admin-analytics">
      <AdminPageHeader
        title="Analíticas"
        description="Métricas reales de la plataforma. Las series históricas incluyen datos de ejemplo hasta que existan datos suficientes."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Usuarios" value={real.users_total ?? "—"} icon={Users} />
        <MetricCard label="Agentes publicados" value={real.agents_published ?? "—"} icon={UsersFour} />
        <MetricCard label="Temas del foro" value={real.forum_topics ?? "—"} icon={ChatsCircle} />
        <MetricCard label="Convocatorias" value={real.convocatorias ?? "—"} icon={Megaphone} />
      </div>

      {data ? (
        <AdminSection
          title="Crecimiento de usuarios"
          description="Barras: usuarios registrados por mes."
        >
          <div className="admin-chip admin-chip-warn mb-5" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Warning size={11} weight="fill" />
            {data.sample_disclaimer}
          </div>
          <div className="grid grid-cols-6 gap-3 items-end h-40">
            {series.map((s) => {
              const h = Math.round(((s.users || 0) / maxUsers) * 100);
              return (
                <div key={s.month} className="flex flex-col items-center gap-2">
                  <div className="w-full flex items-end h-32">
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{ height: `${h}%`, background: "var(--a-accent)", opacity: 0.85 }}
                      title={`${s.users} usuarios`}
                    />
                  </div>
                  <div className="text-[10.5px] admin-text-muted">{s.month.slice(5)}/{s.month.slice(2,4)}</div>
                  <div className="text-[11.5px] font-semibold" style={{ color: "var(--a-text)" }}>{s.users ?? "—"}</div>
                </div>
              );
            })}
          </div>
        </AdminSection>
      ) : null}

      <div className="mt-3 admin-card p-5">
        <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-3">Nota metodológica</div>
        <p className="text-sm admin-text-muted leading-relaxed">
          Las series históricas mostradas incluyen puntos de ejemplo. Solo el último punto refleja el estado real actual.
          A medida que la plataforma acumule uso, los datos se reemplazarán automáticamente por métricas reales
          sin cambios en la interfaz.
        </p>
      </div>
    </div>
  );
}
