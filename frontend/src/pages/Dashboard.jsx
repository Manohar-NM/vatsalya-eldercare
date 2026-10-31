import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import socket from "../socket/socket";
import Sidebar from "../components/Sidebar";
import FallDetectionModal from "../components/FallDetectionModal";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import "./Dashboard.css";

const emptyReminderForm = {
  water: {
    enabled: true,
    intervalMinutes: 60,
    startTime: "08:00",
    endTime: "20:00"
  },
  food: {
    breakfast: "08:00",
    lunch: "13:00",
    dinner: "20:00"
  },
  medicines: [
    { name: "", times: "08:00", timesPerDay: 1 }
  ]
};

const toReminderForm = (reminders) => ({
  water: {
    ...emptyReminderForm.water,
    ...(reminders?.water || {})
  },
  food: {
    ...emptyReminderForm.food,
    ...(reminders?.food || {})
  },
  medicines: reminders?.medicines?.length
    ? reminders.medicines.map((med) => ({
        name: med.name || "",
        times: Array.isArray(med.times) ? med.times.join(", ") : "",
        timesPerDay: med.timesPerDay || 1
      }))
    : emptyReminderForm.medicines
});

export default function Dashboard() {
  const childId = localStorage.getItem("childId");
  const childName = localStorage.getItem("userName") || "Child / Caregiver";

  const [parents, setParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [showAddParent, setShowAddParent] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [showFallModal, setShowFallModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [medicineOrders, setMedicineOrders] = useState([]);
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [childPhone, setChildPhone] = useState(localStorage.getItem("childPhone") || "");
  const [parentSearch, setParentSearch] = useState("");
  const [parentFilter, setParentFilter] = useState("all");
  const [parentSort, setParentSort] = useState("name-asc");

  // New parent form
  const [newParent, setNewParent] = useState({ name: "", age: "", phone: "", conditions: "", bloodType: "O+" });
  // New medicine form
  const [newMedicine, setNewMedicine] = useState({ name: "", dosage: "", frequency: "Daily" });
  const [newAppointment, setNewAppointment] = useState({
    doctorName: "",
    specialty: "",
    date: "",
    time: "",
    notes: ""
  });
  const [reminderForm, setReminderForm] = useState(emptyReminderForm);

  // Simulated live heart rate for selected parent
  const [liveHeartRate, setLiveHeartRate] = useState(72);
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveHeartRate(prev => Math.max(60, Math.min(90, prev + Math.floor(Math.random() * 5) - 2)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchParents = useCallback(async () => {
    try {
      const res = await API.get("/parents/my-parents");
      setParents(res.data);
      setSelectedParent(prev => prev || res.data[0] || null);
    } catch (err) {
      console.error("Error fetching parents:", err);
    }
  }, []);

  // Fetch parents on load
  useEffect(() => {
    API.get("/parents/my-parents")
      .then((res) => {
        setParents(res.data);
        setSelectedParent(prev => prev || res.data[0] || null);
      })
      .catch((err) => {
        console.error("Error fetching parents:", err);
      });
  }, []);

  // Socket: join child room & listen for alerts
  useEffect(() => {
    if (!childId) return;
    socket.emit("joinRoom", childId);

    socket.on("SOS_ALERT", (data) => {
      setSosAlerts(prev => [data, ...prev]);
      setShowFallModal(true);
    });

    socket.on("MEDICINE_ORDER", (data) => {
      setMedicineOrders(prev => [data, ...prev]);
    });

    socket.on("VOICE_MESSAGE", (data) => {
      setVoiceMessages(prev => [data, ...prev]);
      alert(`Voice message from ${data.parentName}: ${data.translatedText}`);
    });

    return () => {
      socket.off("SOS_ALERT");
      socket.off("MEDICINE_ORDER");
      socket.off("VOICE_MESSAGE");
    };
  }, [childId]);

  const openBuySearch = (medicineName) => {
    const query = encodeURIComponent(`buy ${medicineName} medicine online`);
    window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
  };

  const handleCreateParent = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/parents", {
        name: newParent.name,
        age: Number(newParent.age),
        phone: newParent.phone,
        conditions: newParent.conditions,
        bloodType: newParent.bloodType
      });
      alert(`✅ Parent created!\n\n🔑 Unique Code: ${res.data.uniqueCode}\n\nShare this code with ${newParent.name} for their device.`);
      setShowAddParent(false);
      setNewParent({ name: "", age: "", phone: "", conditions: "", bloodType: "O+" });
      fetchParents();
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Failed to create parent"));
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!selectedParent) return alert("Select a parent first");
    try {
      const res = await API.post(`/parents/${selectedParent._id}/medicine`, newMedicine);
      setSelectedParent({ ...selectedParent, medicines: res.data.medicines });
      setParents(prev => prev.map(p => p._id === selectedParent._id ? { ...p, medicines: res.data.medicines } : p));
      setShowAddMedicine(false);
      setNewMedicine({ name: "", dosage: "", frequency: "Daily" });
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Failed to add medicine"));
    }
  };

  const handleRemoveMedicine = async (medicineId) => {
    if (!selectedParent) return;
    try {
      const res = await API.delete(`/parents/${selectedParent._id}/medicine/${medicineId}`);
      setSelectedParent({ ...selectedParent, medicines: res.data.medicines });
      setParents(prev => prev.map(p => p._id === selectedParent._id ? { ...p, medicines: res.data.medicines } : p));
    } catch {
      alert("Error removing medicine");
    }
  };

  const openReminderSettings = () => {
    setReminderForm(toReminderForm(selectedParent?.reminders));
    setShowReminders(true);
  };

  const updateMedicineReminder = (index, field, value) => {
    setReminderForm(prev => ({
      ...prev,
      medicines: prev.medicines.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const addMedicineReminderRow = () => {
    setReminderForm(prev => ({
      ...prev,
      medicines: [...prev.medicines, { name: "", times: "08:00", timesPerDay: 1 }]
    }));
  };

  const removeMedicineReminderRow = (index) => {
    setReminderForm(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const handleSaveReminders = async (e) => {
    e.preventDefault();
    if (!selectedParent) return;

    const reminders = {
      water: {
        ...reminderForm.water,
        intervalMinutes: Number(reminderForm.water.intervalMinutes) || 60
      },
      food: reminderForm.food,
      medicines: reminderForm.medicines
        .filter(med => med.name.trim())
        .map(med => ({
          name: med.name.trim(),
          times: med.times.split(",").map(time => time.trim()).filter(Boolean),
          timesPerDay: Number(med.timesPerDay) || 1
        }))
    };

    try {
      const res = await API.put(`/parents/reminders/${selectedParent._id}`, { reminders });
      const updatedParent = { ...selectedParent, reminders: res.data.reminders };
      setSelectedParent(updatedParent);
      setParents(prev => prev.map(p => p._id === selectedParent._id ? updatedParent : p));
      setShowReminders(false);
      alert("Reminders saved for parent device");
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Failed to save reminders"));
    }
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    if (!selectedParent) return;

    try {
      const res = await API.post(`/parents/${selectedParent._id}/appointments`, newAppointment);
      const updatedParent = { ...selectedParent, appointments: res.data.appointments };
      setSelectedParent(updatedParent);
      setParents(prev => prev.map(p => p._id === selectedParent._id ? updatedParent : p));
      setShowAppointment(false);
      setNewAppointment({ doctorName: "", specialty: "", date: "", time: "", notes: "" });
      alert("Appointment added for parent device");
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Failed to add appointment"));
    }
  };

  const ensureChildPhone = useCallback(() => {
    if (childPhone) return childPhone;
    const phone = window.prompt("Enter child/caregiver phone number for emergency auto-call:");
    if (phone?.trim()) {
      const cleanPhone = phone.trim();
      localStorage.setItem("childPhone", cleanPhone);
      setChildPhone(cleanPhone);
      return cleanPhone;
    }
    return "";
  }, [childPhone]);

  const callChildPhone = useCallback(() => {
    const phone = ensureChildPhone();
    if (!phone) {
      alert("Child phone number is required for auto-call.");
      return;
    }
    window.location.href = `tel:${phone}`;
    setShowEmergencyModal(false);
  }, [ensureChildPhone]);

  const handleSOSClick = () => {
    ensureChildPhone();
    setShowEmergencyModal(true);
  };

  const visibleParents = useMemo(() => {
    const normalizedSearch = parentSearch.trim().toLowerCase();

    const parentHasSos = (parent) =>
      sosAlerts.some((alert) => alert.parentId === parent._id || alert.parentName === parent.name);

    const parentHasOrder = (parent) =>
      medicineOrders.some((order) => order.parentId === parent._id || order.parentName === parent.name);

    const parentHasVoice = (parent) =>
      voiceMessages.some((message) => message.parentId === parent._id || message.parentName === parent.name);

    return parents
      .filter((parent) => {
        if (!normalizedSearch) return true;
        return [
          parent.name,
          parent.phone,
          parent.conditions,
          parent.uniqueCode,
          parent.bloodType
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      })
      .filter((parent) => {
        if (parentFilter === "sos") return parentHasSos(parent);
        if (parentFilter === "orders") return parentHasOrder(parent);
        if (parentFilter === "voice") return parentHasVoice(parent);
        return true;
      })
      .sort((a, b) => {
        if (parentSort === "age-asc") return (Number(a.age) || 0) - (Number(b.age) || 0);
        if (parentSort === "age-desc") return (Number(b.age) || 0) - (Number(a.age) || 0);
        if (parentSort === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""));
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [medicineOrders, parentFilter, parentSearch, parentSort, parents, sosAlerts, voiceMessages]);

  useEffect(() => {
    if (!visibleParents.length) return;
    if (!selectedParent || !visibleParents.some((parent) => parent._id === selectedParent._id)) {
      const timer = setTimeout(() => setSelectedParent(visibleParents[0]), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [selectedParent, visibleParents]);

  const heartRateData = [65, 70, 68, 72, 75, 71, 73, 69, liveHeartRate, 74, 70, 72];

  return (
    <div className="app-layout">
      <Sidebar onSOSClick={handleSOSClick} />

      <main className="main-content" id="dashboard-page">
        {/* Top Bar */}
        <div className="dash-topbar">
          <h1 className="dash-title">Dashboard</h1>
          <button className="btn btn-primary" id="add-parent-btn" onClick={() => setShowAddParent(true)}>
            + Add Parent
          </button>
        </div>

        {parents.length > 0 && (
          <div className="parent-search-panel card animate-fade-in">
            <div className="parent-search-field">
              <span className="parent-search-icon">Search</span>
              <input
                type="search"
                placeholder="Search by name, phone, condition, or code"
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
              />
            </div>
            <div className="parent-search-controls">
              <label>
                <span>Filter</span>
                <select value={parentFilter} onChange={(e) => setParentFilter(e.target.value)}>
                  <option value="all">All parents</option>
                  <option value="sos">Has SOS alert</option>
                  <option value="orders">Has medicine order</option>
                  <option value="voice">Has voice message</option>
                </select>
              </label>
              <label>
                <span>Sort</span>
                <select value={parentSort} onChange={(e) => setParentSort(e.target.value)}>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="age-asc">Age low-high</option>
                  <option value="age-desc">Age high-low</option>
                </select>
              </label>
            </div>
            <div className="parent-results-count">
              Showing {visibleParents.length} of {parents.length} parent{parents.length === 1 ? "" : "s"}
            </div>
          </div>
        )}

        {/* Parents Tabs */}
        {parents.length > 0 && (
          <div className="parents-tabs animate-fade-in">
            {visibleParents.map((p) => (
              <button
                key={p._id}
                className={`parent-tab ${selectedParent?._id === p._id ? "active" : ""}`}
                onClick={() => setSelectedParent(p)}
              >
                <div className="ptab-avatar">{p.name.charAt(0)}</div>
                <div className="ptab-info">
                  <span className="ptab-name">{p.name}</span>
                  <span className="ptab-code">{p.uniqueCode}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {parents.length > 0 && visibleParents.length === 0 && (
          <div className="empty-state card animate-fade-in parent-empty-results">
            <h2>No matching parents</h2>
            <p>Try a different search term, filter, or sort option.</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setParentSearch("");
                setParentFilter("all");
                setParentSort("name-asc");
              }}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* No Parents State */}
        {parents.length === 0 && (
          <div className="empty-state card animate-fade-in">
            <div className="empty-icon">👨‍👩‍👧</div>
            <h2>No Parents Added Yet</h2>
            <p>Add your first parent to start monitoring their health and safety.</p>
            <button className="btn btn-primary" onClick={() => setShowAddParent(true)}>
              + Add Your First Parent
            </button>
          </div>
        )}

        {/* Selected Parent Dashboard */}
        {selectedParent && (
          <>
            {/* Profile + Health Score */}
            <div className="dashboard-top">
              <div className="profile-card card animate-fade-in">
                <div className="profile-row">
                  <div className="profile-avatar">
                    <div className="avatar-circle">
                      <span className="avatar-initials">
                        {selectedParent.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div className="avatar-status online"></div>
                  </div>
                  <div className="profile-info">
                    <h1 className="profile-name">{selectedParent.name}</h1>
                    <div className="profile-meta">
                      <span className="meta-tag">🎂 Age {selectedParent.age || "N/A"}</span>
                      <span className="meta-divider">|</span>
                      <span className="meta-tag">❤️ {selectedParent.conditions || "General Monitoring"}</span>
                    </div>
                    <div className="profile-details">
                      <div className="detail-item">
                        <span className="detail-label">Blood Type</span>
                        <span className="detail-value">{selectedParent.bloodType || "N/A"}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Unique ID</span>
                        <span className="detail-value code-value">{selectedParent.uniqueCode}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Phone</span>
                        <span className="detail-value">{selectedParent.phone || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="health-score-card animate-slide-right">
                <div className="score-header">
                  <span className="score-label">Health Score</span>
                  <span className="score-badge">Live</span>
                </div>
                <div className="score-circle">
                  <svg viewBox="0 0 120 120" className="score-svg">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8"/>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="white" strokeWidth="8"
                      strokeDasharray="327" strokeDashoffset={327 - (327 * 94 / 100)}
                      strokeLinecap="round" transform="rotate(-90 60 60)"
                      style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                  </svg>
                  <div className="score-value">
                    <span className="score-number">94</span>
                    <span className="score-unit">/100</span>
                  </div>
                </div>
                <p className="score-summary">
                  {selectedParent.name}'s vitals are within normal range. Keep monitoring.
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="stats-row">
              {/* Heart Rate */}
              <div className="stat-card card animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <div className="stat-header">
                  <h3>Heart Rate</h3>
                  <span className="badge badge-success">Normal</span>
                </div>
                <div className="stat-main">
                  <span className="stat-value">{selectedParent.heartRate || liveHeartRate}</span>
                  <span className="stat-unit">bpm</span>
                </div>
                <div className="heart-chart">
                  {heartRateData.map((val, i) => (
                    <div key={i} className="chart-bar" style={{
                      height: `${(val - 55) * 2.5}px`,
                      background: val > 73 ? 'var(--warning)' : 'var(--primary)',
                      animationDelay: `${i * 0.05}s`
                    }}></div>
                  ))}
                </div>
              </div>

              {/* Vitals */}
              <div className="stat-card card animate-slide-up" style={{ animationDelay: "0.15s" }}>
                <div className="stat-header">
                  <h3>Vitals</h3>
                  <span className="badge badge-info">Live</span>
                </div>
                <div className="vitals-grid">
                  <div className="vital-item">
                    <span className="vital-icon">💓</span>
                    <span className="vital-label">SpO2</span>
                    <span className="vital-value">{selectedParent.spO2 || 98}%</span>
                  </div>
                  <div className="vital-item">
                    <span className="vital-icon">🩸</span>
                    <span className="vital-label">BP</span>
                    <span className="vital-value">{selectedParent.bloodPressure || "120/80"}</span>
                  </div>
                  <div className="vital-item">
                    <span className="vital-icon">🏃</span>
                    <span className="vital-label">Activity</span>
                    <span className="vital-value">{selectedParent.activity || "Normal"}</span>
                  </div>
                </div>
              </div>

              {/* SOS Alerts */}
              <div className="stat-card card animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <div className="stat-header">
                  <h3>SOS Alerts</h3>
                  <span className="badge badge-danger">{sosAlerts.length}</span>
                </div>
                {sosAlerts.length === 0 ? (
                  <div className="no-alerts">
                    <span>✅</span>
                    <p>No active alerts</p>
                  </div>
                ) : (
                  <div className="alerts-list">
                    {sosAlerts.slice(0, 3).map((alert, i) => (
                      <div key={i} className="alert-item alert-danger">
                        <span className="alert-icon">🚨</span>
                        <div className="alert-content">
                          <span className="alert-title">SOS from {alert.parentName}</span>
                          <span className="alert-desc">{alert.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Medicines Section */}
            <div className="medicines-section card animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <div className="medicines-header">
                <h3>💊 Medicines for {selectedParent.name}</h3>
                <button className="btn btn-primary" id="add-medicine-btn" onClick={() => setShowAddMedicine(true)}>
                  + Add Medicine
                </button>
              </div>
              {(!selectedParent.medicines || selectedParent.medicines.length === 0) ? (
                <div className="no-medicines">
                  <p>No medicines added yet. Add medicines that {selectedParent.name} needs.</p>
                </div>
              ) : (
                <div className="medicines-grid">
                  {selectedParent.medicines.map((med) => (
                    <div key={med._id} className="medicine-card">
                      <div className="med-icon">💊</div>
                      <div className="med-info">
                        <span className="med-name">{med.name}</span>
                        <span className="med-dosage">{med.dosage || "N/A"} • {med.frequency || "Daily"}</span>
                      </div>
                      <button className="med-remove" onClick={() => handleRemoveMedicine(med._id)} title="Remove">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Medicine Orders from Parents */}
              {medicineOrders.length > 0 && (
                <div className="medicine-orders">
                  <h4>📦 Recent Orders from Parents</h4>
                  {medicineOrders.map((order, i) => (
                    <div key={i} className="order-item">
                      <span className="order-parent">🛒 {order.parentName} ordered:</span>
                      <span className="order-meds">
                        {order.medicines.map(m => m.name).join(", ")}
                      </span>
                      <span className="order-time">
                        {new Date(order.time).toLocaleTimeString()}
                      </span>
                      <button
                        className="buy-medicine-btn"
                        onClick={() => openBuySearch(order.medicines.map(m => m.name).join(" "))}
                      >
                        Buy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {voiceMessages.length > 0 && (
              <div className="voice-messages-section card animate-slide-up" style={{ animationDelay: "0.32s" }}>
                <div className="medicines-header">
                  <h3>Voice Messages from Parents</h3>
                  <span className="badge badge-info">{voiceMessages.length}</span>
                </div>
                <div className="voice-message-list">
                  {voiceMessages.slice(0, 5).map((message, i) => (
                    <div key={i} className="voice-message-card">
                      <div>
                        <strong>Voice message from {message.parentName}</strong>
                        <p>{message.translatedText}</p>
                        {message.originalText && (
                          <small>Heard: {message.originalText}</small>
                        )}
                      </div>
                      <span>{new Date(message.time).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="appointments-section card animate-slide-up" style={{ animationDelay: "0.34s" }}>
              <div className="medicines-header">
                <h3>Doctor Appointments for {selectedParent.name}</h3>
                <button className="btn btn-primary" onClick={() => setShowAppointment(true)}>
                  + Add Appointment
                </button>
              </div>
              {selectedParent.appointments?.length ? (
                <div className="appointment-list">
                  {selectedParent.appointments.slice(-3).map((appointment) => (
                    <div key={appointment._id} className="appointment-card">
                      <strong>{appointment.doctorName}</strong>
                      <span>{appointment.specialty || "Doctor visit"}</span>
                      <small>{appointment.date} at {appointment.time}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-medicines">
                  <p>No doctor appointments added yet.</p>
                </div>
              )}
            </div>

            {/* Reminders Section */}
            <div className="reminders-section card animate-slide-up" style={{ animationDelay: "0.35s" }}>
              <div className="medicines-header">
                <h3>Care Reminders for {selectedParent.name}</h3>
                <button className="btn btn-primary" id="manage-reminders-btn" onClick={openReminderSettings}>
                  Manage Reminders
                </button>
              </div>
              <div className="reminder-summary-grid">
                <div className="reminder-summary-card">
                  <span className="reminder-summary-icon">Water</span>
                  <strong>Drink Water</strong>
                  <small>
                    {selectedParent.reminders?.water?.enabled
                      ? `Every ${selectedParent.reminders.water.intervalMinutes || 60} min`
                      : "Not configured"}
                  </small>
                </div>
                <div className="reminder-summary-card">
                  <span className="reminder-summary-icon">Food</span>
                  <strong>Food Intake</strong>
                  <small>
                    {selectedParent.reminders?.food?.breakfast || selectedParent.reminders?.food?.lunch || selectedParent.reminders?.food?.dinner
                      ? "Breakfast, lunch, dinner set"
                      : "Not configured"}
                  </small>
                </div>
                <div className="reminder-summary-card">
                  <span className="reminder-summary-icon">Meds</span>
                  <strong>Medicine Reminders</strong>
                  <small>{selectedParent.reminders?.medicines?.length || 0} medicine reminder(s)</small>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ADD PARENT MODAL */}
      {showAddParent && (
        <div className="modal-overlay" id="add-parent-modal">
          <div className="modal-container form-modal animate-modal">
            <div className="modal-header">
              <h2>Add New Parent</h2>
              <button className="modal-close" onClick={() => setShowAddParent(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateParent} className="modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" placeholder="e.g. Arthur Miller" required
                  value={newParent.name} onChange={e => setNewParent({ ...newParent, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" placeholder="e.g. 72"
                    value={newParent.age} onChange={e => setNewParent({ ...newParent, age: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Blood Type</label>
                  <select value={newParent.bloodType} onChange={e => setNewParent({ ...newParent, bloodType: e.target.value })}>
                    <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="text" placeholder="e.g. +91 98765 43210"
                  value={newParent.phone} onChange={e => setNewParent({ ...newParent, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Health Conditions</label>
                <input type="text" placeholder="e.g. Heart Condition, Diabetes"
                  value={newParent.conditions} onChange={e => setNewParent({ ...newParent, conditions: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary modal-submit">Create Parent</button>
              <p className="modal-hint">A unique code will be generated to link the parent's device.</p>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEDICINE MODAL */}
      {showAddMedicine && (
        <div className="modal-overlay" id="add-medicine-modal">
          <div className="modal-container form-modal animate-modal">
            <div className="modal-header">
              <h2>Add Medicine for {selectedParent?.name}</h2>
              <button className="modal-close" onClick={() => setShowAddMedicine(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMedicine} className="modal-form">
              <div className="form-group">
                <label>Medicine Name *</label>
                <input type="text" placeholder="e.g. Metformin" required
                  value={newMedicine.name} onChange={e => setNewMedicine({ ...newMedicine, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Dosage</label>
                  <input type="text" placeholder="e.g. 500mg"
                    value={newMedicine.dosage} onChange={e => setNewMedicine({ ...newMedicine, dosage: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select value={newMedicine.frequency} onChange={e => setNewMedicine({ ...newMedicine, frequency: e.target.value })}>
                    <option>Daily</option><option>Twice Daily</option><option>Weekly</option><option>As Needed</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary modal-submit">Add Medicine</button>
            </form>
          </div>
        </div>
      )}

      {/* REMINDERS MODAL */}
      {showReminders && (
        <div className="modal-overlay" id="reminders-modal">
          <div className="modal-container form-modal reminders-modal animate-modal">
            <div className="modal-header">
              <h2>Manage Reminders for {selectedParent?.name}</h2>
              <button className="modal-close" onClick={() => setShowReminders(false)}>×</button>
            </div>
            <form onSubmit={handleSaveReminders} className="modal-form">
              <section className="reminder-form-section">
                <h3>Medicine Reminders</h3>
                {reminderForm.medicines.map((med, index) => (
                  <div className="medicine-reminder-row" key={index}>
                    <div className="form-group">
                      <label>Name of the Medicine</label>
                      <input
                        type="text"
                        placeholder="e.g. Metformin"
                        value={med.name}
                        onChange={e => updateMedicineReminder(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Timings</label>
                        <input
                          type="text"
                          placeholder="08:00, 20:00"
                          value={med.times}
                          onChange={e => updateMedicineReminder(index, "times", e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>How many times</label>
                        <input
                          type="number"
                          min="1"
                          value={med.timesPerDay}
                          onChange={e => updateMedicineReminder(index, "timesPerDay", e.target.value)}
                        />
                      </div>
                    </div>
                    {reminderForm.medicines.length > 1 && (
                      <button type="button" className="btn btn-outline" onClick={() => removeMedicineReminderRow(index)}>
                        Remove Medicine
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-outline" onClick={addMedicineReminderRow}>
                  + Add Another Medicine
                </button>
              </section>

              <section className="reminder-form-section">
                <h3>Water Reminder</h3>
                <label className="reminder-toggle">
                  <input
                    type="checkbox"
                    checked={reminderForm.water.enabled}
                    onChange={e => setReminderForm(prev => ({
                      ...prev,
                      water: { ...prev.water, enabled: e.target.checked }
                    }))}
                  />
                  Notify parent to drink water
                </label>
                <div className="form-row">
                  <div className="form-group">
                    <label>How often to remind</label>
                    <select
                      value={reminderForm.water.intervalMinutes}
                      onChange={e => setReminderForm(prev => ({
                        ...prev,
                        water: { ...prev.water, intervalMinutes: e.target.value }
                      }))}
                    >
                      <option value="30">Every 30 minutes</option>
                      <option value="60">Every hour</option>
                      <option value="120">Every 2 hours</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Active from</label>
                    <input
                      type="time"
                      value={reminderForm.water.startTime}
                      onChange={e => setReminderForm(prev => ({
                        ...prev,
                        water: { ...prev.water, startTime: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Active until</label>
                  <input
                    type="time"
                    value={reminderForm.water.endTime}
                    onChange={e => setReminderForm(prev => ({
                      ...prev,
                      water: { ...prev.water, endTime: e.target.value }
                    }))}
                  />
                </div>
              </section>

              <section className="reminder-form-section">
                <h3>Food Reminder</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Breakfast</label>
                    <input
                      type="time"
                      value={reminderForm.food.breakfast}
                      onChange={e => setReminderForm(prev => ({
                        ...prev,
                        food: { ...prev.food, breakfast: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Lunch</label>
                    <input
                      type="time"
                      value={reminderForm.food.lunch}
                      onChange={e => setReminderForm(prev => ({
                        ...prev,
                        food: { ...prev.food, lunch: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Dinner</label>
                  <input
                    type="time"
                    value={reminderForm.food.dinner}
                    onChange={e => setReminderForm(prev => ({
                      ...prev,
                      food: { ...prev.food, dinner: e.target.value }
                    }))}
                  />
                </div>
              </section>

              <button type="submit" className="btn btn-primary modal-submit">Save Reminders</button>
            </form>
          </div>
        </div>
      )}

      {/* ADD APPOINTMENT MODAL */}
      {showAppointment && (
        <div className="modal-overlay" id="appointment-modal">
          <div className="modal-container form-modal animate-modal">
            <div className="modal-header">
              <h2>Add Doctor Appointment</h2>
              <button className="modal-close" onClick={() => setShowAppointment(false)}>×</button>
            </div>
            <form onSubmit={handleAddAppointment} className="modal-form">
              <div className="form-group">
                <label>Doctor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rao"
                  value={newAppointment.doctorName}
                  onChange={e => setNewAppointment({ ...newAppointment, doctorName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiologist"
                  value={newAppointment.specialty}
                  onChange={e => setNewAppointment({ ...newAppointment, specialty: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    required
                    value={newAppointment.date}
                    onChange={e => setNewAppointment({ ...newAppointment, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    required
                    value={newAppointment.time}
                    onChange={e => setNewAppointment({ ...newAppointment, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Carry reports"
                  value={newAppointment.notes}
                  onChange={e => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary modal-submit">Save Appointment</button>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modals */}
      {showFallModal && (
        <FallDetectionModal
          parentName={sosAlerts[0]?.parentName || "Parent"}
          onClose={() => setShowFallModal(false)}
          onTriggerSOS={() => { setShowFallModal(false); setShowEmergencyModal(true); }}
        />
      )}

      {showEmergencyModal && (
        <EmergencyAlertModal
          onClose={() => setShowEmergencyModal(false)}
          onCallChild={callChildPhone}
          childName={childName}
          childPhone={childPhone}
        />
      )}
    </div>
  );
}
