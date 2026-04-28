import { useState, useEffect } from "react";
import "./Modals.css";

export default function EmergencyAlertModal({ onClose, onCallChild, childName, childPhone }) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) {
      onCallChild();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onCallChild]);

  return (
    <div className="modal-overlay emergency-overlay" id="emergency-alert-modal">
      <div className="modal-container emergency-modal animate-modal">
        <div className="emergency-icon-wrapper">
          <div className="emergency-icon-bg">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7l2-7z" fill="#e63946"/>
            </svg>
          </div>
          <div className="emergency-ripple-1"></div>
          <div className="emergency-ripple-2"></div>
        </div>

        <h2 className="emergency-title">
          Emergency Alert<br/>Sent
        </h2>
        <p className="emergency-subtitle">
          Child has been notified. If they miss the alert,<br/>we will call them automatically.
        </p>

        <div className="emergency-countdown-box">
          <span className="emergency-countdown-label">AUTO CALL TO CHILD IN</span>
          <span className="emergency-countdown-number">{countdown}</span>
        </div>

        <button className="btn btn-danger emergency-call-btn" id="call-child-btn" onClick={onCallChild}>
          <span>Call</span> Call Child Now
        </button>

        <button className="emergency-cancel-btn" id="cancel-emergency-btn" onClick={onClose}>
          Cancel
        </button>

        <div className="emergency-doctor">
          <div className="doctor-status">
            <span className="status-dot online"></span>
            <span className="status-text">Auto call backup enabled</span>
          </div>
          <div className="doctor-card">
            <div className="doctor-avatar">{(childName || "C").charAt(0).toUpperCase()}</div>
            <div className="doctor-info">
              <span className="doctor-name">{childName || "Child / Caregiver"}</span>
              <span className="doctor-specialty">{childPhone || "Phone number not added"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
