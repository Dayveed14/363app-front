import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePageMeta } from "../seo/usePageMeta";
import "./FormPage.css";
import "./Profile.css";

export default function Profile() {
  usePageMeta({ title: "Profile" });
  const { user } = useAuth();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSaved(false);
    if (!pw.current || !pw.next || !pw.confirm) {
      setError("Fill in all three fields.");
      return;
    }
    if (pw.next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    // Would call POST /profile/change-password here.
    setError("");
    setSaved(true);
    setPw({ current: "", next: "", confirm: "" });
  }

  return (
    <div className="form-grid">
      <div className="card form-card">
        <h3 className="form-card-title">Member details</h3>
        <p className="form-card-sub">Your account information on file with the cooperative.</p>

        <dl className="profile-list">
          <div className="profile-row">
            <dt>Full name</dt>
            <dd>{user.fullName}</dd>
          </div>
          <div className="profile-row">
            <dt>Member ID</dt>
            <dd className="nums">{user.memberId}</dd>
          </div>
          <div className="profile-row">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="profile-row">
            <dt>Phone</dt>
            <dd>{user.phone}</dd>
          </div>
        </dl>
      </div>

      <div className="card form-card">
        <h3 className="form-card-title">Change password</h3>
        <p className="form-card-sub">Use a password you don't use anywhere else.</p>

        {saved && (
          <div className="form-success" style={{ marginBottom: 18 }}>
            <CheckCircle2 size={20} />
            <div>
              <p className="form-success-title">Password updated</p>
              <p className="form-success-body">Use your new password next time you sign in.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="pw-current">Current password</label>
            <input
              id="pw-current"
              type="password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="pw-next">New password</label>
            <input
              id="pw-next"
              type="password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="pw-confirm">Confirm new password</label>
            <input
              id="pw-confirm"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </div>
          {error && <p className="field-error" style={{ marginTop: -10, marginBottom: 14 }}>{error}</p>}
          <button className="btn btn-primary btn-block" type="submit">
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
