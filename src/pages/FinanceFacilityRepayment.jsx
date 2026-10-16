import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { api, ApiError } from "../api/client";
import { usePageMeta } from "../seo/usePageMeta";

import "./FormPage.css";
import "./FinanceFacilityRepayment.css";

const naira = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return error?.message || "Something went wrong. Please try again.";
};

const getScheduleValue = (installment, camelCase, snakeCase) =>
  installment?.[camelCase] ?? installment?.[snakeCase];

const getInstallmentStatus = (installment) => {
  const status = String(installment?.status || "").toLowerCase();

  if (status === "paid" || status === "completed") {
    return "paid";
  }

  if (status === "overdue" || installment?.overdue === true) {
    return "overdue";
  }

  if (status === "partially_paid") {
    return "partial";
  }

  return status || "pending";
};

export default function FinanceFacilityRepayment() {
  usePageMeta({
    title: "Finance Facility Repayments",
    description: "View your repayment schedule and manage finance facility repayments.",
    indexable: false,
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reference =
    searchParams.get("reference") || searchParams.get("trxref");

  const verificationStarted = useRef(false);

  const [facility, setFacility] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadFacility = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response =
          await api.financeFacilityRepayments.getDashboard();

        const facilities = Array.isArray(response?.data?.facilities)
          ? response.data.facilities
          : Array.isArray(response?.facilities)
            ? response.facilities
            : [];

        const allHistory = Array.isArray(response?.data?.repaymentHistory)
          ? response.data.repaymentHistory
          : [];
        setHistory(allHistory.filter((h) => String(h.facility_id) === String(id)));

        const selectedFacility = facilities.find(
          (item) =>
            String(item.facilityId ?? item.id) === String(id)
        );

        if (!selectedFacility) {
          setFacility(null);
          setError(
            "We could not find this disbursed finance facility in your account."
          );
          return null;
        }

        setFacility(selectedFacility);
        return selectedFacility;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  // Load the selected facility and its repayment schedule.
  useEffect(() => {
    loadFacility();
  }, [loadFacility]);

  // Verify a Paystack payment after the member returns to this page.
  useEffect(() => {
    if (!reference || verificationStarted.current) return;

    verificationStarted.current = true;

    let cancelled = false;

    const verifyPayment = async () => {
      setVerifying(true);
      setNotice("");
      setError("");

      try {
        const response =
          await api.financeFacilityRepayments.verify(reference);

        if (cancelled) return;

        if (response?.success === false) {
          throw new Error(
            response?.message || "Payment verification was unsuccessful."
          );
        }

        if (response?.data?.status === "failed") {
          throw new Error(
            "Paystack reported this payment as failed. You have not been charged."
          );
        }

        setNotice(
          response?.message ||
            "Payment received. It will reflect on your facility once an admin confirms it."
        );

        // Remove the payment reference from the address bar.
        navigate(`/finance-facility-repayments/${id}`, {
          replace: true,
        });

        await loadFacility({ silent: true });
      } catch (err) {
        if (cancelled) return;

        setError(
          `We could not confirm this payment: ${getErrorMessage(err)}`
        );
      } finally {
        if (!cancelled) {
          setVerifying(false);
        }
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [reference, id, navigate, loadFacility]);

  const schedule = Array.isArray(facility?.schedule)
    ? facility.schedule
    : [];

  const nextRepayment = facility?.nextRepayment ?? null;

  const outstandingBalance = Math.max(
    0,
    Number(facility?.outstandingBalance ?? 0)
  );

  const totalRepayable = Math.max(
    0,
    Number(facility?.totalRepayable ?? 0)
  );

  const totalPaid = Math.max(
    0,
    Number(facility?.totalPaid ?? 0)
  );

  const installmentAmount = Math.max(
    0,
    Number(facility?.installmentAmount ?? 0)
  );

  const awaitingConfirmation = history
    .filter((h) => h.status === "pending_confirmation")
    .reduce((sum, h) => sum + Number(h.amount || 0), 0);

  const rawRemainingInstallment = nextRepayment
    ? Math.max(
        0,
        Number(
          nextRepayment.remainingAmount ??
            (
              Number(nextRepayment.amountDue ?? 0) -
              Number(nextRepayment.amountPaid ?? 0)
            )
        )
      )
    : 0;

  // Money already paid and awaiting admin confirmation isn't on the
  // schedule yet; don't invite a second payment for the same installment.
  const remainingInstallment = Math.max(
    0,
    Number((rawRemainingInstallment - awaitingConfirmation).toFixed(2))
  );

  const progress =
    totalRepayable > 0
      ? Math.min(100, Math.max(0, (totalPaid / totalRepayable) * 100))
      : 0;

  const completed =
    facility?.completed === true || outstandingBalance <= 0;

  const handlePayInstallment = async () => {
    if (!facility || paying || verifying) return;

    if (completed) {
      setNotice("This finance facility has been fully repaid.");
      return;
    }

    if (!nextRepayment || remainingInstallment <= 0) {
      setError(
        "There is no outstanding installment available for payment."
      );
      return;
    }

    setPaying(true);
    setError("");
    setNotice("");

    try {
      const response = await api.financeFacilityRepayments.initialize(
        Number(facility.facilityId ?? facility.id),
        remainingInstallment
      );

      const data = response?.data ?? response;

      if (response?.success === false) {
        throw new Error(
          response?.message || "Unable to initialize your payment."
        );
      }

      const authorizationUrl =
        data?.authorizationUrl ??
        data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error(
          "The payment service did not return a checkout URL. Please try again."
        );
      }

      // Redirect to the trusted Paystack checkout URL returned by the backend.
      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(getErrorMessage(err));
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="form-page repayment-page">
        <div className="repayment-loading">
          <LoaderCircle className="repayment-spinner" size={30} />
          <p>Loading your repayment information...</p>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="form-page repayment-page">
        <Link to="/" className="repayment-back-link">
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <div className="repayment-message repayment-message-error">
          <ShieldAlert size={22} />
          <div>
            <h3>Unable to load finance facility</h3>
            <p>{error || "This facility could not be found."}</p>
          </div>
        </div>

        <button
          type="button"
          className="repayment-secondary-button"
          onClick={() => loadFacility()}
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="form-page repayment-page">
      <Link to="/" className="repayment-back-link">
        <ArrowLeft size={17} />
        Back to dashboard
      </Link>

      <div className="repayment-page-heading">
        <div>
          <span className="repayment-eyebrow">
            FINANCE FACILITY
          </span>

          <h1>Repayment plan</h1>

          <p>
            Track your installments, check upcoming payments, and
            manage your repayment.
          </p>
        </div>

        <button
          type="button"
          className="repayment-refresh-button"
          onClick={() => loadFacility({ silent: true })}
          disabled={refreshing || verifying}
        >
          {refreshing ? (
            <LoaderCircle className="repayment-spinner" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="repayment-message repayment-message-error"
          role="alert"
        >
          <ShieldAlert size={21} />
          <div>
            <strong>Something needs your attention</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {notice && (
        <div
          className="repayment-message repayment-message-success"
          role="status"
        >
          <CheckCircle2 size={21} />
          <div>
            <strong>Payment update</strong>
            <p>{notice}</p>
          </div>
        </div>
      )}

      {verifying && (
        <div className="repayment-message repayment-message-info">
          <LoaderCircle className="repayment-spinner" size={21} />
          <div>
            <strong>Verifying your payment</strong>
            <p>
              Please wait while we confirm your payment with the
              payment service.
            </p>
          </div>
        </div>
      )}

      <section className="repayment-facility-card">
        <div className="repayment-facility-top">
          <div className="repayment-facility-icon">
            <Wallet size={23} />
          </div>

          <div className="repayment-facility-title">
            <span>Business finance facility</span>
            <h2>{facility.businessName || "Finance facility"}</h2>
            <p>
              Facility ID: {facility.facilityId ?? facility.id}
            </p>
          </div>

          <span
            className={`repayment-status ${
              completed ? "repayment-status-paid" : "repayment-status-active"
            }`}
          >
            {completed ? "Fully repaid" : "Repayment active"}
          </span>
        </div>

        <div className="repayment-balance">
          <span>Outstanding balance</span>
          <strong>{naira(outstandingBalance)}</strong>
          <p>
            {completed
              ? "You have completed your repayments."
              : "Remaining amount to repay on this facility."}
          </p>
        </div>

        <div className="repayment-progress">
          <div className="repayment-progress-label">
            <span>Repayment progress</span>
            <strong>{progress.toFixed(1)}%</strong>
          </div>

          <div
            className="repayment-progress-track"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Repayment progress"
          >
            <div
              className="repayment-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="repayment-progress-caption">
            <span>Paid: {naira(totalPaid)}</span>
            <span>Total: {naira(totalRepayable)}</span>
          </div>
        </div>
      </section>

      <section className="repayment-metrics">
        <article className="repayment-metric-card">
          <div className="repayment-metric-icon">
            <CreditCard size={20} />
          </div>

          <span>Approved amount</span>
          <strong>{naira(facility.approvedAmount)}</strong>
        </article>

        <article className="repayment-metric-card">
          <div className="repayment-metric-icon">
            <CalendarDays size={20} />
          </div>

          <span>Monthly installment</span>
          <strong>{naira(installmentAmount)}</strong>
        </article>

        <article className="repayment-metric-card">
          <div className="repayment-metric-icon">
            <Clock3 size={20} />
          </div>

          <span>Repayment term</span>
          <strong>
            {Number(facility.termMonths) || 0} months
          </strong>
        </article>
      </section>

      {awaitingConfirmation > 0 && (
        <div className="repayment-message repayment-message-info" role="status">
          <Clock3 size={21} />
          <div>
            <strong>Awaiting admin confirmation</strong>
            <p>
              {naira(awaitingConfirmation)} has been paid and will be applied to
              your schedule once an admin confirms receipt.
            </p>
          </div>
        </div>
      )}

      {!completed && nextRepayment && remainingInstallment > 0 && (
        <section className="repayment-next-card">
          <div className="repayment-next-icon">
            <CalendarDays size={23} />
          </div>

          <div className="repayment-next-content">
            <span>Next installment</span>

            <h2>{naira(remainingInstallment)}</h2>

            <p>
              Due date: {formatDate(nextRepayment.dueDate)}
            </p>

            {nextRepayment.overdue && (
              <span className="repayment-overdue-note">
                This installment is overdue.
              </span>
            )}

            {Number(nextRepayment.amountPaid ?? 0) > 0 && (
              <p>
                Already paid: {naira(nextRepayment.amountPaid)}
              </p>
            )}
          </div>

          <button
            type="button"
            className="repayment-pay-button"
            onClick={handlePayInstallment}
            disabled={paying || verifying || remainingInstallment <= 0}
          >
            {paying ? (
              <>
                <LoaderCircle
                  className="repayment-spinner"
                  size={17}
                />
                Preparing payment...
              </>
            ) : (
              <>
                <CreditCard size={17} />
                Pay installment
              </>
            )}
          </button>
        </section>
      )}

      {completed && (
        <div className="repayment-completed-card">
          <CheckCircle2 size={26} />
          <div>
            <h3>Facility fully repaid</h3>
            <p>
              There are no outstanding repayments on this facility.
            </p>
          </div>
        </div>
      )}

      <section className="repayment-schedule-section">
        <div className="repayment-section-heading">
          <div>
            <span className="repayment-eyebrow">
              PAYMENT DETAILS
            </span>
            <h2>Repayment schedule</h2>
            <p>
              Review each installment and its current payment status.
            </p>
          </div>

          <div className="repayment-schedule-count">
            {schedule.length} installments
          </div>
        </div>

        {schedule.length === 0 ? (
          <div className="repayment-empty-state">
            <FileText size={30} />
            <h3>No repayment schedule found</h3>
            <p>
              The repayment schedule is not available yet. Refresh
              the page or contact the cooperative if this continues.
            </p>
          </div>
        ) : (
          <>
            <div className="repayment-table-wrapper">
              <table className="repayment-table">
                <thead>
                  <tr>
                    <th>Installment</th>
                    <th>Due date</th>
                    <th>Amount due</th>
                    <th>Amount paid</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {schedule.map((item, index) => {
                    const installmentNumber = Number(
                      getScheduleValue(
                        item,
                        "installmentNumber",
                        "installment_number"
                      ) ?? index + 1
                    );

                    const amountDue = Number(
                      getScheduleValue(
                        item,
                        "amountDue",
                        "amount_due"
                      ) ?? 0
                    );

                    const amountPaid = Number(
                      getScheduleValue(
                        item,
                        "amountPaid",
                        "amount_paid"
                      ) ?? 0
                    );

                    const remaining = Math.max(
                      0,
                      Number(
                        item.remainingAmount ??
                          amountDue - amountPaid
                      )
                    );

                    const status = getInstallmentStatus(item);

                    return (
                      <tr
                        key={
                          item.id ??
                          item.installmentId ??
                          `${facility.facilityId}-${installmentNumber}`
                        }
                      >
                        <td>
                          <span className="repayment-installment-number">
                            #{installmentNumber}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            getScheduleValue(
                              item,
                              "dueDate",
                              "due_date"
                            )
                          )}
                        </td>

                        <td>{naira(amountDue)}</td>

                        <td className="repayment-paid-amount">
                          {naira(amountPaid)}
                        </td>

                        <td>
                          <strong>{naira(remaining)}</strong>
                        </td>

                        <td>
                          <span
                            className={`repayment-installment-status repayment-installment-status-${status}`}
                          >
                            {status === "paid" && (
                              <CheckCircle2 size={13} />
                            )}

                            {status === "overdue" && (
                              <Clock3 size={13} />
                            )}

                            {status === "partial" && (
                              <CreditCard size={13} />
                            )}

                            {status === "paid"
                              ? "Paid"
                              : status === "overdue"
                                ? "Overdue"
                                : status === "partial"
                                  ? "Partially paid"
                                  : "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="repayment-table-note">
              <ShieldCheck size={15} />
              Payments are applied to your schedule only after an admin
              confirms receipt.
            </p>
          </>
        )}
      </section>

      <div className="repayment-page-footer">
        <Link to="/" className="repayment-footer-link">
          Return to dashboard
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}