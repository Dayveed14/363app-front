import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import { usePageMeta } from "../seo/usePageMeta";
import "./Login.css";

const EMPTY = { fullName: "", email: "", phone: "", password: "", confirmPassword: "" };

export default function Register() {
  usePageMeta({
    title: "Create account",
    description: "Register for a 363 Cooperative Society member account.",
    indexable: true,
  });

  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate("/verify-email", { replace: true, state: { email: form.email } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-mark">363</div>
        <h2 className="login-heading">Create your account</h2>
        <p className="login-sub">Join 363 Cooperative Society — takes about a minute.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" value={form.fullName} onChange={update("fullName")} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={update("email")}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              placeholder="+2348012345678"
              value={form.phone}
              onChange={update("phone")}
              autoComplete="tel"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={update("password")}
              autoComplete="new-password"
            />
            <span className="field-hint">At least 8 characters, with an uppercase letter and a number.</span>
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="field-error login-error">{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="login-footnote">
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      </div>

      <p className="login-demo-note">
        Full KYC (ID, next of kin, bank details) is collected after your account is verified.
      </p>
    </div>
  );
}
