import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock3,
  ShieldAlert,
  Upload,
  FileText,
} from "lucide-react";
import { api, ApiError } from "../api/client";
import { usePageMeta } from "../seo/usePageMeta";
import "./FormPage.css";
import "./Kyc.css";
import "./BusinessFinanceFacility.css";

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_LABEL = {
  submitted: "Submitted",
  under_review: "Under review",
  additional_information_required: "Action needed",
  approved: "Approved",
  declined: "Declined",
  offer_accepted: "Accepted — awaiting disbursement",
  offer_declined: "Offer declined",
  disbursed: "Disbursed",
  completed: "Fully repaid",
};

const PURPOSE_OPTIONS = [
  { value: "working_capital", label: "Working capital" },
  { value: "inventory", label: "Inventory" },
  { value: "equipment", label: "Equipment" },
  { value: "expansion", label: "Expansion" },
  { value: "other", label: "Other" },
];

const REQUIRED_DOCS = [
  { type: "business_registration", label: "Business registration document" },
  { type: "bank_statement", label: "Bank statement" },
  { type: "financial_records", label: "Business financial records" },
];

const ACTIVE_STATUSES = ["submitted", "under_review", "additional_information_required", "approved", "offer_accepted", "disbursed"];

export default function BusinessFinanceFacility() {
  usePageMeta({ title: "Business Finance Facility" });

  const [history, setHistory] = useState(undefined); // undefined = loading
  const [view, setView] = useState("loading"); // loading | status | eligibility | form
  const [active, setActive] = useState(null);

  function load() {
    api.financeFacility
      .listMine()
      .then(({ applications }) => {
        setHistory(applications);
        const current = applications.find((a) => ACTIVE_STATUSES.includes(a.status));
        setActive(current || null);
        setView(current ? "status" : "eligibility");
      })
      .catch(() => {
        setHistory([]);
        setView("eligibility");
      });
  }

  useEffect(load, []);

  if (view === "loading") return null;

  return (
    <div className="ff-page">
      {view === "status" && active && (
        <ApplicationStatus application={active} onRefresh={load} />
      )}

      {view === "eligibility" && <EligibilityGate onApply={() => setView("form")} />}

      {view === "form" && (
        <ApplicationForm onSubmitted={() => load()} onCancel={() => setView("eligibility")} />
      )}

      {history && history.length > 0 && (
        <div className="card ff-history">
          <h3 className="form-card-title">Application history</h3>
          {history.map((a) => (
            <div className="ff-history-row" key={a.id}>
              <div>
                <p className="ff-history-amount nums">{naira(a.amountRequested)}</p>
                <p className="ff-history-date">{fmtDate(a.submittedAt)}</p>
              </div>
              <span className={"pill " + statusPillClass(a.status)}>{STATUS_LABEL[a.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusPillClass(status) {
  if (status === "approved" || status === "offer_accepted" || status === "completed") return "pill-success";
  if (status === "declined" || status === "offer_declined") return "pill-declined";
  return "pill-pending";
}

// --- Eligibility check ---

function EligibilityGate({ onApply }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function check() {
    setLoading(true);
    setError("");
    try {
      const r = await api.financeFacility.getEligibility();
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't check eligibility. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <div className="card ff-intro">
        <div className="ff-intro-icon"><Briefcase size={22} /></div>
        <h2 className="form-card-title">Business Finance Facility</h2>
        <p className="form-card-sub">
          Financing for your business — working capital, inventory, equipment, or expansion.
        </p>
        <p className="ff-status-title">No active application</p>
        <p className="form-card-sub">You may be eligible to apply for a Business Finance Facility.</p>
        {error && <p className="field-error" style={{ marginBottom: 14 }}>{error}</p>}
        <button className="btn btn-primary" onClick={check} disabled={loading}>
          {loading ? "Checking…" : "Check my eligibility"}
        </button>
      </div>
    );
  }

  const checkLabels = {
    kyc: "KYC",
    membership: "Membership history",
    depositActivity: "Deposit activity",
    withdrawalActivity: "Withdrawal activity",
    financialCapacity: "Financial capacity",
    existingFacility: "Existing facility",
  };

  return (
    <div className="card ff-intro">
      <h2 className="form-card-title">Eligibility assessment</h2>
      <div className="ff-checklist">
        {Object.entries(result.checks).map(([key, passed]) => (
          <div className="ff-checklist-row" key={key}>
            {passed ? <CheckCircle2 size={16} className="ff-check-pass" /> : <XCircle size={16} className="ff-check-fail" />}
            <span>{checkLabels[key] || key}</span>
          </div>
        ))}
        <div className="ff-checklist-row ff-checklist-note">
          <ShieldAlert size={16} />
          <span>Business purpose — assessed once you apply</span>
        </div>
      </div>

      <div className={"ff-verdict " + (result.eligible ? "ff-verdict-pass" : "ff-verdict-fail")}>
        {result.eligible ? "Preliminarily eligible" : "Not currently eligible"}
      </div>
      <p className="form-card-sub">{result.note}</p>

      {result.eligible && (
        <button className="btn btn-primary" onClick={onApply} style={{ marginTop: 10 }}>
          Start application
        </button>
      )}
    </div>
  );
}

// --- Application form ---

const EMPTY_FORM = {
  amountRequested: "",
  purpose: "working_capital",
  purposeDescription: "",
  expectedBenefit: "",
  repaymentSource: "",
  expectedMonthlyIncome: "",
  expectedMonthlyExpenses: "",
  businessName: "",
  businessType: "",
  businessAddress: "",
  yearsInBusiness: "",
};

function ApplicationForm({ onSubmitted, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { application } = await api.financeFacility.apply(form);
      setSubmittedId(application.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your application. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submittedId) {
    return <DocumentChecklist applicationId={submittedId} onDone={onSubmitted} />;
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h3 className="form-card-title">Facility request</h3>

      <div className="field">
        <label htmlFor="amountRequested">Amount requested (₦)</label>
        <input id="amountRequested" type="number" min="1" value={form.amountRequested} onChange={update("amountRequested")} />
      </div>

      <div className="field">
        <label htmlFor="purpose">Purpose of facility</label>
        <select id="purpose" value={form.purpose} onChange={update("purpose")}>
          {PURPOSE_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="purposeDescription">Describe how the facility will be used</label>
        <input id="purposeDescription" value={form.purposeDescription} onChange={update("purposeDescription")} />
      </div>

      <div className="field">
        <label htmlFor="expectedBenefit">Expected business benefit</label>
        <input id="expectedBenefit" value={form.expectedBenefit} onChange={update("expectedBenefit")} />
      </div>

      <div className="field">
        <label htmlFor="repaymentSource">Expected repayment source</label>
        <input id="repaymentSource" value={form.repaymentSource} onChange={update("repaymentSource")} />
      </div>

      <div className="ff-form-row">
        <div className="field">
          <label htmlFor="expectedMonthlyIncome">Expected monthly business income (₦)</label>
          <input id="expectedMonthlyIncome" type="number" min="0" value={form.expectedMonthlyIncome} onChange={update("expectedMonthlyIncome")} />
        </div>
        <div className="field">
          <label htmlFor="expectedMonthlyExpenses">Expected monthly expenses (₦)</label>
          <input id="expectedMonthlyExpenses" type="number" min="0" value={form.expectedMonthlyExpenses} onChange={update("expectedMonthlyExpenses")} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="businessName">Business name</label>
        <input id="businessName" value={form.businessName} onChange={update("businessName")} />
      </div>

      <div className="ff-form-row">
        <div className="field">
          <label htmlFor="businessType">Business type</label>
          <input id="businessType" value={form.businessType} onChange={update("businessType")} />
        </div>
        <div className="field">
          <label htmlFor="yearsInBusiness">Years operating</label>
          <input id="yearsInBusiness" type="number" min="0" step="0.5" value={form.yearsInBusiness} onChange={update("yearsInBusiness")} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="businessAddress">Business address</label>
        <input id="businessAddress" value={form.businessAddress} onChange={update("businessAddress")} />
      </div>

      {error && <p className="field-error" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="ff-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}

// --- Document checklist (shown right after submit, and reused for info-request uploads) ---

function DocumentChecklist({ applicationId, onDone }) {
  const [uploaded, setUploaded] = useState({});
  const [busyType, setBusyType] = useState(null);
  const [error, setError] = useState("");

  async function handleUpload(docType, file) {
    if (!file) return;
    setBusyType(docType);
    setError("");
    const formData = new FormData();
    formData.append("documentType", docType);
    formData.append("document", file);
    try {
      await api.financeFacility.addDocument(applicationId, formData);
      setUploaded((u) => ({ ...u, [docType]: file.name }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload that document.");
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div className="card form-card">
      <div className="form-success" style={{ marginBottom: 18 }}>
        <CheckCircle2 size={20} />
        <div>
          <p className="form-success-title">Application submitted</p>
          <p className="form-success-body">
            Your identity was already verified through your approved KYC — no need to resend those.
            Just attach the facility-specific documents below.
          </p>
        </div>
      </div>

      <div className="ff-doc-checklist">
        {REQUIRED_DOCS.map((doc) => (
          <label key={doc.type} className="kyc-file-field">
            <span className="kyc-file-label">{doc.label}</span>
            <div className={"kyc-file-drop" + (uploaded[doc.type] ? " has-file" : "")}>
              {uploaded[doc.type] ? <CheckCircle2 size={16} /> : <Upload size={16} />}
              <span>{uploaded[doc.type] || (busyType === doc.type ? "Uploading…" : "Choose a PDF, JPEG, or PNG")}</span>
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleUpload(doc.type, e.target.files?.[0])}
              hidden
              disabled={busyType === doc.type}
            />
          </label>
        ))}
      </div>

      {error && <p className="field-error" style={{ marginTop: 14 }}>{error}</p>}

      <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={onDone}>
        Done — go to my application
      </button>
    </div>
  );
}

// --- Active application status ---

function ApplicationStatus({ application, onRefresh }) {
if (application.status === "disbursed") {
return ( <div className="card ff-offer"> <p className="ff-status-eyebrow">Facility Active</p>

    <p className="ff-offer-amount nums">
      {naira(application.approvedAmount)}
    </p>

    {Number(application.amountRequested) !==
      Number(application.approvedAmount) && (
      <p className="form-card-sub">
        Requested {naira(application.amountRequested)}
      </p>
    )}

    <div className="ff-offer-terms">
      <div>
        <span>Term</span>
        <strong>{application.termMonths} months</strong>
      </div>

      <div>
        <span>Repayment</span>
        <strong>
          {naira(application.installmentAmount)}/
          {application.repaymentFrequency}
        </strong>
      </div>

      <div>
        <span>Interest</span>
        <strong>{application.interestRate}%</strong>
      </div>
    </div>

    {application.disbursedAt && (
      <p className="form-card-sub" style={{ marginTop: 12 }}>
        Disbursed on {fmtDate(application.disbursedAt)}
      </p>
    )}

    <p className="form-card-sub" style={{ marginTop: 12 }}>
      Your finance facility has been disbursed successfully. Please keep
      track of your repayment obligations according to the agreed terms.
    </p>

    {application.disbursementReference && (
      <p className="form-card-sub" style={{ marginTop: 8 }}>
        Disbursement reference: {application.disbursementReference}
      </p>
    )}

    <Link
      to={`/finance-facility-repayments/${application.id}`}
      className="btn btn-primary"
      style={{ marginTop: 16, display: "inline-block" }}
    >
      View repayment plan
    </Link>
  </div>
);


}

if (application.status === "approved") {
return <OfferCard application={application} onRefresh={onRefresh} />;
}

if (application.status === "offer_accepted") {
return (
  <div className="card ff-offer">
    <p className="ff-status-eyebrow">Offer Accepted — Awaiting Disbursement</p>

    <p className="ff-offer-amount nums">{naira(application.approvedAmount)}</p>

    <div className="ff-offer-terms">
      <div>
        <span>Term</span>
        <strong>{application.termMonths} months</strong>
      </div>
      <div>
        <span>Repayment</span>
        <strong>
          {naira(application.installmentAmount)}/{application.repaymentFrequency}
        </strong>
      </div>
      <div>
        <span>Interest</span>
        <strong>{application.interestRate}%</strong>
      </div>
    </div>

    <p className="form-card-sub" style={{ marginTop: 12 }}>
      You accepted this offer{application.offerAcceptedAt ? ` on ${fmtDate(application.offerAcceptedAt)}` : ""}.
      An officer will disburse the facility and we'll email you when it's done.
    </p>
  </div>
);
}

if (application.status === "additional_information_required") {
return (
<> <div className="card kyc-status kyc-status-declined"> <ShieldAlert size={20} /> <div> <p className="kyc-status-title">
An officer requested more information </p> <p className="kyc-status-body">
{application.additionalInformationRequest} </p> </div> </div>

    <DocumentChecklist
      applicationId={application.id}
      onDone={onRefresh}
    />
  </>
);


}

if (application.status === "declined") {
return ( <div className="card kyc-status kyc-status-declined"> <XCircle size={20} /> <div> <p className="kyc-status-title">Application declined</p> <p className="kyc-status-body">
Unfortunately, your finance facility application was declined.
Please contact the cooperative for more information. </p> </div> </div>
);
}

// submitted / under_review
return ( <div className="card ff-intro"> <div className="ff-intro-icon"> <Clock3 size={22} /> </div>


  <p className="ff-status-title">
    {application.status === "submitted" ? "Submitted" : "Under review"}
  </p>

  <p className="form-card-sub">
    Your request for {naira(application.amountRequested)} is being reviewed.
    We'll email you once there's an update.
  </p>

  {Array.isArray(application.documents) &&
    application.documents.length > 0 && (
      <div className="ff-doc-list">
        {application.documents.map((d) => (
          <span key={d.id} className="ff-doc-chip">
            <FileText size={13} /> {d.fileName}
          </span>
        ))}
      </div>
    )}
</div>


);
}



function OfferCard({ application, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function respond(kind) {
    if (
      kind === "decline" &&
      !window.confirm("Decline this offer? You can apply again afterwards.")
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (kind === "accept") await api.financeFacility.acceptOffer(application.id);
      else await api.financeFacility.declineOffer(application.id);
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't record your response. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card ff-offer">
      <p className="ff-status-eyebrow">Facility Offer</p>

      <p className="ff-offer-amount nums">{naira(application.approvedAmount)}</p>

      {Number(application.amountRequested) !== Number(application.approvedAmount) && (
        <p className="form-card-sub">Requested {naira(application.amountRequested)}</p>
      )}

      <div className="ff-offer-terms">
        <div>
          <span>Term</span>
          <strong>{application.termMonths} months</strong>
        </div>
        <div>
          <span>Repayment</span>
          <strong>
            {naira(application.installmentAmount)}/{application.repaymentFrequency}
          </strong>
        </div>
        <div>
          <span>Interest</span>
          <strong>{application.interestRate}%</strong>
        </div>
      </div>

      <p className="form-card-sub" style={{ marginTop: 12 }}>
        Your application has been approved. Accept the offer to proceed to disbursement,
        or decline it — you can apply again at any time.
      </p>

      {error && <p className="field-error" style={{ marginTop: 10 }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn btn-primary" disabled={busy} onClick={() => respond("accept")}>
          {busy ? "Please wait…" : "Accept offer"}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => respond("decline")}>
          Decline offer
        </button>
      </div>
    </div>
  );
}
