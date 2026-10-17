import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Clock3,  IdCard,  Wallet,  CalendarDays,  TrendingUp,  ArrowRight,  CheckCircle2,} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import BalanceCard from "../components/BalanceCard";
import TransactionRow from "../components/TransactionRow";
import { usePageMeta } from "../seo/usePageMeta";
import "./Dashboard.css";
import "./Kyc.css";

const naira = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not scheduled";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};


function toTxn(item, type) {
  const isRepayment = type === "repayment";

  const reasonText =
    type === "deposit"
      ? item.failureReason || item.declineReason
      : item.declineReason;

  const facilityId = item.facilityId ?? item.facility_id;

  return {
    id: `${type}-${
      item.id ??
      item.reference ??
      item.paystackReference ??
      item.paystack_reference ??
      `${facilityId ?? "unknown"}-${item.installmentNumber ?? item.installment_number ?? ""}`
    }`,
    type,
    amount:
      item.amount ??
      item.amountPaid ??
      item.amount_paid ??
      0,
    date:
      item.paidAt ??
      item.paid_at ??
      item.createdAt ??
      item.created_at,
    status: item.status,
    note: isRepayment
      ? `Finance facility repayment${
          facilityId ? ` · Facility #${facilityId}` : ""
        }`
      : reasonText ||
        (type === "deposit"
          ? "Card payment via Paystack"
          : `To ${item.bankName} · ${item.accountNumber}`),
  };
}



export default function Dashboard() {
  usePageMeta({
    title: "Dashboard",
    description: "Your 363 Cooperative Society account overview.",
  });

  const { user } = useAuth();

  const [kyc, setKyc] = useState(undefined);
  const [activity, setActivity] = useState([]);
  const [repaymentFacilities, setRepaymentFacilities] = useState([]);
  const [repaymentsLoading, setRepaymentsLoading] = useState(true);
  const [repaymentError, setRepaymentError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api.kyc
      .getMine()
      .then(({ submission }) => {
        if (!cancelled) setKyc(submission);
      })
      .catch(() => {
        if (!cancelled) setKyc(null);
      });

 
Promise.allSettled([
  api.deposits.listMine(),
  api.withdrawals.listMine(),
  api.financeFacilityRepayments.getDashboard(),
]).then(([depositResult, withdrawalResult, repaymentResult]) => {
  if (cancelled) return;

  const deposits =
    depositResult.status === "fulfilled"
      ? depositResult.value?.deposits ?? []
      : [];

  const withdrawals =
    withdrawalResult.status === "fulfilled"
      ? withdrawalResult.value?.withdrawals ?? []
      : [];

  const repaymentData =
    repaymentResult.status === "fulfilled"
      ? repaymentResult.value?.data ?? repaymentResult.value
      : {};

  const repayments = Array.isArray(repaymentData?.repaymentHistory)
    ? repaymentData.repaymentHistory
    : [];

  const successfulRepayments = repayments
    .filter((repayment) =>
      ["success", "successful", "paid", "completed"].includes(
        String(repayment.status ?? "").toLowerCase()
      )
    )
    .map((repayment) => toTxn(repayment, "repayment"));

  const merged = [
    ...deposits.map((deposit) => toTxn(deposit, "deposit")),
    ...withdrawals.map((withdrawal) => toTxn(withdrawal, "withdrawal")),
    ...successfulRepayments,
  ]
    .filter((transaction) => transaction.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);

  setActivity(merged);
});


    // One request. The backend already returns balance, totals, next
    // instalment and schedule per facility, so nothing is re-derived here.
    api.financeFacilityRepayments
      .getDashboard()
      .then((response) => {
        if (cancelled) return;
        const data = response?.data ?? response;
        setRepaymentFacilities(
          Array.isArray(data?.facilities) ? data.facilities : []
        );
        setRepaymentError("");
      })
      .catch(() => {
        if (cancelled) return;
        setRepaymentFacilities([]);
        setRepaymentError(
          "Your repayment summary could not be loaded. Please refresh the page."
        );
      })
      .finally(() => {
        if (!cancelled) setRepaymentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="dash-grid">
      <KycBanner kyc={kyc} />

      <BalanceCard balance={user.availableBalance} bookBalance={user.bookBalance} />

      <div className="dash-stats">
        <div className="card dash-stat">
          <div className="dash-stat-icon">
            <IdCard size={16} />
          </div>
          <div>
            <p className="dash-stat-label">Member ID</p>
            <p className="dash-stat-value nums">{user.memberId}</p>
          </div>
        </div>

        <div className="card dash-stat">
          <div className="dash-stat-icon dash-stat-icon-mint">
            <ShieldCheck size={16} />
          </div>
          <div>
            <p className="dash-stat-label">Account status</p>
            <p
              className="dash-stat-value"
              style={{ textTransform: "capitalize" }}
            >
              {user.status.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>

      {/* Repayment summary appears directly above Recent activity. */}
      <RepaymentSummary
        facilities={repaymentFacilities}
        loading={repaymentsLoading}
        error={repaymentError}
      />

      <div className="card dash-txns">
        <div className="dash-txns-head">
          <h3>Recent activity</h3>
          <Link to="/transactions" className="dash-txns-link">
            View all
          </Link>
        </div>

        {activity.length === 0 ? (
          <p className="form-card-sub" style={{ padding: "8px 4px" }}>
            No activity yet.
          </p>
        ) : (
          activity.map((transaction) => (
            <TransactionRow key={transaction.id} txn={transaction} />
          ))
        )}
      </div>
    </div>
  );
}

function RepaymentSummary({ facilities, loading, error }) {
  if (loading) {
    return (
      <section className="card repayment-summary">
        <div className="repayment-summary-heading">
          <div className="repayment-summary-icon">
            <Wallet size={20} />
          </div>
          <div>
            <h3>Repayment summary</h3>
            <p className="form-card-sub">
              Loading your facility repayment details...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card repayment-summary">
        <div className="repayment-summary-heading">
          <div className="repayment-summary-icon">
            <Wallet size={20} />
          </div>
          <div>
            <h3>Repayment summary</h3>
            <p className="form-card-sub">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  // Only show facilities that have actually been disbursed.
  const disbursedFacilities = facilities.filter((facility) => {
    const status = String(
      facility.status ?? facility.applicationStatus ?? ""
    ).toLowerCase();

    return (
      facility.disbursedAt ||
      facility.disbursementDate ||
      status === "disbursed" ||
      status === "completed"
    );
  });

  if (disbursedFacilities.length === 0) {
    return null;
  }

  return (
    <section className="card repayment-summary">
      <div className="repayment-summary-header">
        <div className="repayment-summary-heading">
          <div className="repayment-summary-icon">
            <Wallet size={20} />
          </div>
          <div>
            <h3>Repayment summary</h3>
            <p className="form-card-sub">
              Track your disbursed finance facility repayments.
            </p>
          </div>
        </div>
      </div>

      {disbursedFacilities.map((facility) => {
        const money = (value) => Number(value ?? 0) || 0;

        const totalRepayable = money(facility.totalRepayable);
        const totalPaid = money(facility.totalPaid);
        const awaiting = money(facility.awaitingConfirmation);
        const installmentCount = money(
          facility.installmentCount ?? facility.termMonths
        );
        const installmentAmount = money(facility.installmentAmount);
        const scheduleReady = installmentCount > 0;

        // Authoritative figure from the server (sum of what is still unpaid
        // on the schedule). Only fall back to the subtraction if absent.
        const outstanding = Math.max(
          0,
          facility.outstandingBalance != null
            ? money(facility.outstandingBalance)
            : totalRepayable - totalPaid
        );

        const schedule = Array.isArray(facility.schedule)
          ? facility.schedule
          : [];
        const paidInstallments = schedule.filter(
          (item) => String(item.status || "").toLowerCase() === "paid"
        ).length;

        const nextDue = facility.nextRepayment ?? null;
        const nextDueDate = nextDue?.dueDate ?? null;
        // Money already paid and awaiting confirmation is not on the
        // schedule yet; do not ask for it again.
        const nextDueAmount = Math.max(
          0,
          money(nextDue?.remainingAmount) - awaiting
        );

        const progress =
          totalRepayable > 0
            ? Math.min(100, Math.max(0, (totalPaid / totalRepayable) * 100))
            : 0;

        const completed =
          facility.completed === true ||
          (scheduleReady && outstanding <= 0);

        const facilityName =
          facility.businessName ??
          facility.business_name ??
          facility.facilityName ??
          facility.reference ??
          "Finance facility";

        return (
          <div
            className="repayment-facility"
            key={facility.facilityId ?? facility.id}
          >
            <div className="repayment-facility-top">
              <div>
                <p className="repayment-facility-name">{facilityName}</p>
                <p className="form-card-sub">
                  {completed
                    ? "All repayments completed"
                    : `${paidInstallments} of ${installmentCount} installments paid`}
                </p>
              </div>

              <span
                className={`repayment-status ${
                  completed ? "repayment-status-complete" : ""
                }`}
              >
                {completed ? (
                  <>
                    <CheckCircle2 size={14} /> Completed
                  </>
                ) : (
                  "Repayment active"
                )}
              </span>
            </div>

            <div className="repayment-metrics">
              <div className="repayment-metric repayment-metric-primary">
                <span>Outstanding balance</span>
                <strong>{naira(outstanding)}</strong>
              </div>

              <div className="repayment-metric">
                <span>Monthly installment</span>
                <strong>{naira(installmentAmount)}</strong>
              </div>

              <div className="repayment-metric">
                <span>Next payment due</span>
                <strong>
                  {completed ? "—" : naira(nextDueAmount)}
                </strong>
                <small>
                  {completed ? "No payment due" : formatDate(nextDueDate)}
                </small>
              </div>
            </div>

            {!scheduleReady && (
              <p className="form-card-sub">
                Your repayment schedule is still being prepared. Figures will
                appear once it is ready.
              </p>
            )}

            {awaiting > 0 && (
              <p className="form-card-sub">
                {naira(awaiting)} paid and awaiting admin confirmation. It
                will reduce your outstanding balance once confirmed.
              </p>
            )}

            <div className="repayment-progress-section">
              <div className="repayment-progress-label">
                <span>Repayment progress</span>
                <strong>{Math.round(progress)}%</strong>
              </div>

              <div
                className="repayment-progress-track"
                role="progressbar"
                aria-label="Repayment progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className="repayment-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="repayment-facility-footer">
              <span>
                <CalendarDays size={15} />
                {installmentCount} monthly installments
              </span>

              <Link
                to={`/finance-facility-repayments/${facility.facilityId ?? facility.id}`}
                className="dash-txns-link repayment-details-link"
              >
                View repayment plan <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function KycBanner({ kyc }) {
  if (kyc === undefined) return null;
  if (kyc?.status === "approved") return null;

  if (kyc?.status === "pending") {
    return (
      <div className="card kyc-status kyc-status-pending">
        <Clock3 size={20} />
        <div>
          <p className="kyc-status-title">
            KYC submitted — awaiting review
          </p>
          <p className="kyc-status-body">
            We'll email you once an admin has reviewed your documents.
          </p>
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
          <p className="kyc-status-body">
            {kyc.declineReason} — tap to resubmit.
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/kyc" className="card kyc-status kyc-status-declined">
      <ShieldAlert size={20} />
      <div>
        <p className="kyc-status-title">Complete your KYC</p>
        <p className="kyc-status-body">
          Verify your identity to unlock deposits — tap to get started.
        </p>
      </div>
    </Link>
  );
}
