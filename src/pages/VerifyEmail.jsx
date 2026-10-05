import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { useAuth, ApiError } from "../context/AuthContext";
import { usePageMeta } from "../seo/usePageMeta";
import OtpInput from "../components/OtpInput";
import "./Login.css";

export default function VerifyEmail() {
  usePageMeta({ title: "Verify your email" });

  const { verifyEmail, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  if (!email) return <Navigate to="/register" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 6) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      await verifyEmail({ email, code });
      navigate("/login", { replace: true, state: { justVerified: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setResent(false);
    try {
      await resendOtp({ email, purpose: "email_verification" });
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code. Try again shortly.");
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-mark"><MailCheck size={20} /></div>
        <h2 className="login-heading">Check your email</h2>
        <p className="login-sub">
          We sent a 6-digit code to <strong>{email}</strong>. It expires in 5 minutes.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <OtpInput value={otp} onChange={setOtp} />

          {error && <p className="field-error login-error">{error}</p>}
          {resent && !error && <p className="login-footnote" style={{ marginBottom: 14 }}>A new code is on its way.</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <p className="login-footnote">
          Didn't get it?{" "}
          <button type="button" className="login-link-btn" onClick={handleResend}>
            Resend code
          </button>
        </p>
      </div>
    </div>
  );
}
