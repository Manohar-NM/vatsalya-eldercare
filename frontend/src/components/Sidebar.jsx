import { NavLink, useNavigate } from "react-router-dom";
import vatsalyaLogo from "../assets/vatsalya-logo.jpeg";
import "./Sidebar.css";

export default function Sidebar({ onSOSClick }) {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Caregiver";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const navItems = [
    { path: "/dashboard", icon: "📊", label: "Dashboard" },
    { path: "/health-records", icon: "📋", label: "Health Records" },
    { path: "/care-team", icon: "👥", label: "Care Team" },
    { path: "/settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <aside className="sidebar" id="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <img src={vatsalyaLogo} alt="Vatsalya logo" />
        </div>
        <span className="logo-text">Vatsalya</span>
      </div>

      {/* User Info */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <span className="user-name">{userName}</span>
          <span className="user-role">Caregiver Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
            id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* SOS Button */}
      <div className="sidebar-sos">
        <button className="sos-button" id="sos-trigger-btn" onClick={onSOSClick}>
          <span className="sos-pulse"></span>
          <span className="sos-icon">🚨</span>
          <span className="sos-text">Emergency SOS</span>
        </button>
      </div>

      {/* Logout */}
      <button className="sidebar-logout" id="logout-btn" onClick={handleLogout}>
        <span>🚪</span>
        <span>Logout</span>
      </button>
    </aside>
  );
}
