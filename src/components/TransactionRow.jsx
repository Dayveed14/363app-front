import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { statusMeta } from "../data/statusMeta";
import "./TransactionRow.css";

const naira = (n) => "₦" + n.toLocaleString("en-NG");

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

export default function TransactionRow({ txn }) {
  const isDeposit = txn.type === "deposit";
  const meta = statusMeta[txn.status];

  return (
    <div className="txn-row">
      <div className={"txn-icon " + (isDeposit ? "txn-icon-in" : "txn-icon-out")}>
        {isDeposit ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
      </div>

      <div className="txn-main">
        <p className="txn-title">{isDeposit ? "Deposit" : "Withdrawal"}</p>
        <p className="txn-note">{txn.note}</p>
      </div>

      <div className="txn-meta">
        <p className={"txn-amount nums " + (isDeposit ? "amount-in" : "amount-out")}>
          {isDeposit ? "+" : "−"}
          {naira(txn.amount)}
        </p>
        <p className="txn-date">{fmtDate(txn.date)}</p>
      </div>

      <span className={"pill " + meta.className}>{meta.label}</span>
    </div>
  );
}
