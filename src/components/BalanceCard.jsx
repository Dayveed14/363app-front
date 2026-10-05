import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, FileText } from "lucide-react";
import "./BalanceCard.css";

const naira = (n) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BalanceCard({ balance, bookBalance }) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="balance-card">
      <div className="balance-top">
        <div>
          <p className="balance-label">Total account balance</p>
          <div className="balance-amount nums">
            {hidden ? "₦ • • • • • •" : naira(balance)}
          </div>
          {bookBalance > 0 && (
            <p className="balance-book">
              + {hidden ? "••••" : naira(bookBalance)} pending confirmation
            </p>
          )}
        </div>
        <button className="balance-eye" onClick={() => setHidden((h) => !h)} aria-label="Toggle balance visibility">
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="balance-actions">
        <Link to="/deposit" className="balance-action">
          <ArrowDownToLine size={17} />
          Deposit
        </Link>
        <Link to="/withdraw" className="balance-action">
          <ArrowUpFromLine size={17} />
          Withdraw
        </Link>
        <Link to="/transactions" className="balance-action">
          <FileText size={17} />
          Statement
        </Link>
      </div>
    </div>
  );
}
