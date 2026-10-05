import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Clock3, IdCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import BalanceCard from "../components/BalanceCard";
import TransactionRow from "../components/TransactionRow";
import { usePageMeta } from "../seo/usePageMeta";
import "./Dashboard.css";
import "./Kyc.css"; // reuses the kyc-status banner styles

function toTxn(item, type) {
  const reasonText = type === "deposit" ? item.failureReason || item.declineReason : item.declineReason;
  return {
    id: `${type}-${item.id}`,
    type,
    amount: item.amount,
    date: item.createdAt,
    status: item.status,
    note: reasonText || (type === "deposit" ? "Card payment via Paystack" : `To ${item.bankName} · ${item.accountNumber}`),
  };
}

export default function Dashboard() {
  usePageMeta({ title: "Dashboard", description: "Your 363 Cooperative Society account overview." });
  const { user } = useAuth();
  const [kyc, setKyc] = useState(undefined);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    api.kyc.getMine().then(({ submission }) => setKyc(submission)).catch(() => setKyc(null));
    Promise.all([api.deposits.listMine(), api.withdrawals.listMine()])
      .then(([{ deposits }, { withdrawals }]) => {
        const merged = [
          ...deposits.map((d) => toTxn(d, "deposit")),
          ...withdrawals.map((w) => toTxn(w, "withdrawal")),
        ]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 4);
        setActivity(merged);
      })
      .catch(() => setActivity([]));
  }, []);

  return (
    <div className="dash-grid">
      <KycBanner kyc={kyc} />

      <BalanceCard balance={user.availableBalance} bookBalance={user.bookBalance} />

      <div className="dash-stats">
        <div className="card dash-stat">
          <div className="dash-stat-icon"><IdCard size={16} /></div>
          <div>
            <p className="dash-stat-label">Member ID</p>
            <p className="dash-stat-value nums">{user.memberId}</p>
          </div>
        </div>
        <div className="card dash-stat">
          <div className="dash-stat-icon dash-stat-icon-mint"><ShieldCheck size={16} /></div>
          <div>
            <p className="dash-stat-label">Account status</p>
            <p className="dash-stat-value" style={{ textTransform: "capitalize" }}>
              {user.status.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>

      <div className="card dash-txns">
        <div className="dash-txns-head">
          <h3>Recent activity</h3>
          <Link to="/transactions" className="dash-txns-link">View all</Link>
        </div>
        {activity.length === 0 ? (
          <p className="form-card-sub" style={{ padding: "8px 4px" }}>No activity yet.</p>
        ) : (
          activity.map((t) => <TransactionRow key={t.id} txn={t} />)
        )}
      </div>
    </div>
  );
}

function KycBanner({ kyc }) {
  if (kyc === undefined) return null; // still loading, avoid a flash
  if (kyc?.status === "approved") return null; // nothing to prompt

  if (kyc?.status === "pending") {
    return (
      <div className="card kyc-status kyc-status-pending">
        <Clock3 size={20} />
        <div>
          <p className="kyc-status-title">KYC submitted — awaiting review</p>
          <p className="kyc-status-body">We'll email you once an admin has reviewed your documents.</p>
        </div>
      </div>
    );
  }

  if (kyc?.status === "declined") {
    return (
      <Link to="/kyc" className="card kyc-status kyc-status-declined">
        <ShieldAlert size={20} />
        <div>
          <p className="kyc-status-title">Your KYC needs changes</p>
          <p className="kyc-status-body">{kyc.declineReason} — tap to resubmit.</p>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/kyc" className="card kyc-status kyc-status-declined">
      <ShieldAlert size={20} />
      <div>
        <p className="kyc-status-title">Complete your KYC</p>
        <p className="kyc-status-body">Verify your identity to unlock deposits — tap to get started.</p>
      </div>
    </Link>
  );
}
