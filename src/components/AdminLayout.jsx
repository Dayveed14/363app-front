import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import { useAuth } from "../context/AuthContext";
import { adminNavItems } from "./navItems";
import "./AppLayout.css";

export default function AdminLayout() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // Not an admin at all — send members back to their own dashboard rather
  // than the login screen (they're signed in, just not allowed here).
  if (user.role !== "admin") return <Navigate to="/" replace />;

  const current = adminNavItems.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  return (
    <div className="app-shell">
      <Sidebar items={adminNavItems} brandSub="Admin" />
      <main className="app-main">
        <TopBar title={current?.label ?? "Overview"} />
        <Outlet />
      </main>
      <BottomNav items={adminNavItems} />
    </div>
  );
}
