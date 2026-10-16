import { LayoutGrid, ShieldCheck, ArrowDownToLine, ArrowUpFromLine, History, UserRound, Briefcase, Banknote } from "lucide-react";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/finance-facility", label: "Finance Facility", icon: Briefcase },
  { to: "/transactions", label: "Transactions", icon: History },
  { to: "/profile", label: "Profile", icon: UserRound },
];

// Separate nav for /admin/* — a different person (role) and a different
// job to be done, so it isn't just the member nav with items appended.
export const adminNavItems = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/admin/kyc", label: "KYC Review", icon: ShieldCheck },
  { to: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { to: "/admin/finance-facilities", label: "Finance Facility", icon: Briefcase },
  { to: "/admin/loan-repayments", label: "Loan Repayments", icon: Banknote },
];
