import { useEffect, useState } from "react";
import { adminApi } from "../api";

type FailedJob = {
  id: string;
  storeHash?: string;
  failedReason?: string;
  attemptsMade?: number;
  finishedOn?: number;
};

type WorkerRow = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  workers?: number | null;
  recentFailed?: FailedJob[];
  error?: string;
};

const QUEUE_LABELS: Record<string, string> = {
  "bulk-optimized-products-v2": "Product optimization",
  "bulk-optimized-categories": "Category optimization",
  "bulk-optimized-brands": "Brand optimization",
  "bulk-optimized-images-v2": "Image alt text",
  "bulk-restore": "Restore",
  "bulk-restore-images": "Image restore",
  "webhook-cruise-control": "Cruise control (webhooks)",
};

const REFRESH_MS = 10000;

const getQueueState = (row: WorkerRow) => {
  if (row.error) return { label: "Unavailable", className: "badge off" };
  if (row.workers === 0) return { label: "No worker", className: "badge off" };
  if (row.active > 0) return { label: "Processing", className: "badge info-badge" };
  if (row.waiting + row.delayed > 0) return { label: "Queued", className: "badge warn-badge" };
  return { label: "Idle", className: "badge ok" };
};

export default function WorkersPage() {
  const [rows, setRows] = useState<WorkerRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .workers()
      .then((res) => {
        setRows(res.data || []);
        setError("");
        setUpdatedAt(new Date());
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (!autoRefresh) return;
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const totals = rows.reduce(
    (acc, r) => ({
      waiting: acc.waiting + r.waiting + r.delayed,
      active: acc.active + r.active,
      failed: acc.failed + r.failed,
      completed: acc.completed + r.completed,
    }),
    { waiting: 0, active: 0, failed: 0, completed: 0 },
  );
  const workerCounts = rows.map((r) => r.workers).filter((w): w is number => typeof w === "number");
  const workersKnown = workerCounts.length > 0;
  const queuesWithoutWorker = rows.filter((r) => r.workers === 0).length;
  const recentFailures = rows
    .flatMap((r) => (r.recentFailed || []).map((job) => ({ ...job, queue: r.name })))
    .sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0))
    .slice(0, 10);

  const healthy = !error && queuesWithoutWorker === 0;
  const healthMessage = error
    ? `Queues unavailable: ${error}`
    : queuesWithoutWorker > 0
      ? `${queuesWithoutWorker} queue(s) have no worker connected. Jobs will wait until the worker process (npm run workers) is running.`
      : "Redis connected and all queues have a worker attached.";

  return (
    <div>
      <div className="dash-header">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="page-sub">BullMQ queues, connected workers and recent failures</p>
        </div>
        <div className="toolbar">
          <label className="auto-refresh muted tiny">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh {REFRESH_MS / 1000}s
          </label>
          <button type="button" className="ghost" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {rows.length || error ? (
        <div className={healthy ? "health-banner ok" : "health-banner warn"}>
          <span>{healthMessage}</span>
          {updatedAt ? <span className="tiny">Updated {updatedAt.toLocaleTimeString()}</span> : null}
        </div>
      ) : null}

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon blue">A</div>
          <div className="metric-label">Active jobs</div>
          <div className="metric-value">{totals.active}</div>
          <div className="metric-foot muted">Running right now</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon orange">Q</div>
          <div className="metric-label">Waiting jobs</div>
          <div className="metric-value">{totals.waiting}</div>
          <div className="metric-foot muted">Waiting + delayed</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon purple">F</div>
          <div className="metric-label">Failed jobs</div>
          <div className="metric-value">{totals.failed}</div>
          <div className="metric-foot muted">Kept in Redis (latest only)</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green">W</div>
          <div className="metric-label">Worker connections</div>
          <div className="metric-value">{workersKnown ? workerCounts.reduce((a, b) => a + b, 0) : "—"}</div>
          <div className="metric-foot muted">Across {rows.length} queues</div>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Queues</h2>
        <p className="muted tiny">Completed and failed counts only include jobs BullMQ still keeps (recent ones).</p>
        <table>
          <thead>
            <tr>
              <th>Queue</th>
              <th>Status</th>
              <th>Workers</th>
              <th>Active</th>
              <th>Waiting</th>
              <th>Delayed</th>
              <th>Completed</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const state = getQueueState(r);
              return (
                <tr key={r.name}>
                  <td>
                    <div className="queue-name">{QUEUE_LABELS[r.name] || r.name}</div>
                    <div className="mono muted tiny">{r.name}</div>
                  </td>
                  <td>
                    <span className={state.className}>{state.label}</span>
                    {r.paused > 0 ? <span className="badge warn-badge queue-paused">Paused</span> : null}
                  </td>
                  <td>{r.workers ?? "—"}</td>
                  <td className={r.active ? "num-strong" : "muted"}>{r.active}</td>
                  <td className={r.waiting ? "num-strong" : "muted"}>{r.waiting}</td>
                  <td className={r.delayed ? "num-strong" : "muted"}>{r.delayed}</td>
                  <td className="muted">{r.completed}</td>
                  <td className={r.failed ? "num-danger" : "muted"}>{r.failed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && !rows.length ? <p className="muted">Loading…</p> : null}
      </div>

      <div className="panel workers-failures">
        <h2 className="panel-title">Recent failed jobs</h2>
        <p className="muted tiny">Latest failures across all queues</p>
        {recentFailures.length ? (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Queue</th>
                <th>Job</th>
                <th>Store</th>
                <th>Attempts</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {recentFailures.map((job) => (
                <tr key={`${job.queue}-${job.id}`}>
                  <td className="mono">{job.finishedOn ? new Date(job.finishedOn).toLocaleString() : "—"}</td>
                  <td>{QUEUE_LABELS[job.queue] || job.queue}</td>
                  <td className="mono">{job.id}</td>
                  <td className="mono">{job.storeHash || "—"}</td>
                  <td>{job.attemptsMade ?? "—"}</td>
                  <td className="failure-reason">{job.failedReason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">{loading && !rows.length ? "Loading…" : "No failed jobs. All good."}</p>
        )}
      </div>
    </div>
  );
}
