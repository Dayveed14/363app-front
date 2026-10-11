import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth, ApiError } from "../context/AuthContext";
import { usePageMeta } from "../seo/usePageMeta";
import OtpInput from "../components/OtpInput";
import "./Login.css";

export default function LoginVerify() {
  usePageMeta({ title: "Verify it's you" });

  const { verifyLoginOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { email, from } = location.state || {};

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  // No token to check here — the pending-2FA cookie set during step 1 is
  // what actually authorizes this step. `email` is only kept for display;
  // if it's missing the person didn't come from the login form, so send
  // them back there.
  if (!email) return <Navigate to="/login" replace />;

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
      const { user } = await verifyLoginOtp({ code });
      // Admins should land in the admin area by default. Only honour a saved
      // destination when it belongs to the signed-in user's area.
      const requestedPath = from?.pathname;
      const destination = user?.role === "admin"
        ? (requestedPath?.startsWith("/admin") ? requestedPath : "/admin")
        : (requestedPath && !requestedPath.startsWith("/admin") ? requestedPath : "/");
      navigate(destination, { replace: true });
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
      await resendOtp({ email, purpose: "login_2fa" });
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code. Try again shortly.");
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-mark"><ShieldCheck size={20} /></div>
        <h2 className="login-heading">Confirm it's you</h2>
        <p className="login-sub">
          We sent a 6-digit code to <strong>{email}</strong>. It expires in 5 minutes.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <OtpInput value={otp} onChange={setOtp} />

          {error && <p className="field-error login-error">{error}</p>}
          {resent && !error && <p className="login-footnote" style={{ marginBottom: 14 }}>A new code is on its way.</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Verifying…" : "Sign in"}
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
