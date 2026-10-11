import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FileText, Check, X, HelpCircle } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { usePageMeta } from "../../seo/usePageMeta";
import "./Admin.css";
import "./AdminFinanceFacilityDetail.css";

function errorMessage(err, fallback) {
  return err instanceof ApiError ? err.message : fallback;
}

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

const PURPOSE_LABEL = {
  working_capital: "Working capital",
  inventory: "Inventory",
  equipment: "Equipment",
  expansion: "Expansion",
  other: "Other",
};

export default function AdminFinanceFacilityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  usePageMeta({ title: app ? `Application #${app.id}` : "Finance Facility Application" });

  async function load() {
  try {
    const { application } = await api.admin.financeFacility.getOne(id);
    setApp(application);
  } catch {
    setApp(null);
  }
}

  useEffect(() => {
  load();
}, [id]);

  async function viewDocument(docId) {
    try {
      const blob = await api.admin.financeFacility.document(id, docId);
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load that document.");
    }
  }

  async function viewKycDocument(docType) {
    try {
      const blob = await api.admin.kyc.document(app.kyc.submissionId, docType);
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load that KYC document.");
    }
  }

  async function requestInfo() {
    const text = window.prompt("What information do you require from the member?");
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      await api.admin.financeFacility.requestInfo(id, text);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the request.");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    const reason = window.prompt("Reason for declining this application:");
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      await api.admin.financeFacility.decline(id, reason);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't decline this application.");
    } finally {
      setBusy(false);
    }
  }
  async function disburse() {
  const confirmed = window.confirm(
    `Confirm that ${naira(app.approvedAmount)} has actually been released to ${app.member.fullName}?`
  );

  if (!confirmed) return;

  const disbursementReference =
    window.prompt(
      "Enter the bank transfer or disbursement reference (optional):"
    )?.trim() || "";

  setBusy(true);
  setError("");

  try {
    await api.admin.financeFacility.disburse(
      id,
      disbursementReference || null
    );

    await load();
  } catch (err) {
    setError(
      errorMessage(err, "Couldn't mark this facility as disbursed.")
    );
  } finally {
    setBusy(false);
  }
  }
  if (app === undefined) return null;
  if (app === null) return <p className="admin-empty">Application not found.</p>;

  const decidable = ["submitted", "under_review", "additional_information_required"].includes(app.status);

  return (
    <div className="ffd-page">
      <button className="ffd-back" onClick={() => navigate("/admin/finance-facilities")}>
        <ArrowLeft size={16} /> Back to applications
      </button>

      <div className="card ffd-section">
        <p className="ffd-eyebrow">Member</p>
        <p className="ffd-member-name">{app.member.fullName}</p>
        <p className="admin-row-sub">{app.member.email} · {app.member.memberId}</p>
        {app.kyc && <span className="pill pill-success" style={{ marginTop: 8, display: "inline-block" }}>KYC {app.kyc.status}</span>}
      </div>

      <div className="card ffd-section">
        <p className="ffd-eyebrow">Facility Request</p>
        <p className="ffd-amount nums">{naira(app.amountRequested)}</p>
        <dl className="ffd-fields">
          <div><dt>Purpose</dt><dd>{PURPOSE_LABEL[app.purpose]}</dd></div>
          <div><dt>Description</dt><dd>{app.purposeDescription}</dd></div>
          <div><dt>Expected benefit</dt><dd>{app.expectedBenefit}</dd></div>
          <div><dt>Repayment source</dt><dd>{app.repaymentSource}</dd></div>
          <div><dt>Expected monthly income</dt><dd className="nums">{naira(app.expectedMonthlyIncome)}</dd></div>
          <div><dt>Expected monthly expenses</dt><dd className="nums">{naira(app.expectedMonthlyExpenses)}</dd></div>
          <div><dt>Business</dt><dd>{app.businessName} · {app.businessType} · {app.yearsInBusiness} yrs</dd></div>
          <div><dt>Business address</dt><dd>{app.businessAddress}</dd></div>
        </dl>
      </div>

      {app.accountAnalysis && (
        <div className="card ffd-section">
          <p className="ffd-eyebrow">Account Analysis</p>
          <div className="ffd-metrics">
            <div><span>Membership</span><strong>{app.accountAnalysis.membershipMonths} months</strong></div>
            <div><span>Total deposits</span><strong className="nums">{naira(app.accountAnalysis.totalDeposits)}</strong></div>
            <div><span>Avg. monthly deposits</span><strong className="nums">{naira(app.accountAnalysis.averageMonthlyDeposits)}</strong></div>
            <div><span>Deposit frequency</span><strong>{app.accountAnalysis.depositFrequency}/mo</strong></div>
            <div><span>Total withdrawals</span><strong className="nums">{naira(app.accountAnalysis.totalWithdrawals)}</strong></div>
            <div><span>Avg. monthly withdrawals</span><strong className="nums">{naira(app.accountAnalysis.averageMonthlyWithdrawals)}</strong></div>
          </div>
          {app.currentBalances && (
            <p className="admin-row-sub" style={{ marginTop: 10 }}>
              Current balance: {naira(app.currentBalances.availableBalance)} available, {naira(app.currentBalances.bookBalance)} pending
            </p>
          )}
        </div>
      )}

      {app.kyc && (
        <div className="card ffd-section">
          <p className="ffd-eyebrow">KYC / Member Information</p>
          <dl className="ffd-fields">
            <div><dt>Bank</dt><dd>{app.kyc.bankName} · {app.kyc.accountNumber}</dd></div>
            <div><dt>Address on file</dt><dd>{app.kyc.houseAddress}</dd></div>
          </dl>
          <div className="ffd-doc-links">
            <button className="admin-doc-link" onClick={() => viewKycDocument("idDocument")}>
              <FileText size={14} /> ID document
            </button>
            <button className="admin-doc-link" onClick={() => viewKycDocument("proofOfAddress")}>
              <FileText size={14} /> Proof of address
            </button>
          </div>
        </div>
      )}

      <div className="card ffd-section">
        <p className="ffd-eyebrow">Application Documents</p>
        {app.documents.length === 0 ? (
          <p className="admin-row-sub">No documents uploaded yet.</p>
        ) : (
          <div className="ffd-doc-links">
            {app.documents.map((d) => (
              <button key={d.id} className="admin-doc-link" onClick={() => viewDocument(d.id)}>
                <FileText size={14} /> {d.fileName}
              </button>
            ))}
          </div>
        )}
      </div>

      {app.status === "additional_information_required" && (
        <div className="card ffd-section">
          <p className="ffd-eyebrow">Information Requested</p>
          <p className="admin-row-sub">{app.additionalInformationRequest}</p>
        </div>
      )}
      {app.status === "declined" && (
        <div className="card ffd-section">
          <p className="ffd-eyebrow">Decline Reason</p>
          <p className="admin-row-sub">{app.declineReason}</p>
        </div>
      )}
      {app.status === "approved" && (
        <div className="card ffd-section">
          <p className="ffd-eyebrow">Approved Terms</p>

          <div className="ffd-metrics">
            <div>
              <span>Approved amount</span>
              <strong className="nums">{naira(app.approvedAmount)}</strong>
            </div>

            <div>
              <span>Interest rate</span>
              <strong>{app.interestRate}%</strong>
            </div>

            <div>
              <span>Term</span>
              <strong>{app.termMonths} months</strong>
            </div>

            <div>
              <span>Repayment</span>
              <strong className="nums">
                {naira(app.installmentAmount)}/{app.repaymentFrequency}
              </strong>
            </div>
          </div>

          <div className="ffd-actions" style={{ marginTop: 18 }}>
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy}
              onClick={disburse}
            >
              <Check size={15} />
              {busy ? "Processing..." : "Mark as Disbursed"}
            </button>
          </div>

          <p className="admin-row-sub" style={{ marginTop: 10 }}>
            Only mark this facility as disbursed after the funds have actually
            been released. This action records the disbursement; it does not
            transfer money.
          </p>
        </div>
      )}

      {app.status === "disbursed" && (
  <div className="card ffd-section">
    <p className="ffd-eyebrow">Facility Disbursed</p>

    <div className="ffd-metrics">
      <div>
        <span>Disbursed amount</span>
        <strong className="nums">{naira(app.approvedAmount)}</strong>
      </div>

      <div>
        <span>Disbursement date</span>
        <strong>
          {app.disbursedAt ? fmtDate(app.disbursedAt) : "Not recorded"}
        </strong>
      </div>

      <div>
        <span>Term</span>
        <strong>{app.termMonths} months</strong>
      </div>

      <div>
        <span>Repayment</span>
        <strong className="nums">
          {naira(app.installmentAmount)}/{app.repaymentFrequency}
        </strong>
      </div>
    </div>

    {app.disbursementReference && (
      <p className="admin-row-sub" style={{ marginTop: 10 }}>
        Reference: {app.disbursementReference}
      </p>
    )}
  </div>
      )}

      {error && <p className="field-error" style={{ margin: "0 4px 14px" }}>{error}</p>}

      {decidable && (
        <>
          <div className="ffd-actions">
            <button className="btn btn-ghost" disabled={busy} onClick={requestInfo}>
              <HelpCircle size={15} /> Request more information
            </button>
            <button className="btn btn-ghost admin-btn-decline" disabled={busy} onClick={decline}>
              <X size={15} /> Decline
            </button>
          </div>
          <ApproveForm applicationId={id} requestedAmount={app.amountRequested} onApproved={load} busy={busy} setBusy={setBusy} setError={setError} />
        </>
      )}
    </div>
  );
}

function ApproveForm({ applicationId, requestedAmount, onApproved, busy, setBusy, setError }) {
  const [terms, setTerms] = useState({
    approvedAmount: requestedAmount,
    interestRate: "",
    termMonths: "",
    repaymentFrequency: "monthly",
    installmentAmount: "",
  });

  function update(field) {
    return (e) => setTerms((t) => ({ ...t, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.admin.financeFacility.approve(applicationId, {
        approvedAmount: Number(terms.approvedAmount),
        interestRate: Number(terms.interestRate),
        termMonths: Number(terms.termMonths),
        repaymentFrequency: terms.repaymentFrequency,
        installmentAmount: Number(terms.installmentAmount),
      });
      onApproved();
    } catch (err) {
      setError(errorMessage(err, "Couldn't approve this application."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card ffd-section" onSubmit={submit}>
      <p className="ffd-eyebrow">Approve</p>
      <p className="admin-row-sub" style={{ marginBottom: 14 }}>
        You can approve a different amount or terms than requested.
      </p>
      <div className="ffd-approve-grid">
        <div className="field">
          <label>Approved amount (₦)</label>
          <input type="number" min="1" value={terms.approvedAmount} onChange={update("approvedAmount")} required />
        </div>
        <div className="field">
          <label>Interest rate (%)</label>
          <input type="number" min="0" step="0.1" value={terms.interestRate} onChange={update("interestRate")} required />
        </div>
        <div className="field">
          <label>Term (months)</label>
          <input type="number" min="1" value={terms.termMonths} onChange={update("termMonths")} required />
        </div>
        <div className="field">
          <label>Repayment frequency</label>
          <select value={terms.repaymentFrequency} onChange={update("repaymentFrequency")}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="field">
          <label>Installment amount (₦)</label>
          <input type="number" min="1" value={terms.installmentAmount} onChange={update("installmentAmount")} required />
        </div>
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        <Check size={15} /> Approve application
      </button>
    </form>
  );
}
