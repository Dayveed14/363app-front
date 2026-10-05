import { useEffect, useState } from "react";
import { FileText, Check, X } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { usePageMeta } from "../../seo/usePageMeta";
import "./Admin.css";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

export default function AdminKyc() {
  usePageMeta({ title: "KYC Review" });
  const [tab, setTab] = useState("pending");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  function load(status) {
    setLoading(true);
    api.admin.kyc
      .list(status)
      .then(({ submissions: s }) => setSubmissions(s))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(tab), [tab]);

  async function viewDocument(submissionId, docType) {
    try {
      const blob = await api.admin.kyc.document(submissionId, docType);
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load that document.");
    }
  }

  async function approve(id) {
    setBusyId(id);
    setError("");
    try {
      await api.admin.kyc.approve(id);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't approve this submission.");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id) {
    const reason = window.prompt("Reason for declining this KYC submission:");
    if (!reason) return;
    setBusyId(id);
    setError("");
    try {
      await api.admin.kyc.decline(id, reason);
      load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't decline this submission.");
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
      ) : submissions.length === 0 ? (
        <p className="admin-empty">Nothing here.</p>
      ) : (
        submissions.map((s) => (
          <div className="admin-row" key={s.id}>
            <div className="admin-row-main">
              <p className="admin-row-title">{s.member.fullName}</p>
              <p className="admin-row-sub">{s.member.email} · {s.member.memberId}</p>
              <p className="admin-row-sub">
                {s.bankName} · {s.accountNumber} · {s.houseAddress}
              </p>
              {s.status === "declined" && s.declineReason && (
                <p className="admin-row-reason">Declined: {s.declineReason}</p>
              )}
              <div className="admin-row-docs">
                <button className="admin-doc-link" onClick={() => viewDocument(s.id, "idDocument")}>
                  <FileText size={14} /> ID document
                </button>
                <button className="admin-doc-link" onClick={() => viewDocument(s.id, "proofOfAddress")}>
                  <FileText size={14} /> Proof of address
                </button>
              </div>
            </div>

            {s.status === "pending" && (
              <div className="admin-row-actions">
                <button className="btn btn-ghost admin-btn-decline" disabled={busyId === s.id} onClick={() => decline(s.id)}>
                  <X size={15} /> Decline
                </button>
                <button className="btn btn-primary" disabled={busyId === s.id} onClick={() => approve(s.id)}>
                  <Check size={15} /> Approve
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
