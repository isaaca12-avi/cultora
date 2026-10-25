import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/lib/admin-api";
import { useAdmin } from "@/lib/admin-context";
import { AdminSection } from "./AdminUI";
import {
  Brain, BookOpen, Robot, TestTube, Warning, Info,
  ArrowRight, CheckCircle, Sparkle, ArrowClockwise,
} from "@phosphor-icons/react";

/**
 * Widget compacto que resume la salud del motor de decisión.
 * Se muestra en el AdminDashboard solo si el usuario tiene algún permiso de motor.
 */
export default function AdminMotorStatusWidget() {
  const { hasAny } = useAdmin();
  const visible = hasAny(["engine.kb.view", "engine.rules.view", "engine.simulate"]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadedAt, setReloadedAt] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi.motor
      .status()
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setReloadedAt(new Date());
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.detail || "No disponible");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!visible) return;
    return load();
  }, [visible, load]);

  if (!visible) return null;

  const health = data?.health;
  const kb = data?.kb || {};
  const rules = data?.rules || {};
  const activity = data?.activity || {};
  const alerts = data?.alerts || [];

  return (
    <AdminSection
      title="Estado del motor de decisión"
      description="Salud de la biblioteca, reglas, actividad reciente y alertas."
      actions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="admin-btn admin-btn-ghost text-xs disabled:opacity-50"
            title={reloadedAt ? `Actualizado ${formatWhen(reloadedAt.toISOString())}` : "Actualizar"}
            data-testid="motor-widget-refresh"
          >
            <ArrowClockwise size={11} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            to="/admin/motor"
            className="admin-btn admin-btn-ghost text-xs"
            data-testid="motor-widget-open"
          >
            Abrir motor <ArrowRight size={11} className="ml-1" />
          </Link>
        </div>
      }
      className="mb-3"
    >
      <div data-testid="admin-motor-status-widget">
        {error ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-8 text-center"
            data-testid="motor-widget-error"
          >
            <Warning size={20} weight="fill" style={{ color: "var(--a-danger)" }} />
            <div className="text-[13px]" style={{ color: "var(--a-text)" }}>
              No se pudo cargar el estado del motor
            </div>
            <div className="text-[11.5px] admin-text-muted">{error}</div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="admin-btn admin-btn-ghost text-[12px] mt-1 disabled:opacity-50"
              data-testid="motor-widget-retry"
            >
              <ArrowClockwise size={11} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
              Reintentar
            </button>
          </div>
        ) : !data ? (
          <div className="text-sm admin-text-muted py-6">Cargando…</div>
        ) : (
          <>
            {/* Header con health score */}
            <div
              className="flex items-center gap-4 p-4 rounded-lg mb-4"
              style={{ background: "var(--a-surface-2)", border: "1px solid var(--a-border)" }}
              data-testid="motor-widget-health"
            >
              <div className="relative w-14 h-14 shrink-0">
                <HealthRing score={health?.score ?? 0} tone={health?.tone} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Brain size={13} style={{ color: "var(--a-text-muted)" }} />
                  <span className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium">
                    Salud del motor
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--a-text)" }}>
                    {health?.label || "—"}
                  </div>
                  <div className="text-[13px] admin-text-muted">
                    {health?.score ?? 0}/100
                  </div>
                </div>
                <div className="text-[11.5px] admin-text-muted mt-0.5">
                  Basado en biblioteca, cobertura por objetivo, reglas y actividad reciente.
                </div>
              </div>
            </div>

            {/* Mini metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
              <MiniStat
                icon={BookOpen}
                label="Docs publicados"
                value={kb.documents_published ?? 0}
                hint={kb.documents_draft ? `${kb.documents_draft} en borrador` : `${kb.documents_total || 0} en total`}
                to="/admin/motor/biblioteca"
                testId="motor-widget-docs"
              />
              <MiniStat
                icon={Sparkle}
                label="Autoritativos"
                value={kb.documents_authoritative ?? 0}
                hint={`${kb.chunks_indexed || 0} chunks indexados`}
                to="/admin/motor/biblioteca?filter=authoritative"
                testId="motor-widget-auth"
              />
              <MiniStat
                icon={Robot}
                label="Reglas activas"
                value={rules.total_active ?? 0}
                hint={rules.custom
                  ? `${rules.custom} personalizadas`
                  : "todas por defecto"
                }
                to="/admin/motor/reglas"
                testId="motor-widget-rules"
              />
              <MiniStat
                icon={TestTube}
                label="Simulaciones 7d"
                value={activity.simulations_7d ?? 0}
                hint={activity.last_simulation
                  ? `Última: ${formatWhen(activity.last_simulation.at)}`
                  : "Aún sin usar"
                }
                to="/admin/motor/simulador"
                testId="motor-widget-sims"
              />
            </div>

            {/* Cobertura por objetivo */}
            {rules.by_goal?.length ? (
              <div className="mb-4" data-testid="motor-widget-coverage">
                <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-2">
                  Cobertura por objetivo
                </div>
                <div className="space-y-1.5">
                  {rules.by_goal.map((g) => (
                    <div
                      key={g.goal_key}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-md"
                      style={{ background: "var(--a-surface-2)" }}
                    >
                      <div className="text-[12.5px] flex-1 min-w-0 truncate" style={{ color: "var(--a-text)" }}>
                        {g.goal_title}
                      </div>
                      <div className="flex items-center gap-3 text-[11.5px] admin-text-muted shrink-0">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={11} />
                          <span className={g.docs_published === 0 ? "" : ""} style={{
                            color: g.docs_published === 0 ? "var(--a-danger)" : "var(--a-text-muted)"
                          }}>
                            {g.docs_published} docs
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Robot size={11} />
                          {g.active} reglas
                          {g.source === "system" ? (
                            <span
                              className="admin-chip text-[9.5px] ml-0.5"
                              title="Usando reglas del sistema (no personalizadas)"
                            >
                              default
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Alertas */}
            {alerts.length > 0 ? (
              <div data-testid="motor-widget-alerts">
                <div className="text-[10.5px] uppercase tracking-[0.14em] admin-text-faint font-medium mb-2">
                  Recomendaciones ({alerts.length})
                </div>
                <div className="space-y-1.5">
                  {alerts.slice(0, 4).map((a, i) => (
                    <AlertRow key={i} alert={a} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--a-success, #2f855a)" }}>
                <CheckCircle size={14} weight="fill" />
                Motor en buen estado. Sin recomendaciones pendientes.
              </div>
            )}
          </>
        )}
      </div>
    </AdminSection>
  );
}

/* ---------- helpers ---------- */

function HealthRing({ score = 0, tone = "warning" }) {
  const pct = Math.max(0, Math.min(100, score));
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color =
    tone === "success" ? "var(--a-accent)" :
    tone === "warning" ? "#d97706" :
    tone === "danger" ? "var(--a-danger)" : "var(--a-accent)";
  return (
    <svg width={size} height={size} className="block">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--a-border)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 700ms ease" }}
      />
      <text
        x="50%" y="52%"
        dominantBaseline="middle" textAnchor="middle"
        fontSize="13" fontWeight="600"
        fill="var(--a-text)"
      >
        {pct}
      </text>
    </svg>
  );
}

function MiniStat({ icon: Icon, label, value, hint, to, testId }) {
  const inner = (
    <div
      className="p-3 rounded-lg h-full"
      style={{ background: "var(--a-surface-2)", border: "1px solid var(--a-border)" }}
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} style={{ color: "var(--a-text-muted)" }} />
        <span className="text-[10px] uppercase tracking-[0.12em] admin-text-faint font-medium">
          {label}
        </span>
      </div>
      <div className="text-[20px] font-semibold tracking-tight leading-none" style={{ color: "var(--a-text)" }}>
        {value}
      </div>
      {hint ? (
        <div className="text-[10.5px] admin-text-muted mt-1.5 truncate">
          {hint}
        </div>
      ) : null}
    </div>
  );
  if (!to) return inner;
  return (
    <Link to={to} className="block hover:opacity-90 transition-opacity">
      {inner}
    </Link>
  );
}

function AlertRow({ alert }) {
  const level = alert.level || "info";
  const tone = {
    critical: { color: "var(--a-danger)", Icon: Warning },
    warning: { color: "#d97706", Icon: Warning },
    info: { color: "var(--a-text-muted)", Icon: Info },
  }[level] || { color: "var(--a-text-muted)", Icon: Info };
  const Icon = tone.Icon;
  return (
    <div
      className="flex items-start gap-2.5 py-2 px-2.5 rounded-md"
      style={{ background: "var(--a-surface-2)" }}
    >
      <Icon size={13} weight="fill" style={{ color: tone.color, marginTop: 2 }} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] leading-relaxed" style={{ color: "var(--a-text)" }}>
          {alert.message}
        </div>
      </div>
      {alert.cta_url ? (
        <Link
          to={alert.cta_url}
          className="admin-btn admin-btn-ghost text-[11px] h-7 shrink-0"
        >
          {alert.cta_label || "Ir"}
        </Link>
      ) : null}
    </div>
  );
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "hace instantes";
    if (diff < 3600) return `hace ${Math.round(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.round(diff / 3600)}h`;
    if (diff < 604800) return `hace ${Math.round(diff / 86400)}d`;
    return d.toLocaleDateString("es");
  } catch {
    return iso;
  }
}
