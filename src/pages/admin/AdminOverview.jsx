import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { api } from "../../api/client";
import { usePageMeta } from "../../seo/usePageMeta";
import "./Admin.css";

export default function AdminOverview() {
  usePageMeta({ title: "Admin Overview" });
  const [pendingKyc, setPendingKyc] = useState(null);
  const [pendingDeposits, setPendingDeposits] = useState(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(null);

  useEffect(() => {
    api.admin.kyc.list("pending").then(({ submissions }) => setPendingKyc(submissions.length)).catch(() => setPendingKyc(0));
    api.admin.deposits
      .list("pending_confirmation")
      .then(({ deposits }) => setPendingDeposits(deposits.length))
      .catch(() => setPendingDeposits(0));
    api.admin.withdrawals
      .list("pending")
      .then(({ withdrawals }) => setPendingWithdrawals(withdrawals.length))
      .catch(() => setPendingWithdrawals(0));
  }, []);

  return (
    <div className="admin-overview-grid">
      <Link to="/admin/kyc" className="card admin-overview-card">
        <div className="admin-overview-icon"><ShieldCheck size={20} /></div>
        <div>
          <p className="admin-overview-count">{pendingKyc ?? "…"}</p>
          <p className="admin-overview-label">KYC submissions awaiting review</p>
        </div>
      </Link>

      <Link to="/admin/deposits" className="card admin-overview-card">
        <div className="admin-overview-icon admin-overview-icon-mint"><ArrowDownToLine size={20} /></div>
        <div>
          <p className="admin-overview-count">{pendingDeposits ?? "…"}</p>
          <p className="admin-overview-label">Deposits awaiting confirmation</p>
        </div>
      </Link>

      <Link to="/admin/withdrawals" className="card admin-overview-card">
        <div className="admin-overview-icon admin-overview-icon-coral"><ArrowUpFromLine size={20} /></div>
        <div>
          <p className="admin-overview-count">{pendingWithdrawals ?? "…"}</p>
          <p className="admin-overview-label">Withdrawals awaiting review</p>
        </div>
      </Link>
    </div>
  );
}
