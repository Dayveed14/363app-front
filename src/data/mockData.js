// All data here is local, in-memory mock data.
// Swap this out for real API calls once the backend is ready.

export const mockMember = {
  fullName: "Adaeze Okonkwo",
  memberId: "363-CS-00482",
  email: "adaeze.okonkwo@example.com",
  phone: "080 1234 5678",
  balance: 842500,
  bookBalance: 25000, // pending, unconfirmed deposits
  interestRate: 4.5, // % per annum, illustrative
  interestAccruedYTD: 18320,
};

export const mockTransactions = [
  {
    id: "TXN-10293",
    type: "deposit",
    amount: 50000,
    date: "2026-09-14T09:22:00",
    status: "confirmed",
    note: "Bank transfer — GTBank",
  },
  {
    id: "TXN-10281",
    type: "withdrawal",
    amount: 30000,
    date: "2026-09-10T14:05:00",
    status: "processing",
    note: "To 0123456789 — Access Bank",
  },
  {
    id: "TXN-10260",
    type: "deposit",
    amount: 100000,
    date: "2026-09-02T11:40:00",
    status: "confirmed",
    note: "Bank transfer — Zenith Bank",
  },
  {
    id: "TXN-10233",
    type: "withdrawal",
    amount: 15000,
    date: "2026-08-27T16:12:00",
    status: "declined",
    note: "To 0987654321 — UBA — insufficient book balance",
  },
  {
    id: "TXN-10201",
    type: "deposit",
    amount: 25000,
    date: "2026-08-19T08:50:00",
    status: "pending",
    note: "Awaiting accountant confirmation",
  },
  {
    id: "TXN-10188",
    type: "deposit",
    amount: 75000,
    date: "2026-08-05T10:15:00",
    status: "confirmed",
    note: "Bank transfer — GTBank",
  },
];

export const statusMeta = {
  confirmed: { label: "Confirmed", className: "pill-success" },
  processing: { label: "Processing", className: "pill-pending" },
  pending: { label: "Pending", className: "pill-pending" },
  declined: { label: "Declined", className: "pill-declined" },
};
