const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

class ApiError extends Error {
  constructor(message, { status, code, attemptsLeft } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.attemptsLeft = attemptsLeft;
  }
}

export { ApiError };

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    // Every auth token (access, refresh, pending-2FA) lives in an httpOnly
    // cookie set by the backend — this app never sees or stores a token
    // value itself. `credentials: "include"` is what makes the browser
    // attach/accept those cookies on cross-origin requests (frontend and
    // backend are on different ports in dev, different domains in prod).
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || "Something went wrong. Please try again.", {
      status: res.status,
      code: data.code,
      attemptsLeft: data.attemptsLeft,
    });
  }

  return data;
}

// Separate from `request` because a multipart body must NOT have
// Content-Type set manually — the browser has to add its own boundary.
async function requestForm(path, formData) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || "Something went wrong. Please try again.", {
      status: res.status,
      code: data.code,
    });
  }

  return data;
}

// For KYC document previews — fetched as a blob (with auth cookies) rather
// than linked directly, so access control runs through the normal
// cookie-authenticated request instead of a bare, guessable URL.
async function requestBlob(path) {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || "Couldn't load this file.", { status: res.status });
  }
  return res.blob();
}

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  verifyEmail: (payload) => request("/api/auth/verify-email", { method: "POST", body: payload }),
  resendOtp: (payload) => request("/api/auth/resend-otp", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  verifyLoginOtp: (payload) => request("/api/auth/login/verify-otp", { method: "POST", body: payload }),
  refresh: () => request("/api/auth/refresh", { method: "POST" }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),

  kyc: {
    getMine: () => request("/api/kyc/me"),
    submit: (formData) => requestForm("/api/kyc", formData),
    document: (submissionId, docType) => requestBlob(`/api/kyc/${submissionId}/documents/${docType}`),
  },

  deposits: {
    initialize: (amount) => request("/api/deposits/initialize", { method: "POST", body: { amount } }),
    verify: (reference) => request(`/api/deposits/verify/${reference}`),
    listMine: () => request("/api/deposits/me"),
  },

  withdrawals: {
    // No token to pass for either call — the pending-withdrawal cookie
    // set by initiate is sent automatically by the browser on confirm.
    initiate: (amount) => request("/api/withdrawals/initiate", { method: "POST", body: { amount } }),
    confirm: (code) => request("/api/withdrawals/confirm", { method: "POST", body: { code } }),
    listMine: () => request("/api/withdrawals/me"),
  },

  financeFacility: {
    getEligibility: () => request("/api/finance-facilities/eligibility"),
    apply: (form) => request("/api/finance-facilities/apply", { method: "POST", body: form }),
    listMine: () => request("/api/finance-facilities/me"),
    getOne: (id) => request(`/api/finance-facilities/${id}`),
    addDocument: (id, formData) => requestForm(`/api/finance-facilities/${id}/documents`, formData),
    document: (id, docId) => requestBlob(`/api/finance-facilities/${id}/documents/${docId}`),
    acceptOffer: (id) => request(`/api/finance-facilities/${id}/offer/accept`, { method: "POST" }),
    declineOffer: (id) => request(`/api/finance-facilities/${id}/offer/decline`, { method: "POST" }),
  },
    financeFacilityRepayments: {
    // Repayment dashboard: facilities, balances, and next payments.
    getDashboard: () =>
      request("/api/finance-facility-repayments/dashboard"),

    // Get the repayment schedule for a facility.
    getSchedule: (facilityId) =>
      request(`/api/finance-facility-repayments/${facilityId}/schedule`),

    // Get the outstanding balance for a facility.
    getBalance: (facilityId) =>
      request(`/api/finance-facility-repayments/${facilityId}/balance`),

    // Get successful repayment history.
    getHistory: () =>
      request("/api/finance-facility-repayments/history"),

    // Initialize a Paystack repayment.
    initialize: (facilityId, amount) =>
      request(`/api/finance-facility-repayments/${facilityId}/initialize`, {
        method: "POST",
        body: { amount },
      }),

    // Verify a Paystack repayment after returning from checkout.
    verify: (reference) =>
      request("/api/finance-facility-repayments/verify", {
        method: "POST",
        body: { reference },
      }),
  },

  admin: {
    kyc: {
      list: (status) => request(`/api/admin/kyc${status ? `?status=${status}` : ""}`),
      approve: (id) => request(`/api/admin/kyc/${id}/approve`, { method: "POST" }),
      decline: (id, reason) => request(`/api/admin/kyc/${id}/decline`, { method: "POST", body: { reason } }),
      document: (submissionId, docType) =>
        requestBlob(`/api/admin/kyc/${submissionId}/documents/${docType}`),
    },
    deposits: {
      list: (status) => request(`/api/admin/deposits${status ? `?status=${status}` : ""}`),
      confirm: (id) => request(`/api/admin/deposits/${id}/confirm`, { method: "POST" }),
      decline: (id, reason) => request(`/api/admin/deposits/${id}/decline`, { method: "POST", body: { reason } }),
    },
    withdrawals: {
      list: (status) => request(`/api/admin/withdrawals${status ? `?status=${status}` : ""}`),
      approve: (id) => request(`/api/admin/withdrawals/${id}/approve`, { method: "POST" }),
      decline: (id, reason) => request(`/api/admin/withdrawals/${id}/decline`, { method: "POST", body: { reason } }),
      process: (id) => request(`/api/admin/withdrawals/${id}/process`, { method: "POST" }),
    },
    financeFacilityRepayments: {
      list: (status) =>
        request(`/api/finance-facility-repayments/admin${status ? `?status=${status}` : ""}`),
      confirm: (id) =>
        request(`/api/finance-facility-repayments/admin/${id}/confirm`, { method: "POST" }),
      decline: (id, reason) =>
        request(`/api/finance-facility-repayments/admin/${id}/decline`, { method: "POST", body: { reason } }),
    },
    financeFacility: {
      list: (status) => request(`/api/admin/finance-facilities${status ? `?status=${status}` : ""}`),
      getOne: (id) => request(`/api/admin/finance-facilities/${id}`),
      document: (id, docId) => requestBlob(`/api/admin/finance-facilities/${id}/documents/${docId}`),
      requestInfo: (id, requestText) =>
        request(`/api/admin/finance-facilities/${id}/request-info`, { method: "POST", body: { request: requestText } }),
      approve: (id, terms) =>
        request(`/api/admin/finance-facilities/${id}/approve`, { method: "POST", body: terms }),
      decline: (id, reason) =>
        request(`/api/admin/finance-facilities/${id}/decline`, { method: "POST", body: { reason } }),
      disburse: (id, disbursementReference) =>
        request(`/api/admin/finance-facilities/${id}/disburse`, {
          method: "POST",
          body: { disbursementReference },
        }),
    },
  },
};
