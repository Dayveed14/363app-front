import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { usePageMeta } from "../../seo/usePageMeta";
import "./Admin.css";

const TABS = [
  { key: "pending_confirmation", label: "Awaiting confirmation" },
  { key: "confirmed", label: "Confirmed" },
  { key: "declined", label: "Declined" },
  { key: "failed", label: "Failed" },
];

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminDeposits() {
  usePageMeta({ title: "Deposit Review" });
  const [tab, setTab] = useState("pending_confirmation");
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  function load(status) {
    setLoading(true);
    api.admin.deposits
      .list(status)
      .then(({ deposits: d }) => setDeposits(d))
      .catch(() => setDeposits([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(tab), [tab]);

  async function confirm(id) {
    setBusyId(id);
    setError("");
    try {
      await api.admin.deposits.confirm(id);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't confirm this deposit.");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id) {
    const reason = window.prompt("Reason for declining this deposit:");
    if (!reason) return;
    setBusyId(id);
    setError("");
    try {
      await api.admin.deposits.decline(id, reason);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't decline this deposit.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card admin-list-page">
      <div className="admin-list-head">
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={"admin-tab" + (tab === t.key ? " active" : "")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="field-error" style={{ margin: "0 4px 14px" }}>{error}</p>}

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : deposits.length === 0 ? (
        <p className="admin-empty">Nothing here.</p>
      ) : (
        deposits.map((d) => (
          <div className="admin-row" key={d.id}>
            <div className="admin-row-main">
              <p className="admin-row-title">{d.member.fullName} — {naira(d.amount)}</p>
              <p className="admin-row-sub">{d.member.email} · {d.member.memberId}</p>
              <p className="admin-row-sub">Ref: {d.reference} · {fmtDate(d.createdAt)}</p>
              {(d.failureReason || d.declineReason) && (
                <p className="admin-row-reason">{d.failureReason || d.declineReason}</p>
              )}
            </div>

            {d.status === "pending_confirmation" && (
              <div className="admin-row-actions">
                <button className="btn btn-ghost admin-btn-decline" disabled={busyId === d.id} onClick={() => decline(d.id)}>
                  <X size={15} /> Decline
                </button>
                <button className="btn btn-primary" disabled={busyId === d.id} onClick={() => confirm(d.id)}>
                  <Check size={15} /> Confirm
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
