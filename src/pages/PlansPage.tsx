import { type FormEvent, useEffect, useState } from "react";
import { adminApi } from "../api";

type Plan = {
  _id: string;
  name: string;
  description: string;
  itemLimit: number | null;
  period: string;
  price: number;
  paypalPlanId: string | null;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = () => {
    adminApi
      .plans()
      .then((res) => {
        setPlans(res.data || []);
        // if (!selected && res.data?.[0]) setSelected(res.data[0]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load plans"));
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selected || saving) return;
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (saving) return;
    setConfirmOpen(false);
  };

  const confirmSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await adminApi.updatePlan(selected._id, {
        description: selected.description,
        itemLimit: selected.itemLimit,
        period: selected.period,
        price: selected.price,
        paypalPlanId: selected.paypalPlanId,
      });
      setMessage(res.message || "Saved");
      setPlans((prev) => prev.map((p) => (p._id === res.data._id ? res.data : p)));
      setSelected(res.data);
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Plans</h1>
      <p className="page-sub">View and edit plan limits and pricing</p>
      {error ? <div className="error">{error}</div> : null}
      {message ? <p className="muted">{message}</p> : null}

      <div className="panel" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Period</th>
              <th>Item limit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>${p.price}</td>
                <td>{p.period}</td>
                <td>{p.itemLimit ?? "Unlimited"}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => setSelected(p)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Edit: {selected.name}</h2>
          <form className="plan-form" onSubmit={onSubmit}>
            <label>Description</label>
            <textarea
              rows={3}
              value={selected.description}
              onChange={(e) => setSelected({ ...selected, description: e.target.value })}
            />
            <label>Period</label>
            <input
              value={selected.period}
              onChange={(e) => setSelected({ ...selected, period: e.target.value })}
            />
            <label>Price</label>
            <input
              type="number"
              step="0.01"
              value={selected.price}
              onChange={(e) => setSelected({ ...selected, price: Number(e.target.value) })}
            />
            <label>Item limit (empty = unlimited)</label>
            <input
              type="number"
              value={selected.itemLimit ?? ""}
              onChange={(e) =>
                setSelected({
                  ...selected,
                  itemLimit: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
            <label>PayPal plan ID</label>
            <input
              value={selected.paypalPlanId ?? ""}
              onChange={(e) => setSelected({ ...selected, paypalPlanId: e.target.value || null })}
            />
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save plan"}
            </button>
          </form>
        </div>
      ) : null}

      {confirmOpen && selected ? (
        <div className="modal-backdrop" onClick={closeConfirm} role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-plan-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="save-plan-title" className="modal-title">
              Save plan changes?
            </h3>
            <p className="modal-body">
              You’re about to update the <strong>{selected.name}</strong> plan (price, limits, and
              PayPal settings). This affects all stores on that plan.
            </p>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={closeConfirm} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={confirmSave} disabled={saving}>
                {saving ? "Saving…" : "Confirm save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
