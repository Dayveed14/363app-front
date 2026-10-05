import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../api/client";
import { usePageMeta } from "../seo/usePageMeta";
import OtpInput from "../components/OtpInput";
import { statusMeta } from "../data/statusMeta";
import "./FormPage.css";
import "./Kyc.css"; // kyc-status banner styles, reused here for the KYC gate
import "./ActivityList.css";

const STEP = { FORM: "form", OTP: "otp", DONE: "done" };

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

export default function Withdraw() {
  usePageMeta({ title: "Withdraw" });
  const { user } = useAuth();

  const [kyc, setKyc] = useState(undefined); // undefined = loading
  const [history, setHistory] = useState([]);
  const [step, setStep] = useState(STEP.FORM);
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState(null); // { bankName, accountNumber } from initiate
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastWithdrawal, setLastWithdrawal] = useState(null);

  useEffect(() => {
    api.kyc.getMine().then(({ submission }) => setKyc(submission)).catch(() => setKyc(null));
    loadHistory();
  }, []);

  function loadHistory() {
    api.withdrawals.listMine().then(({ withdrawals }) => setHistory(withdrawals)).catch(() => setHistory([]));
  }

  async function handleAmountSubmit(e) {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.withdrawals.initiate(Number(amount));
      setBankDetails({ bankName: result.bankName, accountNumber: result.accountNumber });
      setStep(STEP.OTP);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the withdrawal. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 6) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const { withdrawal } = await api.withdrawals.confirm(code);
      setLastWithdrawal(withdrawal);
      setStep(STEP.DONE);
      loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't confirm the withdrawal. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setStep(STEP.FORM);
    setAmount("");
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setLastWithdrawal(null);
  }

  if (kyc === undefined) return null;

  // Withdrawals only pay out to a KYC-approved account — gate the whole
  // page rather than let someone reach a form they can't submit.
  if (kyc?.status !== "approved") {
    return (
      <div className="kyc-page">
        <Link to="/kyc" className="card kyc-status kyc-status-declined">
          <ShieldAlert size={20} />
          <div>
            <p className="kyc-status-title">Approved KYC required</p>
            <p className="kyc-status-body">
              Withdrawals pay out to your KYC-approved bank account — complete and get your KYC
              approved first. Tap to go there now.
            </p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="form-grid">
      <div className="card form-card">
        <h3 className="form-card-title">Request a withdrawal</h3>
        <p className="form-card-sub">
          Pays out to your approved account: {kyc.bankName} · {kyc.accountNumber}
        </p>
        <p className="withdraw-available">
          Available balance: <strong className="nums">{naira(user.availableBalance)}</strong>
        </p>

        {step === STEP.FORM && (
          <form onSubmit={handleAmountSubmit}>
            <div className="field">
              <label htmlFor="wd-amount">Amount to withdraw (₦)</label>
              <input
                id="wd-amount"
                type="number"
                min="100"
                placeholder="30,000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {error && <p className="field-error" style={{ marginBottom: 14 }}>{error}</p>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "Sending code…" : "Continue"}
            </button>
          </form>
        )}

        {step === STEP.OTP && (
          <form onSubmit={handleOtpSubmit}>
            <div className="form-success" style={{ marginBottom: 18 }}>
              <ShieldCheck size={20} />
              <div>
                <p className="form-success-title">Verify it's you</p>
                <p className="form-success-body">
                  Enter the 6-digit code sent to your email to confirm {naira(amount)} to{" "}
                  {bankDetails.bankName} · {bankDetails.accountNumber}.
                </p>
              </div>
            </div>
            <OtpInput value={otp} onChange={setOtp} />
            {error && <p className="field-error" style={{ marginTop: 14, marginBottom: 0 }}>{error}</p>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 18 }}>
              {loading ? "Confirming…" : "Confirm withdrawal"}
            </button>
          </form>
        )}

        {step === STEP.DONE && lastWithdrawal && (
          <div className="form-success">
            <CheckCircle2 size={22} />
            <div>
              <p className="form-success-title">Withdrawal request submitted</p>
              <p className="form-success-body">
                {naira(lastWithdrawal.amount)} to {lastWithdrawal.bankName} ••
                {lastWithdrawal.accountNumber.slice(-4)} is now with an admin for review.
              </p>
              <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={startOver}>
                Make another request
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card form-card">
        <h3 className="form-card-title">Withdrawal history</h3>
        {history.length === 0 ? (
          <p className="form-card-sub">No withdrawals yet.</p>
        ) : (
          <div className="activity-history">
            {history.map((w) => {
              const meta = statusMeta[w.status] || statusMeta.pending;
              return (
                <div className="activity-row" key={w.id}>
                  <div>
                    <p className="activity-amount nums">{naira(w.amount)}</p>
                    <p className="activity-date">{fmtDate(w.createdAt)}</p>
                    {w.declineReason && <p className="activity-reason">{w.declineReason}</p>}
                  </div>
                  <span className={"pill " + meta.className}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
