import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api";

type HealthPart = { status: "ok" | "error"; message: string };

type DashboardData = {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  freeStores: number;
  proStores: number;
  jobsLast24h: number;
  jobsLast7d: number;
  itemsProcessedLast7d: number;
  jobsByResource: { products: number; categories: number; brands: number };
  jobsByStatus: { pending: number; completed: number; failed: number };
  queueTotals: { waiting: number; active: number; failed: number; completed: number };
  health: {
    overall: "ok" | "degraded";
    database: HealthPart;
    redis: HealthPart;
    checkedAt: string;
  };
};

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function Donut({
  segments,
  size = 120,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = 40;
  const c = 2 * Math.PI * r;

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox="0 0 100 100" className="donut-svg">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
        {segments.map((seg) => {
          const len = (seg.value / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={seg.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 50 50)"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <ul className="donut-legend">
        {segments.map((seg) => (
          <li key={seg.label}>
            <span className="swatch" style={{ background: seg.color }} />
            {seg.label}{" "}
            <strong>{pct(seg.value, total)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminApi
      .dashboard()
      .then((res) => setData(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const checkedLabel = data?.health?.checkedAt
    ? new Date(data.health.checkedAt).toLocaleString()
    : "";

  const planTotal = (data?.freeStores || 0) + (data?.proStores || 0);
  const resourceSegs = data
    ? [
        { label: "Product", value: data.jobsByResource.products, color: "#10b981" },
        { label: "Category", value: data.jobsByResource.categories, color: "#3b82f6" },
        { label: "Brand", value: data.jobsByResource.brands, color: "#f59e0b" },
      ]
    : [];
  const statusSegs = data
    ? [
        { label: "Completed", value: data.jobsByStatus.completed, color: "#10b981" },
        { label: "Pending", value: data.jobsByStatus.pending, color: "#f59e0b" },
        { label: "Failed", value: data.jobsByStatus.failed, color: "#ef4444" },
      ]
    : [];

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Worker, queue, and optimization overview</p>
        </div>
        <button type="button" className="ghost" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {data?.health?.overall === "degraded" ? (
        <div className="health-banner warn">
          <div>
            <strong>Server Health Degraded</strong>
            <span> One or more services need attention — see details below.</span>
          </div>
          <div className="health-banner-meta">
            <span className="badge warn-badge">Degraded</span>
            <span className="muted tiny">{checkedLabel}</span>
          </div>
        </div>
      ) : data ? (
        <div className="health-banner ok">
          <div>
            <strong>All systems operational</strong>
            <span> Database and queues look healthy.</span>
          </div>
          <div className="health-banner-meta">
            <span className="badge ok">Healthy</span>
            <span className="muted tiny">{checkedLabel}</span>
          </div>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-icon purple">C</div>
              <div className="metric-label">Total Clients</div>
              <div className="metric-value">{data.totalStores}</div>
              <div className="metric-foot muted">
                {data.activeStores} active · {data.inactiveStores} uninstalled
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon blue">J</div>
              <div className="metric-label">Jobs (24h)</div>
              <div className="metric-value">{data.jobsLast24h}</div>
              <div className="metric-foot muted">{data.jobsLast7d} in last 7 days</div>
            </div>
            <div className="metric-card">
              <div className="metric-icon green">P</div>
              <div className="metric-label">Items processed (7d)</div>
              <div className="metric-value">{data.itemsProcessedLast7d}</div>
              <div className="metric-foot muted">Across bulk & related jobs</div>
            </div>
            <div className="metric-card">
              <div className="metric-icon orange">Q</div>
              <div className="metric-label">Queue active</div>
              <div className="metric-value">{data.queueTotals.active}</div>
              <div className="metric-foot muted">
                {data.queueTotals.waiting} waiting · {data.queueTotals.failed} failed
              </div>
            </div>
          </div>

          <div className="status-grid">
            <div className="status-tile">
              <span className="muted">Total clients</span>
              <strong>{data.totalStores}</strong>
            </div>
            <div className="status-tile">
              <span className="muted">Active stores</span>
              <strong>{data.activeStores}</strong>
            </div>
            <div className="status-tile">
              <span className="muted">Free plan</span>
              <strong>{data.freeStores}</strong>
            </div>
            <div className="status-tile">
              <span className="muted">Pro plan</span>
              <strong>{data.proStores}</strong>
            </div>
            <div className="status-tile">
              <span className="muted">Redis</span>
              <span className={`badge ${data.health.redis.status === "ok" ? "ok" : "off"}`}>
                {data.health.redis.status === "ok" ? "Ok" : "Error"}
              </span>
            </div>
            <div className="status-tile">
              <span className="muted">Database</span>
              <span className={`badge ${data.health.database.status === "ok" ? "ok" : "off"}`}>
                {data.health.database.status === "ok" ? "Ok" : "Error"}
              </span>
            </div>
            <div className="status-tile">
              <span className="muted">Waiting jobs</span>
              <strong>{data.queueTotals.waiting}</strong>
            </div>
            <div className="status-tile">
              <span className="muted">Failed jobs</span>
              <strong>{data.queueTotals.failed}</strong>
            </div>
          </div>

          <div className="dash-row">
            <div className="panel chart-panel">
              <h3 className="panel-title">Plan mix</h3>
              <p className="muted tiny">Free vs Pro installs</p>
              <div className="bar-track">
                <div
                  className="bar-fill green"
                  style={{ width: `${pct(data.freeStores, planTotal)}%` }}
                  title="Free"
                />
                <div
                  className="bar-fill blue"
                  style={{ width: `${pct(data.proStores, planTotal)}%` }}
                  title="Pro"
                />
              </div>
              <div className="bar-legend">
                <span>
                  <i className="dot green" /> Free {data.freeStores} ({pct(data.freeStores, planTotal)}%)
                </span>
                <span>
                  <i className="dot blue" /> Pro {data.proStores} ({pct(data.proStores, planTotal)}%)
                </span>
              </div>
            </div>

            <div className="panel chart-panel">
              <h3 className="panel-title">Jobs by status (7d)</h3>
              <Donut segments={statusSegs} />
            </div>

            <div className="panel chart-panel">
              <h3 className="panel-title">Optimization by type (7d)</h3>
              <Donut segments={resourceSegs} />
            </div>
          </div>

          <div className="dash-row two">
            <div className="panel">
              <h3 className="panel-title">Service health</h3>
              <div className="health-list">
                <div className="health-row">
                  <div>
                    <strong>MongoDB</strong>
                    <div className="muted tiny">{data.health.database.message}</div>
                  </div>
                  <span className={`badge ${data.health.database.status === "ok" ? "ok" : "off"}`}>
                    {data.health.database.status === "ok" ? "Connected" : "Error"}
                  </span>
                </div>
                <div className="health-row">
                  <div>
                    <strong>Redis</strong>
                    <div className="muted tiny">{data.health.redis.message}</div>
                  </div>
                  <span className={`badge ${data.health.redis.status === "ok" ? "ok" : "off"}`}>
                    {data.health.redis.status === "ok" ? "Connected" : "Error"}
                  </span>
                </div>
              </div>
            </div>

            <div className="panel">
              <h3 className="panel-title">Queue snapshot</h3>
              <div className="queue-bars">
                {(
                  [
                    ["Waiting", data.queueTotals.waiting, "#3b82f6"],
                    ["Active", data.queueTotals.active, "#10b981"],
                    ["Failed", data.queueTotals.failed, "#ef4444"],
                    ["Completed", data.queueTotals.completed, "#8b5cf6"],
                  ] as const
                ).map(([label, value, color]) => {
                  const max = Math.max(
                    data.queueTotals.waiting,
                    data.queueTotals.active,
                    data.queueTotals.failed,
                    data.queueTotals.completed,
                    1,
                  );
                  return (
                    <div className="queue-bar-row" key={label}>
                      <span className="muted">{label}</span>
                      <div className="queue-bar-track">
                        <div
                          className="queue-bar-fill"
                          style={{ width: `${(value / max) * 100}%`, background: color }}
                        />
                      </div>
                      <strong>{value}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : !error ? (
        <p className="muted">Loading…</p>
      ) : null}
    </div>
  );
}
