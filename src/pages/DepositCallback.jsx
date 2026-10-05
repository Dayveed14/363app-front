import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { api, ApiError } from "../api/client";
import { usePageMeta } from "../seo/usePageMeta";
import "./Login.css"; // reuses the centered-panel shell from the auth pages
import "./DepositCallback.css";

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");

export default function DepositCallback() {
  usePageMeta({ title: "Confirming your deposit" });
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");

  const [state, setState] = useState("loading"); // loading | success | pending | failed | error
  const [deposit, setDeposit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) {
      setState("error");
      setError("No deposit reference was provided.");
      return;
    }

    api.deposits
      .verify(reference)
      .then(({ deposit: d }) => {
        setDeposit(d);
        setState(d.status === "failed" ? "failed" : "pending");
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof ApiError ? err.message : "Couldn't confirm this deposit.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <div className="login-screen">
      <div className="login-panel deposit-callback-panel">
        {state === "loading" && (
          <>
            <div className="login-mark"><Clock3 size={20} /></div>
            <h2 className="login-heading">Confirming your payment…</h2>
            <p className="login-sub">This only takes a moment.</p>
          </>
        )}

        {state === "pending" && deposit && (
          <>
            <div className="login-mark deposit-callback-mark-success"><CheckCircle2 size={20} /></div>
            <h2 className="login-heading">Payment received</h2>
            <p className="login-sub">
              <strong>{naira(deposit.amount)}</strong> has been added to your book balance. It'll move
              to your available balance once an admin confirms it — you'll get an email either way.
            </p>
          </>
        )}

        {state === "failed" && deposit && (
          <>
            <div className="login-mark deposit-callback-mark-failed"><XCircle size={20} /></div>
            <h2 className="login-heading">Payment not successful</h2>
            <p className="login-sub">
              {deposit.failureReason || "Please contact your bank, or try again with a different card."}
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="login-mark deposit-callback-mark-failed"><XCircle size={20} /></div>
            <h2 className="login-heading">Something went wrong</h2>
            <p className="login-sub">{error}</p>
          </>
        )}

        {state !== "loading" && (
          <Link to="/deposit" className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
            Back to deposits
          </Link>
        )}
      </div>
    </div>
  );
}
