import { useEffect, useState } from "react";
import { api } from "../api/client";
import TransactionRow from "../components/TransactionRow";
import { usePageMeta } from "../seo/usePageMeta";
import "./Transactions.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
];

// A deposit's failure/decline reason and a withdrawal's decline reason are
// different field names on the two API shapes — this is the one place
// that difference gets flattened into the single `note` TransactionRow expects.
function toTxn(item, type) {
  const reasonText = type === "deposit" ? item.failureReason || item.declineReason : item.declineReason;
  return {
    id: `${type}-${item.id}`,
    type,
    amount: item.amount,
    date: item.createdAt,
    status: item.status,
    note: reasonText || (type === "deposit" ? "Card payment via Paystack" : `To ${item.bankName} · ${item.accountNumber}`),
  };
}

export default function Transactions() {
  usePageMeta({ title: "Transactions" });
  const [filter, setFilter] = useState("all");
  const [txns, setTxns] = useState(undefined); // undefined = loading

  useEffect(() => {
    Promise.all([api.deposits.listMine(), api.withdrawals.listMine()])
      .then(([{ deposits }, { withdrawals }]) => {
        const merged = [
          ...deposits.map((d) => toTxn(d, "deposit")),
          ...withdrawals.map((w) => toTxn(w, "withdrawal")),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        setTxns(merged);
      })
      .catch(() => setTxns([]));
  }, []);

  const filtered = !txns ? [] : filter === "all" ? txns : txns.filter((t) => t.type === filter);

  return (
    <div className="card txns-page">
      <div className="txns-page-head">
        <h3>All transactions</h3>
        <div className="txns-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={"txns-filter" + (filter === f.key ? " active" : "")}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {txns === undefined ? (
        <p className="txns-empty">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="txns-empty">No transactions in this category yet.</p>
      ) : (
        filtered.map((t) => <TransactionRow key={t.id} txn={t} />)
      )}
    </div>
  );
}
