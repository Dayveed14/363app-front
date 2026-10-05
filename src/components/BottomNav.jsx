import { NavLink } from "react-router-dom";
import { navItems as memberNavItems } from "./navItems";
import "./BottomNav.css";

export default function BottomNav({ items = memberNavItems }) {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => "bottom-nav-link" + (isActive ? " active" : "")}
        >
          <Icon size={20} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
