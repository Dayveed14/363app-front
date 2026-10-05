import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Clock3, Upload } from "lucide-react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePageMeta } from "../seo/usePageMeta";
import "./FormPage.css";
import "./Kyc.css";

const EMPTY = { accountNumber: "", bankName: "", houseAddress: "" };

export default function Kyc() {
  usePageMeta({ title: "KYC Verification" });
  const { user } = useAuth();

  const [submission, setSubmission] = useState(undefined); // undefined = loading
  const [form, setForm] = useState(EMPTY);
  const [idDocument, setIdDocument] = useState(null);
  const [proofOfAddress, setProofOfAddress] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    api.kyc
      .getMine()
      .then(({ submission: sub }) => {
        setSubmission(sub);
        if (sub) {
          setForm({
            accountNumber: sub.accountNumber,
            bankName: sub.bankName,
            houseAddress: sub.houseAddress,
          });
        }
      })
      .catch(() => setSubmission(null));
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!idDocument || !proofOfAddress) {
      setError("Please attach both documents.");
      return;
    }

    const formData = new FormData();
    formData.append("accountNumber", form.accountNumber);
    formData.append("bankName", form.bankName);
    formData.append("houseAddress", form.houseAddress);
    formData.append("idDocument", idDocument);
    formData.append("proofOfAddress", proofOfAddress);

    setLoading(true);
    try {
      const { submission: sub } = await api.kyc.submit(formData);
      setSubmission(sub);
      setJustSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submission === undefined) return null; // brief load, avoid a status flash

  // Already verified — nothing to do here.
  if (submission?.status === "approved" && !justSubmitted) {
    return (
      <div className="card kyc-status kyc-status-approved">
        <ShieldCheck size={22} />
        <div>
          <p className="kyc-status-title">You're verified</p>
          <p className="kyc-status-body">
            Your KYC was approved. {user?.fullName?.split(" ")[0]}, your account is fully active.
          </p>
        </div>
      </div>
    );
  }

  // Pending review — nothing to do but wait.
  if (submission?.status === "pending" && !justSubmitted) {
    return (
      <div className="card kyc-status kyc-status-pending">
        <Clock3 size={22} />
        <div>
          <p className="kyc-status-title">Submitted — awaiting review</p>
          <p className="kyc-status-body">
            Your KYC documents were submitted on{" "}
            {new Date(submission.submittedAt).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}
            . An admin will review them shortly.
          </p>
        </div>
      </div>
    );
  }

  const isResubmission = submission?.status === "declined";

  return (
    <div className="kyc-page">
      {isResubmission && !justSubmitted && (
        <div className="card kyc-status kyc-status-declined">
          <ShieldAlert size={22} />
          <div>
            <p className="kyc-status-title">Changes needed</p>
            <p className="kyc-status-body">{submission.declineReason}</p>
          </div>
        </div>
      )}

      {justSubmitted && (
        <div className="card kyc-status kyc-status-pending">
          <Clock3 size={22} />
          <div>
            <p className="kyc-status-title">Resubmitted — awaiting review</p>
            <p className="kyc-status-body">Your updated documents are with an admin now.</p>
          </div>
        </div>
      )}

      {!justSubmitted && (
        <form className="card form-card kyc-form" onSubmit={handleSubmit}>
          <h3 className="form-card-title">{isResubmission ? "Resubmit your KYC" : "Complete your KYC"}</h3>
          <p className="form-card-sub">
            We need these details to activate your account for deposits and withdrawals.
          </p>

          <div className="field">
            <label htmlFor="accountNumber">Account number</label>
            <input
              id="accountNumber"
              placeholder="0123456789"
              maxLength={10}
              value={form.accountNumber}
              onChange={update("accountNumber")}
            />
          </div>
          <div className="field">
            <label htmlFor="bankName">Bank name</label>
            <input id="bankName" placeholder="e.g. GTBank" value={form.bankName} onChange={update("bankName")} />
          </div>
          <div className="field">
            <label htmlFor="houseAddress">House address</label>
            <input
              id="houseAddress"
              placeholder="Street, city, state"
              value={form.houseAddress}
              onChange={update("houseAddress")}
            />
          </div>

          <div className="kyc-upload-row">
            <FileField label="Identity document" hint="National ID, passport, or driver's licence" file={idDocument} onChange={setIdDocument} />
            <FileField label="Proof of address" hint="Utility bill or bank statement" file={proofOfAddress} onChange={setProofOfAddress} />
          </div>

          {error && <p className="field-error" style={{ marginBottom: 14 }}>{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Submitting…" : isResubmission ? "Resubmit for review" : "Submit for review"}
          </button>
        </form>
      )}
    </div>
  );
}

function FileField({ label, hint, file, onChange }) {
  return (
    <label className="kyc-file-field">
      <span className="kyc-file-label">{label}</span>
      <div className={"kyc-file-drop" + (file ? " has-file" : "")}>
        <Upload size={16} />
        <span>{file ? file.name : "Choose a PDF, JPEG, or PNG"}</span>
      </div>
      <span className="field-hint">{hint}</span>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        hidden
      />
    </label>
  );
}
