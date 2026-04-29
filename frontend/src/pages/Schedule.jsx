import Sidebar from "../components/Sidebar";
import { useState } from "react";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import "./Schedule.css";

export default function Schedule() {
  const [showEmergency, setShowEmergency] = useState(false);
  const [selectedDay, setSelectedDay] = useState(28);

  const days = [
    { day: 26, label: "Sat" },
    { day: 27, label: "Sun" },
    { day: 28, label: "Mon" },
    { day: 29, label: "Tue" },
    { day: 30, label: "Wed" },
  ];

  const scheduleItems = [
    {
      time: "7:00 AM", title: "Morning Medication",
      desc: "Metformin 500mg, Lisinopril 10mg, Aspirin 75mg",
      icon: "💊", color: "#10b981", status: "completed"
    },
    {
      time: "8:30 AM", title: "Breakfast & Vitals Check",
      desc: "Blood pressure, heart rate, and SpO2 monitoring",
      icon: "🩺", color: "#3b82f6", status: "completed"
    },
    {
      time: "10:00 AM", title: "Physiotherapy Session",
      desc: "30-min of guided exercises with Dr. Priya Sharma",
      icon: "🏃", color: "#f59e0b", status: "current"
    },
    {
      time: "12:00 PM", title: "Lunch",
      desc: "Low sodium meal - grilled chicken with steamed vegetables",
      icon: "🍽️", color: "#8b5cf6", status: "upcoming"
    },
    {
      time: "1:00 PM", title: "Afternoon Medication",
      desc: "Insulin dose, Blood sugar monitoring",
      icon: "💊", color: "#10b981", status: "upcoming"
    },
    {
      time: "3:00 PM", title: "Doctor Video Call",
      desc: "Follow-up with Dr. Ramesh Kumar - Cardiology Review",
      icon: "📹", color: "#e63946", status: "upcoming"
    },
    {
      time: "5:00 PM", title: "Evening Walk",
      desc: "15 min supervised walk in the garden",
      icon: "🚶", color: "#06b6d4", status: "upcoming"
    },
    {
      time: "8:00 PM", title: "Night Medication & Sleep",
      desc: "Atorvastatin 20mg, Melatonin 3mg",
      icon: "🌙", color: "#6366f1", status: "upcoming"
    },
  ];

  return (
    <div className="app-layout">
      <Sidebar onSOSClick={() => setShowEmergency(true)} />

      <main className="main-content" id="schedule-page">
        <div className="page-header animate-fade-in">
          <div>
            <span className="page-tag">Daily Planner</span>
            <h1>Schedule</h1>
            <p className="page-subtitle">
              Arthur's daily care routine and upcoming activities.
            </p>
          </div>
        </div>

        {/* Calendar Strip */}
        <div className="calendar-strip card animate-slide-up">
          <div className="cal-month">
            <button className="cal-nav">‹</button>
            <span className="cal-month-label">April 2026</span>
            <button className="cal-nav">›</button>
          </div>
          <div className="cal-days">
            {days.map((d) => (
              <button
                key={d.day}
                className={`cal-day ${selectedDay === d.day ? "active" : ""}`}
                onClick={() => setSelectedDay(d.day)}
              >
                <span className="cal-day-label">{d.label}</span>
                <span className="cal-day-number">{d.day}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Timeline */}
        <div className="schedule-timeline">
          {scheduleItems.map((item, i) => (
            <div
              key={i}
              className={`schedule-item card animate-slide-up ${item.status}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="schedule-time">{item.time}</div>
              <div className="schedule-line">
                <div className="schedule-dot" style={{ background: item.color }}>
                  {item.status === "completed" && "✓"}
                </div>
                {i < scheduleItems.length - 1 && <div className="schedule-connector"></div>}
              </div>
              <div className="schedule-content">
                <div className="schedule-icon" style={{ background: `${item.color}15`, color: item.color }}>
                  {item.icon}
                </div>
                <div className="schedule-info">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
                {item.status === "completed" && (
                  <span className="badge badge-success">Done</span>
                )}
                {item.status === "current" && (
                  <span className="badge badge-warning">In Progress</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {showEmergency && (
        <EmergencyAlertModal
          onClose={() => setShowEmergency(false)}
          onCallDispatch={() => { alert("📞 Connecting..."); setShowEmergency(false); }}
        />
      )}
    </div>
  );
}
