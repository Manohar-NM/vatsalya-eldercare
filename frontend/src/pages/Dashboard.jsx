import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import socket from "../socket/socket";
import Sidebar from "../components/Sidebar";
import FallDetectionModal from "../components/FallDetectionModal";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import AiHealthInsights from "../components/AiHealthInsights";
import AiCaregiverAssistant from "../components/AiCaregiverAssistant";
import "./Dashboard.css";

const emptyReminderForm = {
  water: { enabled: true, intervalMinutes: 60, startTime: "08:00", endTime: "20:00" },
  food: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" },
  medicines: [{ name: "", times: "08:00", timesPerDay: 1 }]
};

const toReminderForm = (reminders) => ({
  water: { ...emptyReminderForm.water, ...(reminders?.water || {}) },
  food: { ...emptyReminderForm.food, ...(reminders?.food || {}) },
  medicines: reminders?.medicines?.length
    ? reminders.medicines.map((med) => ({
        name: med.name || "",
        times: Array.isArray(med.times) ? med.times.join(", ") : "",
        timesPerDay: med.timesPerDay || 1
      }))
    : emptyReminderForm.medicines
});

function getInitials(name = "Parent") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const childId = localStorage.getItem("childId");
  const childName = localStorage.getItem("userName") || "Ananya Vatsalya";

  const [parents, setParents] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
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
  const [newParent, setNewParent] = useState({ name: "", age: "", phone: "", conditions: "", bloodType: "O+" });
  const [newMedicine, setNewMedicine] = useState({ name: "", dosage: "", frequency: "Daily" });
  const [newAppointment, setNewAppointment] = useState({ doctorName: "", specialty: "", date: "", time: "", notes: "" });
  const [reminderForm, setReminderForm] = useState(emptyReminderForm);
  const [showAddHealth, setShowAddHealth] = useState(false);
  const [newHealth, setNewHealth] = useState({ heartRate: "", spO2: "", bloodPressure: "", steps: "", activity: "" });

  const fetchParents = useCallback(async () => {
    try {
      const res = await API.get("/parents/my-parents");
      setParents(res.data || []);
    } catch (err) {
      console.error("Error fetching parents:", err);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    API.get("/parents/my-parents")
      .then((res) => {
        if (isSubscribed) setParents(res.data || []);
      })
      .catch((err) => {
        if (isSubscribed) console.error("Error fetching parents:", err);
      });

    API.get("/sos")
      .then((res) => {
        if (isSubscribed && res.data?.sos) {
          const active = res.data.sos
            .filter((s) => s.status === "ACTIVE")
            .map((s) => ({
              sosId: s._id,
              parentId: s.parent?._id || s.parent,
              parentName: s.parent?.name || "Parent",
              location: s.parent?.location || "",
              phone: s.parent?.phone || "",
              message: s.message,
              severity: s.severity,
              time: s.createdAt
            }));
          setSosAlerts(active);
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    if (!childId) return;
    const token = localStorage.getItem("token");
    socket.emit("joinRoom", { room: childId, token });

    socket.on("SOS_ALERT", (data) => {
      setSosAlerts((prev) => [data, ...prev]);
      setShowFallModal(true);
    });
    socket.on("SOS_RESOLVED", (data) => {
      setSosAlerts((prev) => prev.filter((alert) => (alert.sosId || alert._id) !== data.sosId));
      setShowFallModal(false);
    });
    socket.on("MEDICINE_ORDER", (data) => setMedicineOrders((prev) => [data, ...prev]));
    socket.on("VOICE_MESSAGE", (data) => setVoiceMessages((prev) => [data, ...prev]));
    socket.on("HEALTH_UPDATE", (data) => {
      setParents((prev) => prev.map((p) => p._id === data.parentId ? { ...p, ...data } : p));
    });

    return () => {
      socket.off("SOS_ALERT");
      socket.off("SOS_RESOLVED");
      socket.off("MEDICINE_ORDER");
      socket.off("VOICE_MESSAGE");
      socket.off("HEALTH_UPDATE");
    };
  }, [childId]);

  const visibleParents = useMemo(() => {
    const search = parentSearch.trim().toLowerCase();
    const hasSos = (parent) => sosAlerts.some((alert) => alert.parentId === parent._id || alert.parentName === parent.name);
    const hasOrder = (parent) => medicineOrders.some((order) => order.parentId === parent._id || order.parentName === parent.name);
    const hasVoice = (parent) => voiceMessages.some((message) => message.parentId === parent._id || message.parentName === parent.name);

    return parents
      .filter((parent) => {
        if (!search) return true;
        return [parent.name, parent.phone, parent.conditions, parent.uniqueCode, parent.bloodType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .filter((parent) => {
        if (parentFilter === "sos") return hasSos(parent);
        if (parentFilter === "orders") return hasOrder(parent);
        if (parentFilter === "voice") return hasVoice(parent);
        return true;
      })
      .sort((a, b) => {
        if (parentSort === "age-asc") return (Number(a.age) || 0) - (Number(b.age) || 0);
        if (parentSort === "age-desc") return (Number(b.age) || 0) - (Number(a.age) || 0);
        if (parentSort === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""));
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [medicineOrders, parentFilter, parentSearch, parentSort, parents, sosAlerts, voiceMessages]);

  const selectedParent = useMemo(() => {
    if (!visibleParents.length) return null;
    return visibleParents.find((parent) => parent._id === selectedParentId) || visibleParents[0] || null;
  }, [selectedParentId, visibleParents]);

  useEffect(() => {
    if (!selectedParent?._id) return;
    let isSubscribed = true;
    API.get(`/health/${selectedParent._id}`)
      .then((res) => {
        if (isSubscribed) setHealthRecords(res.data || []);
      })
      .catch((err) => {
        if (isSubscribed) {
          console.error("Error fetching health history:", err);
          setHealthRecords([]);
        }
      });
    return () => {
      isSubscribed = false;
    };
  }, [selectedParent?._id]);

  const ensureChildPhone = useCallback(() => {
    if (childPhone) return childPhone;
    const phone = window.prompt("Enter caregiver phone number for emergency auto-call:");
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
    if (!phone) return;
    window.location.href = `tel:${phone}`;
    setShowEmergencyModal(false);
  }, [ensureChildPhone, setShowEmergencyModal]);

  const handleSOSClick = () => {
    ensureChildPhone();
    setShowEmergencyModal(true);
  };

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const handleCreateParent = async (event) => {
    event.preventDefault();
    try {
      const res = await API.post("/parents", {
        name: newParent.name,
        age: Number(newParent.age),
        phone: newParent.phone,
        conditions: newParent.conditions,
        bloodType: newParent.bloodType
      });
      alert(`Parent created. Unique Code: ${res.data.uniqueCode}`);
      setShowAddParent(false);
      setNewParent({ name: "", age: "", phone: "", conditions: "", bloodType: "O+" });
      fetchParents();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create parent");
    }
  };

  const handleAddMedicine = async (event) => {
    event.preventDefault();
    if (!selectedParent) return;
    try {
      const res = await API.post(`/parents/${selectedParent._id}/medicine`, newMedicine);
      const updatedParent = { ...selectedParent, medicines: res.data.medicines };
      setParents((prev) => prev.map((parent) => parent._id === selectedParent._id ? updatedParent : parent));
      setShowAddMedicine(false);
      setNewMedicine({ name: "", dosage: "", frequency: "Daily" });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add medicine");
    }
  };

  const handleRemoveMedicine = async (medicineId) => {
    if (!selectedParent) return;
    try {
      const res = await API.delete(`/parents/${selectedParent._id}/medicine/${medicineId}`);
      const updatedParent = { ...selectedParent, medicines: res.data.medicines };
      setParents((prev) => prev.map((parent) => parent._id === selectedParent._id ? updatedParent : parent));
    } catch {
      alert("Error removing medicine");
    }
  };

  const handleResolveSOS = async (sosId) => {
    if (!sosId) return;
    try {
      await API.put(`/sos/${sosId}/resolve`);
      setSosAlerts((prev) => prev.filter((a) => (a.sosId || a._id) !== sosId));
    } catch (err) {
      console.error("Failed to resolve SOS:", err);
    }
  };

  const handleAddAppointment = async (event) => {
    event.preventDefault();
    if (!selectedParent) return;
    try {
      const res = await API.post(`/parents/${selectedParent._id}/appointments`, newAppointment);
      const updatedParent = { ...selectedParent, appointments: res.data.appointments };
      setParents((prev) => prev.map((parent) => parent._id === selectedParent._id ? updatedParent : parent));
      setShowAppointment(false);
      setNewAppointment({ doctorName: "", specialty: "", date: "", time: "", notes: "" });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add appointment");
    }
  };

  const openReminderSettings = () => {
    setReminderForm(toReminderForm(selectedParent?.reminders));
    setShowReminders(true);
  };

  const updateMedicineReminder = (index, field, value) => {
    setReminderForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((med, i) => i === index ? { ...med, [field]: value } : med)
    }));
  };

  const handleSaveReminders = async (event) => {
    event.preventDefault();
    if (!selectedParent) return;

    const reminders = {
      water: { ...reminderForm.water, intervalMinutes: Number(reminderForm.water.intervalMinutes) || 60 },
      food: reminderForm.food,
      medicines: reminderForm.medicines
        .filter((med) => med.name.trim())
        .map((med) => ({
          name: med.name.trim(),
          times: med.times.split(",").map((time) => time.trim()).filter(Boolean),
          timesPerDay: Number(med.timesPerDay) || 1
        }))
    };

    try {
      const res = await API.put(`/parents/reminders/${selectedParent._id}`, { reminders });
      const updatedParent = { ...selectedParent, reminders: res.data.reminders };
      setParents((prev) => prev.map((parent) => parent._id === selectedParent._id ? updatedParent : parent));
      setShowReminders(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save reminders");
    }
  };

  const handleAddHealth = async (event) => {
    event.preventDefault();
    if (!selectedParent) return;
    try {
      const payload = {
        parent: selectedParent._id,
        heartRate: newHealth.heartRate ? Number(newHealth.heartRate) : undefined,
        spO2: newHealth.spO2 ? Number(newHealth.spO2) : undefined,
        bloodPressure: newHealth.bloodPressure.trim() || undefined,
        steps: newHealth.steps ? Number(newHealth.steps) : undefined,
        activity: newHealth.activity.trim() || undefined
      };
      const res = await API.post("/health/add", payload);
      setHealthRecords((prev) => [res.data, ...prev]);
      setParents((prev) =>
        prev.map((p) =>
          p._id === selectedParent._id
            ? {
                ...p,
                heartRate: res.data.heartRate !== undefined ? res.data.heartRate : p.heartRate,
                spO2: res.data.spO2 !== undefined ? res.data.spO2 : p.spO2,
                bloodPressure: res.data.bloodPressure || p.bloodPressure,
                activity: res.data.activity || p.activity
              }
            : p
        )
      );
      setShowAddHealth(false);
      setNewHealth({ heartRate: "", spO2: "", bloodPressure: "", steps: "", activity: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to record health measurement");
    }
  };

  const parentHealthRecords = useMemo(
    () => healthRecords.filter((r) => r.parent === selectedParent?._id || r.parent?._id === selectedParent?._id),
    [healthRecords, selectedParent?._id]
  );
  const latestHealth = parentHealthRecords[0] || null;
  const latestHeartRate = latestHealth?.heartRate ?? selectedParent?.heartRate ?? null;
  const latestSpO2 = latestHealth?.spO2 ?? selectedParent?.spO2 ?? null;
  const latestBloodPressure = latestHealth?.bloodPressure || selectedParent?.bloodPressure || null;
  const latestActivity = latestHealth?.activity || selectedParent?.activity || null;
  const medicines = selectedParent?.medicines || [];
  const appointments = selectedParent?.appointments || [];
  const selectedParentSos = useMemo(
    () => sosAlerts.filter((alert) => alert.parentId === selectedParent?._id || alert.parentName === selectedParent?.name),
    [selectedParent, sosAlerts]
  );
  const currentDate = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="app-layout">
      <Sidebar onSOSClick={handleSOSClick} />
      <main className="main-content dashboard-shell">
        <header className="topbar">
          <div>
            <button className="icon-btn" type="button" onClick={() => navigate(-1)} aria-label="Back">‹</button>
          </div>
          <div className="topbar-actions">
            <span className="today-label">{currentDate}</span>
            <Link className="dashboard-home-btn" to="/" aria-label="Go to landing page without logging out">
              <span>Home</span>
            </Link>
            <button className="btn btn-primary compact" type="button" onClick={() => setShowAddParent(true)}>+ Add Parent</button>
            <button className="dashboard-logout-btn" type="button" onClick={handleLogout}>Logout</button>
            <button className="avatar-chip" type="button">{childName.charAt(0).toUpperCase()}</button>
          </div>
        </header>

        <section className="dashboard-heading">
          <h1>Dashboard</h1>
          <div className="toolbar">
            <label className="search-box">
              <span />
              <input
                value={parentSearch}
                onChange={(event) => setParentSearch(event.target.value)}
                placeholder="Search by name, phone, or condition"
                type="search"
              />
            </label>
            <select value={parentFilter} onChange={(event) => setParentFilter(event.target.value)}>
              <option value="all">Filters</option>
              <option value="sos">SOS alerts</option>
              <option value="orders">Medicine orders</option>
              <option value="voice">Voice messages</option>
            </select>
            <select value={parentSort} onChange={(event) => setParentSort(event.target.value)}>
              <option value="name-asc">Sort</option>
              <option value="name-desc">Name Z-A</option>
              <option value="age-asc">Age low-high</option>
              <option value="age-desc">Age high-low</option>
            </select>
          </div>
        </section>

        {parents.length === 0 ? (
          <section className="empty-dashboard">
            <div className="empty-symbol">+</div>
            <h2>No parents added yet</h2>
            <p>Add your first parent to start realtime monitoring.</p>
            <button className="btn btn-primary" onClick={() => setShowAddParent(true)} type="button">Add Parent</button>
          </section>
        ) : (
          <>
            <div className="parent-tabs">
              {visibleParents.map((parent) => (
                <button
                  key={parent._id}
                  className={`parent-pill ${selectedParent?._id === parent._id ? "active" : ""}`}
                  onClick={() => setSelectedParentId(parent._id)}
                  type="button"
                >
                  <span>{getInitials(parent.name)}</span>
                  <strong>{parent.name}</strong>
                  <small>{parent.uniqueCode}</small>
                </button>
              ))}
            </div>

            {selectedParent && (
              <>
                <section className="overview-grid">
                  <article className="patient-card">
                    <div className="patient-photo">{getInitials(selectedParent.name)}</div>
                    <div className="patient-info">
                      <div className="patient-title-row">
                        <h2>{selectedParent.name}</h2>
                        <span>Age <strong>{selectedParent.age || "N/A"}</strong></span>
                      </div>
                      <div className="tags">
                        <span>{selectedParent.conditions || "No recorded conditions"}</span>
                      </div>
                      <div className="patient-detail-grid">
                        <span>Blood Type <strong>{selectedParent.bloodType || "Not recorded"}</strong></span>
                        <span>Patient ID <strong>{selectedParent.uniqueCode}</strong></span>
                        <span>Contact <strong>{selectedParent.phone || "Not recorded"}</strong></span>
                      </div>
                    </div>
                  </article>

                  <article className="wellness-card">
                    <span>Care Monitoring</span>
                    <div className="wellness-ring" style={{ "--score": 0 }}>
                      <strong>--</strong>
                      <small>health index</small>
                    </div>
                    <b>{selectedParentSos.length > 0 ? "Active Alert" : (parentHealthRecords.length > 0 ? `Vitals Logged (${parentHealthRecords.length})` : "No Vitals Logged")}</b>
                    <Link to="/health-records" style={{ fontSize: "11px", color: "#003883", fontWeight: "700", textDecoration: "none", marginTop: "4px" }}>
                      View Trend Patterns →
                    </Link>
                  </article>
                </section>

                <section className="metrics-grid">
                  <article className="metric-card heart-card">
                    <div className="metric-head">
                      <span className="heart-dot" /> <small>{latestHeartRate ? "Latest Reading" : "No Sensor Connected"}</small>
                    </div>
                    <div>
                      <strong>{latestHeartRate !== null && latestHeartRate !== undefined ? latestHeartRate : "--"}</strong>
                      <span>{latestHeartRate ? "bpm" : "unmeasured"}</span>
                    </div>
                    <div className="bar-chart">
                      {parentHealthRecords.length > 0 && latestHeartRate ? (
                        parentHealthRecords
                          .filter((r) => r.heartRate)
                          .slice(0, 12)
                          .reverse()
                          .map((r, index) => {
                            const h = Math.max(8, Math.min(36, Math.round(((r.heartRate - 40) / 140) * 36)));
                            return <i key={r._id || index} style={{ height: `${h}px` }} title={`${r.heartRate} bpm`} />;
                          })
                      ) : (
                        <div style={{ fontSize: "11px", color: "#94a3b8", padding: "10px 0", textAlign: "center", width: "100%" }}>
                          No recorded measurements
                        </div>
                      )}
                    </div>
                  </article>

                  <article className="metric-card vitals-card">
                    <Metric label="SpO2" value={latestSpO2 !== null && latestSpO2 !== undefined ? `${latestSpO2}%` : "Not measured"} />
                    <Metric label="Blood Pressure" value={latestBloodPressure || "Not measured"} />
                    <Metric label="Activity" value={latestActivity || "Not measured"} />
                    <button
                      type="button"
                      style={{
                        marginTop: "6px",
                        fontSize: "11.5px",
                        background: "none",
                        border: "none",
                        color: "#003883",
                        fontWeight: "700",
                        cursor: "pointer",
                        padding: 0,
                        textAlign: "left"
                      }}
                      onClick={() => setShowAddHealth(true)}
                    >
                      + Record Vitals
                    </button>
                  </article>

                  <article className="metric-card alerts-card">
                    <span className="check-circle">{sosAlerts.length ? "!" : "OK"}</span>
                    <strong>{sosAlerts.length ? `${sosAlerts.length} active alert(s)` : "No active alerts"}</strong>
                    <small>{sosAlerts.length ? "Review emergency activity." : "Everything looks safe."}</small>
                    {selectedParentSos.length > 0 && (
                      <button
                        type="button"
                        style={{
                          marginTop: "6px",
                          fontSize: "11px",
                          background: "#dc2626",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "4px 10px",
                          cursor: "pointer",
                          fontWeight: "700"
                        }}
                        onClick={() => handleResolveSOS(selectedParentSos[0]?.sosId || selectedParentSos[0]?._id)}
                      >
                        Resolve Alert
                      </button>
                    )}
                  </article>
                </section>

                {/* AI Health Insights Powered by NVIDIA Nemotron */}
                <AiHealthInsights
                  key={`insights-${selectedParent._id}`}
                  parent={selectedParent}
                  onRecordVitals={() => setShowAddHealth(true)}
                />

                {/* AI Caregiver Assistant (Conversational) */}
                <AiCaregiverAssistant
                  key={`assistant-${selectedParent._id}`}
                  parent={selectedParent}
                />

                <section className="dashboard-two-col">
                  <Panel title="Daily Medicines" action="+ Add Medicine" onAction={() => setShowAddMedicine(true)}>
                    {medicines.length ? (
                      <div className="medicine-list">
                        {medicines.map((medicine) => (
                          <div className="medicine-row" key={medicine._id}>
                            <span>Rx</span>
                            <b>{medicine.name}</b>
                            <small>{medicine.dosage || "Dose not set"} / {medicine.frequency || "Daily"}</small>
                            <button onClick={() => handleRemoveMedicine(medicine._id)} type="button">Remove</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel icon="Rx" text="No medicines added for today." />
                    )}
                  </Panel>

                  <Panel title="Upcoming Appointments" action="+ Add Appointment" onAction={() => setShowAppointment(true)}>
                    {appointments.length ? (
                      <div className="appointment-list">
                        {appointments.slice(-3).map((appointment) => (
                          <div className="appointment-row" key={appointment._id}>
                            <b>{appointment.doctorName}</b>
                            <small>{appointment.specialty || "Doctor visit"} / {appointment.date} at {appointment.time}</small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel icon="Cal" text="No upcoming appointments found." />
                    )}
                  </Panel>
                </section>

                <section className="reminder-strip">
                  <Reminder title="Water Intake" value={selectedParent.reminders?.water?.enabled ? `Every ${selectedParent.reminders.water.intervalMinutes || 60} min` : "Not configured"} />
                  <Reminder title="Meal Schedule" value={selectedParent.reminders?.food?.breakfast ? "Configured" : "Not configured"} />
                  <Reminder title="Medication Alerts" value={`${selectedParent.reminders?.medicines?.length || 0} configured`} />
                  <button className="reminder-manage" type="button" onClick={openReminderSettings}>Manage</button>
                </section>

                {(medicineOrders.length > 0 || voiceMessages.length > 0) && (
                  <section className="activity-feed">
                    {medicineOrders.slice(0, 3).map((order, index) => (
                      <div key={`order-${index}`}>Medicine order from {order.parentName}: {order.medicines?.map((m) => m.name).join(", ")}</div>
                    ))}
                    {voiceMessages.slice(0, 3).map((message, index) => (
                      <div key={`voice-${index}`}>Voice message from {message.parentName}: {message.translatedText}</div>
                    ))}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>

      {showAddParent && (
        <Modal title="Add New Parent" onClose={() => setShowAddParent(false)}>
          <form onSubmit={handleCreateParent} className="modal-form">
            <label>Full Name<input required value={newParent.name} onChange={(e) => setNewParent({ ...newParent, name: e.target.value })} /></label>
            <div className="form-row">
              <label>Age<input type="number" value={newParent.age} onChange={(e) => setNewParent({ ...newParent, age: e.target.value })} /></label>
              <label>Blood Type<select value={newParent.bloodType} onChange={(e) => setNewParent({ ...newParent, bloodType: e.target.value })}><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></label>
            </div>
            <label>Phone<input value={newParent.phone} onChange={(e) => setNewParent({ ...newParent, phone: e.target.value })} /></label>
            <label>Health Conditions<input value={newParent.conditions} onChange={(e) => setNewParent({ ...newParent, conditions: e.target.value })} /></label>
            <button className="btn btn-primary" type="submit">Generate Parent Code</button>
          </form>
        </Modal>
      )}

      {showAddMedicine && (
        <Modal title={`Add Medicine for ${selectedParent?.name || "Parent"}`} onClose={() => setShowAddMedicine(false)}>
          <form onSubmit={handleAddMedicine} className="modal-form">
            <label>Medicine Name<input required value={newMedicine.name} onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })} /></label>
            <div className="form-row">
              <label>Dosage<input value={newMedicine.dosage} onChange={(e) => setNewMedicine({ ...newMedicine, dosage: e.target.value })} /></label>
              <label>Frequency<select value={newMedicine.frequency} onChange={(e) => setNewMedicine({ ...newMedicine, frequency: e.target.value })}><option>Daily</option><option>Twice Daily</option><option>Weekly</option><option>As Needed</option></select></label>
            </div>
            <button className="btn btn-primary" type="submit">Add Medicine</button>
          </form>
        </Modal>
      )}

      {showAppointment && (
        <Modal title="Add Appointment" onClose={() => setShowAppointment(false)}>
          <form onSubmit={handleAddAppointment} className="modal-form">
            <label>Doctor Name<input required value={newAppointment.doctorName} onChange={(e) => setNewAppointment({ ...newAppointment, doctorName: e.target.value })} /></label>
            <label>Specialty<input value={newAppointment.specialty} onChange={(e) => setNewAppointment({ ...newAppointment, specialty: e.target.value })} /></label>
            <div className="form-row">
              <label>Date<input required type="date" value={newAppointment.date} onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })} /></label>
              <label>Time<input required type="time" value={newAppointment.time} onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })} /></label>
            </div>
            <label>Notes<input value={newAppointment.notes} onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })} /></label>
            <button className="btn btn-primary" type="submit">Save Appointment</button>
          </form>
        </Modal>
      )}

      {showReminders && (
        <Modal title={`Manage Reminders for ${selectedParent?.name || "Parent"}`} onClose={() => setShowReminders(false)}>
          <form onSubmit={handleSaveReminders} className="modal-form">
            {reminderForm.medicines.map((medicine, index) => (
              <div className="reminder-editor" key={index}>
                <label>Medicine<input value={medicine.name} onChange={(e) => updateMedicineReminder(index, "name", e.target.value)} /></label>
                <div className="form-row">
                  <label>Times<input value={medicine.times} onChange={(e) => updateMedicineReminder(index, "times", e.target.value)} /></label>
                  <label>Per Day<input type="number" min="1" value={medicine.timesPerDay} onChange={(e) => updateMedicineReminder(index, "timesPerDay", e.target.value)} /></label>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={() => setReminderForm((prev) => ({ ...prev, medicines: [...prev.medicines, { name: "", times: "08:00", timesPerDay: 1 }] }))}>Add Another Medicine</button>
            <div className="form-row">
              <label>Water Every<select value={reminderForm.water.intervalMinutes} onChange={(e) => setReminderForm((prev) => ({ ...prev, water: { ...prev.water, intervalMinutes: e.target.value } }))}><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option></select></label>
              <label>Breakfast<input type="time" value={reminderForm.food.breakfast} onChange={(e) => setReminderForm((prev) => ({ ...prev, food: { ...prev.food, breakfast: e.target.value } }))} /></label>
            </div>
            <button className="btn btn-primary" type="submit">Save Reminders</button>
          </form>
        </Modal>
      )}

      {showAddHealth && (
        <Modal title={`Record Health Reading for ${selectedParent?.name || "Parent"}`} onClose={() => setShowAddHealth(false)}>
          <form onSubmit={handleAddHealth} className="modal-form">
            <div className="form-row">
              <label>Heart Rate (bpm)
                <input
                  type="number"
                  min="30"
                  max="250"
                  placeholder="e.g. 74"
                  value={newHealth.heartRate}
                  onChange={(e) => setNewHealth((prev) => ({ ...prev, heartRate: e.target.value }))}
                />
              </label>
              <label>SpO2 Level (%)
                <input
                  type="number"
                  min="50"
                  max="100"
                  placeholder="e.g. 98"
                  value={newHealth.spO2}
                  onChange={(e) => setNewHealth((prev) => ({ ...prev, spO2: e.target.value }))}
                />
              </label>
            </div>
            <div className="form-row">
              <label>Blood Pressure (SYS/DIA)
                <input
                  placeholder="e.g. 120/80"
                  value={newHealth.bloodPressure}
                  onChange={(e) => setNewHealth((prev) => ({ ...prev, bloodPressure: e.target.value }))}
                />
              </label>
              <label>Steps Walked
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 3500"
                  value={newHealth.steps}
                  onChange={(e) => setNewHealth((prev) => ({ ...prev, steps: e.target.value }))}
                />
              </label>
            </div>
            <label>Activity / Routine Note
              <input
                placeholder="e.g. Morning 20-min garden walk, resting comfortably"
                value={newHealth.activity}
                onChange={(e) => setNewHealth((prev) => ({ ...prev, activity: e.target.value }))}
              />
            </label>
            <button className="btn btn-primary" type="submit">Save Health Reading</button>
          </form>
        </Modal>
      )}

      {showFallModal && (
        <FallDetectionModal
          parentName={sosAlerts[0]?.parentName || "Parent"}
          onClose={() => {
            const idToResolve = sosAlerts[0]?.sosId || sosAlerts[0]?._id;
            if (idToResolve) handleResolveSOS(idToResolve);
            setShowFallModal(false);
          }}
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

function Metric({ label, value }) {
  return (
    <div className="vital-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, action, onAction, children }) {
  return (
    <article className="dash-panel">
      <div className="panel-header">
        <h3>{title}</h3>
      </div>
      {children}
      <button className="panel-action" type="button" onClick={onAction}>{action}</button>
    </article>
  );
}

function EmptyPanel({ icon, text }) {
  return (
    <div className="panel-empty">
      <span>{icon}</span>
      <p>{text}</p>
    </div>
  );
}

function Reminder({ title, value }) {
  return (
    <article className="reminder-card">
      <span />
      <div>
        <strong>{title}</strong>
        <small>{value}</small>
      </div>
    </article>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal-container form-modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}
