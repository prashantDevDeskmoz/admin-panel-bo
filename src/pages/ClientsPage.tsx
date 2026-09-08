import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api";

type Client = {
  _id: string;
  store_hash: string;
  store_name: string | null;
  email: string | null;
  plan: string;
  installStatus: string;
  last_access_url: string | null;
  last_access_at: string;
  jobStats?: { jobs: number; failed: number; processed: number };
};

type Summary = {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  freePlan: number;
  paidPlan: number;
  proPrice: number;
  estimatedMonthlyRevenue: number;
  byPlan: { free: number; pro: number };
};

function money(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const limit = 20;

  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      setSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminApi
      .clients({ page, limit, search, status, plan })
      .then((res) => {
        setClients(res.data || []);
        setTotal(res.total || 0);
        setSummary(res.summary || null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [page, search, status, plan]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const planMax = Math.max(summary?.byPlan.free || 0, summary?.byPlan.pro || 0, 1);

  return (
    <div className="clients-page">
      <div className="dash-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-sub">Installed stores · plans and activity</p>
        </div>
        <button type="button" className="ghost" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {summary ? (
        <div className="metric-grid clients-metrics">
          <div className="metric-card compact">
            <div className="metric-label">Total clients</div>
            <div className="metric-value">{summary.totalClients}</div>
          </div>
          <div className="metric-card compact">
            <div className="metric-label">Active</div>
            <div className="metric-value">{summary.activeClients}</div>
            <div className="metric-foot muted">{summary.inactiveClients} uninstalled</div>
          </div>
          <div className="metric-card compact">
            <div className="metric-label">Paid plan</div>
            <div className="metric-value">{summary.paidPlan}</div>
            <div className="metric-foot muted">{summary.freePlan} on free</div>
          </div>
          <div className="metric-card compact">
            <div className="metric-label">Est. monthly revenue</div>
            <div className="metric-value">{money(summary.estimatedMonthlyRevenue)}</div>
            <div className="metric-foot muted">
              {summary.paidPlan} × {money(summary.proPrice)} Pro
            </div>
          </div>
        </div>
      ) : null}

      <div className="clients-filter-row">
        <div className="panel filters-panel">
          <div className="filter-field">
            <label className="muted tiny">Search</label>
            <input
              placeholder="Store name, hash, email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label className="muted tiny">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="all">All</option>
              <option value="active">Installed</option>
              <option value="inactive">Uninstalled</option>
            </select>
          </div>
          <div className="filter-field">
            <label className="muted tiny">Plan</label>
            <select
              value={plan}
              onChange={(e) => {
                setPage(1);
                setPlan(e.target.value);
              }}
            >
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>

        <div className="panel plan-chart-panel">
          <h3 className="panel-title">Clients by plan</h3>
          {summary ? (
            <div className="plan-bars">
              {(
                [
                  ["free", summary.byPlan.free, "#10b981"],
                  ["pro", summary.byPlan.pro, "#3b82f6"],
                ] as const
              ).map(([name, value, color]) => (
                <div className="plan-bar-col" key={name}>
                  <div className="plan-bar-track-v">
                    <div
                      className="plan-bar-fill-v"
                      style={{ height: `${(value / planMax) * 100}%`, background: color }}
                    />
                  </div>
                  <div className="plan-bar-label">{name}</div>
                  <div className="plan-bar-count">{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Loading…</p>
          )}
        </div>
      </div>

      <div className="panel">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Jobs</th>
              <th>Processed</th>
              <th>Last active</th>
              <th>Last access</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c._id}>
                <td>
                  <div className="store-name">{c.store_name || "—"}</div>
                  <div className="mono muted tiny">{c.store_hash}</div>
                  {c.email ? <div className="muted tiny">{c.email}</div> : null}
                </td>
                <td>
                  <span className={`badge plan-badge ${c.plan === "pro" ? "plan-pro" : "plan-free"}`}>
                    {c.plan === "pro" ? "Pro" : "Free"}
                  </span>
                </td>
                <td>
                  <span className={`badge ${c.installStatus === "installed" ? "ok" : "off"}`}>
                    {c.installStatus === "installed" ? "Active" : "Uninstalled"}
                  </span>
                </td>
                <td>
                  <div>{c.jobStats?.jobs ?? 0}</div>
                  {(c.jobStats?.failed ?? 0) > 0 ? (
                    <div className="fail-text tiny">{c.jobStats?.failed} failed</div>
                  ) : null}
                </td>
                <td>{c.jobStats?.processed ?? 0}</td>
                <td className="muted tiny">
                  {c.last_access_at ? new Date(c.last_access_at).toLocaleString() : "—"}
                </td>
                <td>
                  {c.last_access_url ? (
                    <a
                      className="details-link"
                      href={c.last_access_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <Link className="details-link" to={`/clients/${c._id}`}>
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clients.length ? <p className="muted">No clients found</p> : null}
      </div>

      <div className="toolbar" style={{ marginTop: 14, justifyContent: "space-between" }}>
        <span className="muted">
          Page {page} of {totalPages} · {total} total
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
