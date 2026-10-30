import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const userName = localStorage.getItem("userName") || "Ananya Vatsalya";

  const navItems = [
    { path: "/dashboard", icon: "grid", label: "Dashboard" },
    { path: "/health-records", icon: "file", label: "Health Records" },
    { path: "/care-team", icon: "team", label: "Care Team" },
    { path: "/settings", icon: "gear", label: "Settings" }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <strong>Vatsalya</strong>
        <span>Caregiver Portal</span>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className={`nav-glyph nav-${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile" title="Caregiver profile">
          <span className="profile-dot">{userName.charAt(0).toUpperCase()}</span>
          <span>
            <strong>{userName}</strong>
            <small>Primary caregiver</small>
          </span>
        </div>
      </div>
    </aside>
  );
}
