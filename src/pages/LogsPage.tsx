import { useEffect, useState } from "react";
import { adminApi } from "../api";

type LogEntry = {
  time: string;
  message: string;
  type: "request" | "job" | "system";
  level: "warning" | "error";
  storeHash?: string;
  method?: string;
  url?: string;
  status?: number;
  responseMessage?: string;
  queue?: string;
  error?: unknown;
  [key: string]: unknown;
};

const TYPE_LABELS: Record<LogEntry["type"], string> = { request: "API request", job: "Job", system: "System" };

const describe = (log: LogEntry) => {
  if (log.type === "request") {
    return `${log.method} ${log.url} → ${log.status}${log.responseMessage ? ` · ${log.responseMessage}` : ""}`;
  }
  const error = typeof log.error === "string" ? log.error : JSON.stringify(log.error ?? "");
  return log.queue ? `${log.queue}: ${error}` : error || log.message;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [storeInput, setStoreInput] = useState("");
  const [storeHash, setStoreHash] = useState("");
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setStoreHash(storeInput.trim()), 400);
    return () => clearTimeout(id);
  }, [storeInput]);

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .logs({ date, type, level, storeHash })
      .then((res) => {
        setLogs(res.data || []);
        setDates(res.dates || []);
        if (!date && res.date) setDate(res.date);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load logs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [date, type, level, storeHash]);

  return (
    <div>
      <h1 className="page-title">Logs</h1>
      <p className="page-sub">Failed requests, failed jobs and server errors (last 7 days)</p>
      {error ? <div className="error">{error}</div> : null}
      <div className="toolbar">
        <button type="button" className="ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="panel filters-panel">
        <div className="filter-field">
          <label className="muted tiny">Date</label>
          <select value={date} onChange={(e) => setDate(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label className="muted tiny">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="request">API requests</option>
            <option value="job">Jobs</option>
            <option value="system">System</option>
          </select>
        </div>
        <div className="filter-field">
          <label className="muted tiny">Store hash</label>
          <input placeholder="e.g. nlrg4p9hic" value={storeInput} onChange={(e) => setStoreInput(e.target.value)} />
        </div>
        <div className="filter-field">
          <label className="muted tiny">Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Level</th>
              <th>Type</th>
              <th>Store</th>
              <th>Message</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={`${log.time}-${i}`}>
                <td className="mono">{new Date(log.time).toLocaleString()}</td>
                <td>
                  <span className={log.level === "error" ? "badge off" : "badge warn-badge"}>
                    {log.level === "error" ? "Error" : "Warning"}
                  </span>
                </td>
                <td>{TYPE_LABELS[log.type]}</td>
                <td className="mono">{log.storeHash || "—"}</td>
                <td className="log-message">{describe(log)}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => setSelected(log)}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && !logs.length ? <p className="muted">Loading…</p> : null}
        {!loading && !logs.length && !error ? <p className="muted">No logs for this filter.</p> : null}
      </div>

      {selected ? (
        <div className="modal-backdrop" onClick={() => setSelected(null)} role="presentation">
          <div
            className="modal-card log-details"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-details-title"
          >
            <h3 id="log-details-title" className="modal-title">
              Log details
            </h3>
            <pre>{JSON.stringify(selected, null, 2)}</pre>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
