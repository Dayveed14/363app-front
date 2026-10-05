import { useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./TopBar.css";
import banner from "../images/banner.png";
import banner2 from "../images/bannerFS.png";

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TopBar({ title }) {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="topbar-container">
      <div className="topbar-banner">
        <img src={banner} alt="363 Cooperative Banner" />
      </div>

      <div className="topbar-banner2">
        <img src={banner2} alt="363 Cooperative Banner" />
      </div>

      <header className="topbar">
        <div>
          <h1 className="topbar-title">{title}</h1>

          {user && (
            <p className="topbar-sub">
              {greeting()}, {user.fullName.split(" ")[0]} — here's your account today.
            </p>
          )}
        </div>

        <div className="topbar-actions">
          <button className="topbar-bell" aria-label="Notifications">
            <Bell size={18} />
          </button>

          <div className="topbar-profile">
            <button
              className="topbar-avatar"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Account menu"
            >
              {user ? initials(user.fullName) : ""}
            </button>

            {showMenu && (
              <div className="topbar-dropdown">
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}