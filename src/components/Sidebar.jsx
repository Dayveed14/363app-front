import { NavLink } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { navItems as memberNavItems } from "./navItems";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";
import logo from "../images/logo2.png";

export default function Sidebar({ items = memberNavItems, brandSub = "Member Portal" }) {
  const { user, logout } = useAuth();
  // Shown only on the member sidebar (brandSub differs on AdminLayout's),
  // so an admin who ends up back on "/" always has a way back in — not
  // just immediately after login.
  const showAdminLink = user?.role === "admin" && brandSub !== "Admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-mark">
          <img src={logo} alt="363 Cooperative Logo" />
        </div>
        <div>
          <div className="sidebar-brand-name">363 Cooperative</div>
          <div className="sidebar-brand-sub">{brandSub}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {showAdminLink && (
          <NavLink to="/admin" className="sidebar-link sidebar-admin-link">
            <ShieldCheck size={18} strokeWidth={2} />
            <span>Admin dashboard</span>
          </NavLink>
        )}

        <button className="sidebar-logout" onClick={logout}>
          <LogOut size={18} strokeWidth={2} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
