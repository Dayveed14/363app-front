import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
} from "lucide-react";
import { statusMeta } from "../data/statusMeta";
import "./TransactionRow.css";

const naira = (value) =>
  "₦" +
  Number(value ?? 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function TransactionRow({ txn }) {
  const isDeposit = txn.type === "deposit";
  const isRepayment = txn.type === "repayment";
  const isWithdrawal = txn.type === "withdrawal";

  const meta = statusMeta?.[
    String(txn.status ?? "").toLowerCase()
  ] ?? {
    className: "pill-pending",
    label: txn.status
      ? String(txn.status).replace(/_/g, " ")
      : "Unknown",
  };

  const title = isRepayment
    ? "Loan repayment"
    : isDeposit
      ? "Deposit"
      : isWithdrawal
        ? "Withdrawal"
        : "Transaction";

  const amountClass = isDeposit
    ? "amount-in"
    : "amount-out";

  const amountPrefix = isDeposit ? "+" : "−";

  return (
    <div className="txn-row">
      <div
        className={
          "txn-icon " +
          (isDeposit
            ? "txn-icon-in"
            : isRepayment
              ? "txn-icon-repayment"
              : "txn-icon-out")
        }
      >
        {isDeposit ? (
          <ArrowDownToLine size={16} />
        ) : isRepayment ? (
          <Wallet size={16} />
        ) : (
          <ArrowUpFromLine size={16} />
        )}
      </div>

      <div className="txn-main">
        <p className="txn-title">{title}</p>
        <p className="txn-note">{txn.note || title}</p>
      </div>

      <div className="txn-meta">
        <p className={"txn-amount nums " + amountClass}>
          {amountPrefix}
          {naira(txn.amount)}
        </p>
        <p className="txn-date">{fmtDate(txn.date)}</p>
      </div>

      <span className={"pill " + meta.className}>
        {meta.label}
      </span>
    </div>
  );
}
