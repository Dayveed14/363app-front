// Status -> pill label/color, shared across deposits, withdrawals, and the
// merged transactions list. Centralized here so a status reads the same
// way everywhere it appears, rather than each page inventing its own copy.
export const statusMeta = {
  // deposits
  initialized: { label: "Awaiting payment", className: "pill-pending" },
  failed: { label: "Failed", className: "pill-declined" },
  pending_confirmation: { label: "Awaiting confirmation", className: "pill-pending" },
  confirmed: { label: "Confirmed", className: "pill-success" },
  // withdrawals
  pending: { label: "Awaiting review", className: "pill-pending" },
  approved: { label: "Approved", className: "pill-pending" },
  processed: { label: "Paid out", className: "pill-success" },
  // shared
  declined: { label: "Declined", className: "pill-declined" },
};
