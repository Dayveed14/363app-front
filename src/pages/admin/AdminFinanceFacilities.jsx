import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { usePageMeta } from "../../seo/usePageMeta";
import "./Admin.css";

const TABS = [
  { key: "under_review", label: "Under Review" },
  { key: "submitted", label: "Submitted" },
  { key: "additional_information_required", label: "Awaiting Member" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminFinanceFacilities() {
  usePageMeta({ title: "Finance Facility Applications" });
  const [tab, setTab] = useState("under_review");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.admin.financeFacility
      .list(tab)
      .then(({ applications: a }) => setApplications(a))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, [tab]);

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

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="admin-empty">Nothing here.</p>
      ) : (
        applications.map((a) => (
          <Link to={`/admin/finance-facilities/${a.id}`} className="admin-row admin-row-link" key={a.id}>
            <div className="admin-row-main">
              <p className="admin-row-title">{a.member.fullName} — {naira(a.amountRequested)}</p>
              <p className="admin-row-sub">{a.member.email} · {a.member.memberId}</p>
              <p className="admin-row-sub">Submitted {fmtDate(a.submittedAt)}</p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
