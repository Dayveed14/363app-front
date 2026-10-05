import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import { useAuth } from "../context/AuthContext";
import { navItems } from "./navItems";
import "./AppLayout.css";

export default function AppLayout() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  const current = navItems.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <TopBar title={current?.label ?? "Dashboard"} />
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
