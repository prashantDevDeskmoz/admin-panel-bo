import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../api";

type ClientDetail = {
  _id: string;
  store_hash: string;
  store_name: string | null;
  store_domain: string | null;
  store_url: string | null;
  email: string | null;
  plan: string;
  access_token: string;
  scope: string;
  is_active: boolean;
  installStatus: string;
  installed_at: string | null;
  uninstalled_at: string | null;
  last_access_url: string | null;
  last_access_at: string;
  trialDaysRemaining: number | null;
  paypalSubscriptionId: string | null;
  planPurchasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminApi
      .client(id)
      .then((res) => setClient(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) {
    return (
      <div>
        <Link to="/clients">← Clients</Link>
        <div className="error" style={{ marginTop: 12 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!client) {
    return <p className="muted">Loading…</p>;
  }

  const rows: [string, string][] = [
    ["Store name", client.store_name || "—"],
    ["Store hash", client.store_hash],
    ["Email", client.email || "—"],
    ["Domain", client.store_domain || "—"],
    ["Plan", client.plan],
    ["Install status", client.installStatus],
    ["Installed at", client.installed_at ? new Date(client.installed_at).toLocaleString() : "—"],
    ["Uninstalled at", client.uninstalled_at ? new Date(client.uninstalled_at).toLocaleString() : "—"],
    ["Last access at", client.last_access_at ? new Date(client.last_access_at).toLocaleString() : "—"],
    ["Trial days remaining", client.trialDaysRemaining == null ? "—" : String(client.trialDaysRemaining)],
    ["PayPal subscription", client.paypalSubscriptionId || "—"],
    ["Plan purchased at", client.planPurchasedAt ? new Date(client.planPurchasedAt).toLocaleString() : "—"],
    ["Scope", client.scope || "—"],
    ["Created", new Date(client.createdAt).toLocaleString()],
    ["Updated", new Date(client.updatedAt).toLocaleString()],
  ];

  return (
    <div>
      <div className="toolbar">
        <Link to="/clients">← Clients</Link>
      </div>
      <h1 className="page-title">{client.store_name || client.store_hash}</h1>
      <p className="page-sub">Client details</p>

      <div className="panel">
        <div className="detail-grid">
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <div className="k">{k}</div>
              <div className={k === "Store hash" || k === "Scope" ? "mono" : undefined}>{v}</div>
            </div>
          ))}
          <div className="k">Last access URL</div>
          <div>
            {client.last_access_url ? (
              <a
                className="mono"
                href={client.last_access_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ wordBreak: "break-all" }}
              >
                {client.last_access_url}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div className="k">Access token</div>
          <div>
            <button type="button" className="ghost" onClick={() => setShowToken((s) => !s)}>
              {showToken ? "Hide" : "Show"}
            </button>
            {showToken ? <div className="mono" style={{ marginTop: 8 }}>{client.access_token}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
