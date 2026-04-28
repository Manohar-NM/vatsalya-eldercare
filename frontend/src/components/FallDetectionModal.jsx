import { useState, useEffect } from "react";
import "./Modals.css";

export default function FallDetectionModal({ onClose, onTriggerSOS, parentName }) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) {
      onTriggerSOS();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onTriggerSOS]);

  const progress = ((30 - countdown) / 30) * 283;

  return (
    <div className="modal-overlay" id="fall-detection-modal">
      <div className="modal-container fall-modal animate-modal">
        {/* Gradient Background */}
        <div className="fall-modal-bg"></div>

        <div className="fall-modal-content">
          {/* Warning Icon */}
          <div className="fall-warning-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L1 21h22L12 2z" fill="#e63946" opacity="0.1" stroke="#e63946" strokeWidth="1.5"/>
              <path d="M12 9v4M12 17h.01" stroke="#e63946" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Title */}
          <h2 className="fall-title">Possible Fall Detected</h2>
          <p className="fall-subtitle">
            We detected a sudden impact at {parentName || "Arthur"}'s location.
          </p>

          {/* Countdown Circle */}
          <div className="countdown-ring">
            <svg viewBox="0 0 100 100" className="countdown-svg">
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke="#f0f0f0"
                strokeWidth="4"
              />
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke="#e63946"
                strokeWidth="4"
                strokeDasharray="283"
                strokeDashoffset={283 - progress}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="countdown-progress"
              />
            </svg>
            <div className="countdown-number">
              <span className="countdown-value">{countdown}</span>
              <span className="countdown-label">seconds</span>
            </div>
          </div>

          <p className="fall-auto-text">
            SOS will trigger automatically if no action is taken.
          </p>

          {/* Action Buttons */}
          <div className="fall-actions">
            <button className="btn btn-success fall-btn" id="mark-safe-btn" onClick={onClose}>
              <span>✅</span> Mark Safe
            </button>
            <button className="btn btn-danger fall-btn" id="trigger-sos-btn" onClick={onTriggerSOS}>
              <span>🚨</span> Trigger SOS
            </button>
          </div>

          {/* Patient Info */}
          <div className="fall-patient-info">
            <span className="info-dot"></span>
            <span>Patient ID: {parentName || "Arthur"}'s Residence</span>
            <span className="info-separator">•</span>
            <span>2 min ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
