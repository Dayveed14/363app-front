import { useEffect, useState } from "react";
import { Check, X, Send } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { usePageMeta } from "../../seo/usePageMeta";
import "./Admin.css";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "processed", label: "Processed" },
  { key: "declined", label: "Declined" },
];

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminWithdrawals() {
  usePageMeta({ title: "Withdrawal Review" });
  const [tab, setTab] = useState("pending");
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  function load(status) {
    setLoading(true);
    api.admin.withdrawals
      .list(status)
      .then(({ withdrawals: w }) => setWithdrawals(w))
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(tab), [tab]);

  async function approve(id) {
    setBusyId(id);
    setError("");
    try {
      await api.admin.withdrawals.approve(id);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't approve this withdrawal.");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id) {
    const reason = window.prompt("Reason for declining this withdrawal:");
    if (!reason) return;
    setBusyId(id);
    setError("");
    try {
      await api.admin.withdrawals.decline(id, reason);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't decline this withdrawal.");
    } finally {
      setBusyId(null);
    }
  }

  async function process(id) {
    if (!window.confirm("Confirm that the bank transfer has actually been sent?")) return;
    setBusyId(id);
    setError("");
    try {
      await api.admin.withdrawals.process(id);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't mark this withdrawal processed.");
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
      ) : withdrawals.length === 0 ? (
        <p className="admin-empty">Nothing here.</p>
      ) : (
        withdrawals.map((w) => (
          <div className="admin-row" key={w.id}>
            <div className="admin-row-main">
              <p className="admin-row-title">{w.member.fullName} — {naira(w.amount)}</p>
              <p className="admin-row-sub">{w.member.email} · {w.member.memberId}</p>
              <p className="admin-row-sub">
                To: {w.bankName} · {w.accountNumber} · {w.accountName} · {fmtDate(w.createdAt)}
              </p>
              {w.declineReason && <p className="admin-row-reason">{w.declineReason}</p>}
            </div>

            {w.status === "pending" && (
              <div className="admin-row-actions">
                <button className="btn btn-ghost admin-btn-decline" disabled={busyId === w.id} onClick={() => decline(w.id)}>
                  <X size={15} /> Decline
                </button>
                <button className="btn btn-primary" disabled={busyId === w.id} onClick={() => approve(w.id)}>
                  <Check size={15} /> Approve
                </button>
              </div>
            )}

            {w.status === "approved" && (
              <div className="admin-row-actions">
                <button className="btn btn-primary" disabled={busyId === w.id} onClick={() => process(w.id)}>
                  <Send size={15} /> Mark as paid
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
