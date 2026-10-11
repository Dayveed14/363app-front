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


    api.financeFacilityRepayments
      .getDashboard()
      .then(async (response) => {
        const facilities = Array.isArray(response?.data?.facilities)
  ? response.data.facilities
  : Array.isArray(response?.facilities)
    ? response.facilities
    : [];

        // Fetch individual details as a fallback if the dashboard endpoint
        // returns disbursed facilities without their repayment summaries.
        const detailedFacilities = await Promise.all(
          facilities.map(async (facility) => {
            const facilityId = facility.id ?? facility.facilityId;

            let balance =
              facility.balance ??
              facility.outstandingBalance ??
              facility.repaymentBalance;

            let nextDue =
              facility.nextDue ??
              facility.nextRepayment ??
              facility.nextRepaymentDue ??
              facility.nextInstallment;

            let schedule =
              facility.schedule ??
              facility.repaymentSchedule ??
              facility.installments;

            if (
              facilityId &&
              (balance == null || nextDue === undefined || schedule === undefined)
            ) {
              const results = await Promise.allSettled([
                balance == null
                  ? api.financeFacilityRepayments.getBalance(facilityId)
                  : Promise.resolve(null),
                nextDue === undefined || schedule === undefined
                  ? api.financeFacilityRepayments.getSchedule(facilityId)
                  : Promise.resolve(null),
              ]);

              if (results[0].status === "fulfilled" && results[0].value) {
                const data = results[0].value;
                balance =
                  data.balance ??
                  data.outstandingBalance ??
                  data;
              }

              if (results[1].status === "fulfilled" && results[1].value) {
                const data = results[1].value;

                if (schedule === undefined) {
                  schedule =
                    data.schedule ??
                    data.installments ??
                    data.repayments ??
                    [];
                }

                if (nextDue === undefined) {
                  nextDue =
                    data.nextDue ??
                    data.nextRepaymentDue ??
                    null;
                }
              }
            }

            const balanceData =
              balance && typeof balance === "object" ? balance : {};

            const scheduleRows = Array.isArray(schedule) ? schedule : [];

            if (!nextDue && scheduleRows.length) {
              nextDue =
                scheduleRows.find(
                  (item) =>
                    !["paid", "completed"].includes(
                      String(item.status || "").toLowerCase()
                    ) &&
                    Number(item.amountDue ?? item.amount_due ?? 0) >
                      Number(item.amountPaid ?? item.amount_paid ?? 0)
                ) ?? null;
            }

            return {
              ...facility,
              balance: balanceData,
              nextDue,
              schedule: scheduleRows,
            };
          })
        );

        if (!cancelled) {
          setRepaymentFacilities(detailedFacilities);
          setRepaymentError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRepaymentFacilities([]);
          setRepaymentError(
            "Your repayment summary could not be loaded. Please refresh the page."
          );
        }
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
      status === "disbursed"
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
        const balance = facility.balance ?? {};

        const outstanding = Number(
          balance.outstandingBalance ??
            facility.outstandingBalance ??
            0
        );

        const totalRepayable = Number(
          balance.totalRepayable ??
            facility.totalRepayable ??
            facility.total_repayable ??
            0
        );

        const totalPaid = Number(
          balance.totalPaid ??
            facility.totalPaid ??
            0
        );

        const installmentAmount = Number(
          facility.installmentAmount ??
            facility.installment_amount ??
            facility.monthlyInstallment ??
            facility.monthly_installment ??
            facility.repaymentAmount ??
            0
        );

        const schedule = Array.isArray(facility.schedule)
          ? facility.schedule
          : [];

        const nextDue = facility.nextDue;

        const nextDueDate =
          nextDue?.dueDate ??
          nextDue?.due_date ??
          null;

        const nextDueAmount = Number(
          nextDue?.remainingAmount ??
            nextDue?.remaining_amount ??
            (
              Number(nextDue?.amountDue ?? nextDue?.amount_due ?? 0) -
              Number(nextDue?.amountPaid ?? nextDue?.amount_paid ?? 0)
            )
        );

        const paidInstallments = schedule.filter((item) => {
          const status = String(item.status || "").toLowerCase();
          return status === "paid" || status === "completed";
        }).length;

        const installmentCount = Number(
          balance.installmentCount ??
            facility.termMonths ??
            facility.term_months ??
            schedule.length ??
            0
        );

        const calculatedPaid =
          totalRepayable > 0
            ? totalPaid
            : schedule.reduce(
                (sum, item) =>
                  sum +
                  Number(item.amountPaid ?? item.amount_paid ?? 0),
                0
              );

        const calculatedTotal =
          totalRepayable > 0
            ? totalRepayable
            : schedule.reduce(
                (sum, item) =>
                  sum + Number(item.amountDue ?? item.amount_due ?? 0),
                0
              );

        const progress =
          calculatedTotal > 0
            ? Math.min(
                100,
                Math.max(0, (calculatedPaid / calculatedTotal) * 100)
              )
            : installmentCount > 0
              ? (paidInstallments / installmentCount) * 100
              : 0;

        const completed =
          balance.completed === true ||
          (calculatedTotal > 0 && outstanding <= 0);

        const facilityName =
          facility.businessName ??
          facility.business_name ??
          facility.facilityName ??
          facility.reference ??
          "Finance facility";

        return (
          <div
            className="repayment-facility"
            key={facility.id ?? facility.facilityId}
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
                to={`/finance-facility-repayments/${facility.id ?? facility.facilityId}`}
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
