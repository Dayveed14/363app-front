import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import { usePageMeta } from "../seo/usePageMeta";
import "./Login.css";
import logo from "../images/banner.png";

export default function Login() {
  usePageMeta({
    title: "Sign in",
    description: "Sign in to your 363 Cooperative Society member account.",
    indexable: true,
  });

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Login sets a pending_2fa httpOnly cookie server-side — nothing to
      // carry forward here except the email, for display on the next screen.
      await login({ email, password });
      navigate("/login/verify-otp", {
        replace: true,
        state: { email, from: location.state?.from },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-mark"><img src={logo} alt="363 Cooperative Society" /></div>
        <h2 className="login-heading">Sign in to your account</h2>
        <p className="login-sub">Access your contributions, withdrawals and finance facility.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="field-error login-error">{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>

        <p className="login-footnote">
          New member? <Link to="/register">Create an account</Link>
        </p>
      </div>

      <p className="login-demo-note">
        After your password, we'll email a 6-digit code to confirm it's you.
      </p>
    </div>
  );
}
