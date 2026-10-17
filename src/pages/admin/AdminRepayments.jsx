import { useEffect, useState } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { usePageMeta } from "../../seo/usePageMeta";
import "./Admin.css";

const TABS = [
  { key: "pending_confirmation", label: "Awaiting confirmation" },
  { key: "success", label: "Confirmed" },
  { key: "declined", label: "Declined" },
  { key: "failed", label: "Failed" },
];

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminRepayments() {
  usePageMeta({ title: "Loan Repayments" });
  const [tab, setTab] = useState("pending_confirmation");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load(status) {
    setLoading(true);
    api.admin.financeFacilityRepayments
      .list(status)
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(tab), [tab]);

  async function reconcile() {
    setError("");
    setNotice("");
    try {
      const res = await api.admin.financeFacilityRepayments.reconcile();
      const s = res.data;
      setNotice(
        `Checked ${s.checked} unfinished payment(s): ${s.awaitingConfirmation} now awaiting confirmation, ${s.failed} failed, ${s.stillPending} still unpaid.`
      );
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't run the check.");
    }
  }

  async function confirm(id) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const res = await api.admin.financeFacilityRepayments.confirm(id);
      setNotice(res.message);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't confirm this repayment.");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id) {
    const reason = window.prompt("Reason for declining this repayment:");
    if (!reason) return;
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      await api.admin.financeFacilityRepayments.decline(id, reason);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't decline this repayment.");
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

      <div style={{ margin: "0 4px 14px" }}>
        <button className="btn btn-ghost" onClick={reconcile} title="Re-check payments that were started but never completed on our side">
          <RefreshCw size={15} /> Check for missed payments
        </button>
      </div>
      {error && <p className="field-error" style={{ margin: "0 4px 14px" }}>{error}</p>}
      {notice && <p className="admin-row-sub" style={{ margin: "0 4px 14px" }}>{notice}</p>}

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="admin-empty">Nothing here.</p>
      ) : (
        rows.map((r) => (
          <div className="admin-row" key={r.id}>
            <div className="admin-row-main">
              <p className="admin-row-title">{r.full_name} — {naira(r.amount)}</p>
              <p className="admin-row-sub">{r.email} · {r.member_id}</p>
              <p className="admin-row-sub">
                Facility #{r.facility_id}{r.business_name ? ` (${r.business_name})` : ""} · Ref: {r.paystack_reference} · {fmtDate(r.created_at)}
              </p>
              {(r.failure_reason || r.decline_reason) && (
                <p className="admin-row-reason">{r.failure_reason || r.decline_reason}</p>
              )}
            </div>

            {r.status === "pending_confirmation" && (
              <div className="admin-row-actions">
                <button className="btn btn-ghost admin-btn-decline" disabled={busyId === r.id} onClick={() => decline(r.id)}>
                  <X size={15} /> Decline
                </button>
                <button className="btn btn-primary" disabled={busyId === r.id} onClick={() => confirm(r.id)}>
                  <Check size={15} /> Confirm receipt
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
