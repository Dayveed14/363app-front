import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { api, ApiError } from "../api/client";
import { usePageMeta } from "../seo/usePageMeta";
import { statusMeta } from "../data/statusMeta";
import "./FormPage.css";
import "./ActivityList.css";

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

export default function Deposit() {
  usePageMeta({ title: "Deposit" });
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.deposits
      .listMine()
      .then(({ deposits }) => setHistory(deposits))
      .catch(() => setHistory([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoading(true);
    try {
      const { authorizationUrl } = await api.deposits.initialize(Number(amount));
      // Hand off to Paystack's hosted checkout. It redirects back to
      // PAYSTACK_CALLBACK_URL (the /deposit/callback route) with
      // ?reference=... once the member completes or cancels payment.
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the deposit. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="form-grid">
      <div className="card form-card">
        <h3 className="form-card-title">Make a deposit</h3>
        <p className="form-card-sub">
          You'll be taken to Paystack's secure checkout to pay by card. The amount lands in your
          book balance right away, then moves to your available balance once an admin confirms it.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="dep-amount">Amount (₦)</label>
            <input
              id="dep-amount"
              type="number"
              min="100"
              placeholder="50,000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {error && <p className="field-error" style={{ marginBottom: 14 }}>{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            <CreditCard size={16} />
            {loading ? "Redirecting to Paystack…" : "Continue to payment"}
          </button>
        </form>
      </div>

      <div className="card form-card">
        <h3 className="form-card-title">Recent deposits</h3>
        {history.length === 0 ? (
          <p className="form-card-sub">No deposits yet.</p>
        ) : (
          <div className="activity-history">
            {history.map((d) => {
              const meta = statusMeta[d.status] || statusMeta.pending_confirmation;
              return (
                <div className="activity-row" key={d.id}>
                  <div>
                    <p className="activity-amount nums">{naira(d.amount)}</p>
                    <p className="activity-date">{fmtDate(d.createdAt)}</p>
                    {(d.failureReason || d.declineReason) && (
                      <p className="activity-reason">{d.failureReason || d.declineReason}</p>
                    )}
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
