import { useEffect, useState } from "react";
import { adminApi } from "../api";

type WorkerRow = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
};

export default function WorkersPage() {
  const [rows, setRows] = useState<WorkerRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi
      .workers()
      .then((res) => setRows(res.data || []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h1 className="page-title">Workers</h1>
      <p className="page-sub">BullMQ queue status (auto-refresh every 10s)</p>
      {error ? <div className="error">{error}</div> : null}
      <div className="toolbar">
        <button type="button" className="ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Queue</th>
              <th>Waiting</th>
              <th>Active</th>
              <th>Delayed</th>
              <th>Completed</th>
              <th>Failed</th>
              <th>Paused</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="mono">{r.name}</td>
                <td>{r.waiting}</td>
                <td>{r.active}</td>
                <td>{r.delayed}</td>
                <td>{r.completed}</td>
                <td>{r.failed}</td>
                <td>{r.paused}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !error ? <p className="muted">Loading…</p> : null}
      </div>
    </div>
  );
}
