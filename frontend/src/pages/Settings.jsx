import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../services/api";
import "./Settings.css";

const languages = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam"];
const defaultSettings = { language: "English", healthAlerts: true, medReminders: true, activityReports: false, contacts: [] };

export default function Settings() {
  const navigate = useNavigate();
  const [parents, setParents] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("vatsalyaSettings");
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactForm, setContactForm] = useState({ name: "", relation: "", phone: "" });
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", age: "", phone: "", conditions: "", bloodType: "O+", location: "" });
  const [toast, setToast] = useState("");

  const childName = localStorage.getItem("userName") || "Ananya Vatsalya";
  const childEmail = localStorage.getItem("userEmail") || "ananya.v@healthmail.com";
  const selectedParent = useMemo(() => parents.find((parent) => parent._id === selectedParentId) || parents[0] || null, [parents, selectedParentId]);

  useEffect(() => {
    API.get("/parents/my-parents")
      .then((res) => {
        const parentList = res.data || [];
        setParents(parentList);
        setSelectedParentId(parentList[0]?._id || "");
      })
      .catch((err) => console.error("Error loading settings parents:", err));
  }, []);

  useEffect(() => {
    localStorage.setItem("vatsalyaSettings", JSON.stringify(settings));
  }, [settings]);

  const parentContacts = useMemo(() => {
    const connected = selectedParent ? [{
      id: `parent-${selectedParent._id}`,
      name: selectedParent.name,
      relation: "Family physician",
      phone: selectedParent.phone || "Phone not added",
      initials: getInitials(selectedParent.name),
      locked: true
    }] : [];
    return [...connected, ...settings.contacts.map((contact) => ({ ...contact, initials: getInitials(contact.name) }))];
  }, [selectedParent, settings.contacts]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setToast("Settings updated");
  };

  const openAddContact = () => {
    setEditingContactId(null);
    setContactForm({ name: "", relation: "", phone: "" });
    setShowContactForm(true);
  };

  const openEditContact = (contact) => {
    if (contact.locked) {
      openProfileEditor();
      return;
    }
    setEditingContactId(contact.id);
    setContactForm({ name: contact.name, relation: contact.relation, phone: contact.phone });
    setShowContactForm(true);
  };

  const saveContact = (event) => {
    event.preventDefault();
    const contact = {
      id: editingContactId || `contact-${Date.now()}`,
      name: contactForm.name.trim(),
      relation: contactForm.relation.trim(),
      phone: contactForm.phone.trim()
    };
    if (!contact.name || !contact.phone) return;
    setSettings((prev) => ({
      ...prev,
      contacts: editingContactId
        ? prev.contacts.map((item) => item.id === editingContactId ? contact : item)
        : [contact, ...prev.contacts]
    }));
    setShowContactForm(false);
    setToast(editingContactId ? "Contact updated" : "Contact added");
  };

  const openProfileEditor = () => {
    if (!selectedParent) return;
    setProfileForm({
      name: selectedParent.name || "",
      age: selectedParent.age || "",
      phone: selectedParent.phone || "",
      conditions: selectedParent.conditions || "",
      bloodType: selectedParent.bloodType || "O+",
      location: selectedParent.location || ""
    });
    setShowProfileForm(true);
  };

  const saveParentProfile = async (event) => {
    event.preventDefault();
    if (!selectedParent) return;
    const profilePayload = {
      name: profileForm.name.trim(),
      age: Number(profileForm.age) || "",
      phone: profileForm.phone.trim(),
      conditions: profileForm.conditions.trim(),
      bloodType: profileForm.bloodType,
      location: profileForm.location.trim()
    };
    try {
      const res = await API.put(`/parents/${selectedParent._id}`, profilePayload);
      const updatedParent = res.data.parent;
      setParents((prev) => prev.map((parent) => parent._id === selectedParent._id ? updatedParent : parent));
      setShowProfileForm(false);
      setToast("Parent profile updated");
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || "Could not update parent profile");
    }
  };

  const reviewPermissions = () => {
    alert(`Permissions for ${selectedParent?.name || "connected parent"}\nHealth alerts: ${settings.healthAlerts ? "On" : "Off"}\nMedication reminders: ${settings.medReminders ? "On" : "Off"}\nActivity reports: ${settings.activityReports ? "On" : "Off"}`);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content settings-shell">
        <header className="topbar">
          <div>
            <button className="icon-btn" type="button" onClick={() => navigate(-1)} aria-label="Back">‹</button>
            <Link className="icon-btn" to="/" aria-label="Home">⌂</Link>
            <strong className="page-mini-title">Settings</strong>
          </div>
          <button className="btn btn-primary compact" type="button" onClick={() => navigate("/dashboard")}>Add Parent</button>
        </header>

        {toast && <div className="settings-toast" onAnimationEnd={() => setToast("")}>{toast}</div>}

        <section className="settings-grid">
          <div className="settings-main">
            <article className="settings-card">
              <h2>Connected Parent</h2>
              <select value={selectedParent?._id || ""} onChange={(event) => setSelectedParentId(event.target.value)}>
                {parents.map((parent) => <option key={parent._id} value={parent._id}>{parent.name} (ID: {parent.uniqueCode})</option>)}
              </select>
            </article>

            <article className="settings-card">
              <h2>Preferred Language</h2>
              <div className="language-row">
                {languages.map((language) => (
                  <button key={language} className={settings.language === language ? "active" : ""} onClick={() => updateSetting("language", language)} type="button">{language}</button>
                ))}
              </div>
            </article>
          </div>

          <div className="settings-secondary">
            <article className="settings-card">
              <h2>Notifications & Alerts</h2>
              <NotificationToggle title="Health Alerts" desc="Realtime notification for abnormal vitals" checked={settings.healthAlerts} onChange={() => updateSetting("healthAlerts", !settings.healthAlerts)} />
              <NotificationToggle title="Medication Reminders" desc="Timely prompts for daily pill intake" checked={settings.medReminders} onChange={() => updateSetting("medReminders", !settings.medReminders)} />
              <NotificationToggle title="Activity Reports" desc="Weekly digest of health and movement trends" checked={settings.activityReports} onChange={() => updateSetting("activityReports", !settings.activityReports)} />
            </article>

            <article className="settings-card">
              <div className="settings-card-head">
                <h2>Emergency Contacts</h2>
                <button type="button" onClick={openAddContact}>Add New</button>
              </div>
              <div className="contacts-list">
                {parentContacts.map((contact) => (
                  <div className="contact-row" key={contact.id}>
                    <span>{contact.initials}</span>
                    <div>
                      <strong>{contact.name}</strong>
                      <small>{contact.relation} / {contact.phone}</small>
                    </div>
                    <button type="button" onClick={() => openEditContact(contact)}>Edit</button>
                  </div>
                ))}
              </div>
            </article>

            <article className="privacy-row">
              <div>
                <strong>Security & Privacy</strong>
                <small>Manage app permissions and biometric locks.</small>
              </div>
              <button className="btn btn-outline" type="button" onClick={reviewPermissions}>Review Permissions</button>
            </article>
          </div>

          <aside className="settings-aside">
            <article className="profile-panel">
              <div className="profile-photo">{getInitials(selectedParent?.name || childName)}</div>
              <h1>{selectedParent?.name || childName}</h1>
              <p>Caregiver ID: CG-8802</p>
              <dl>
                <dt>Parent ID</dt>
                <dd>{selectedParent?.uniqueCode || "Not linked"}</dd>
                <dt>Linked Email</dt>
                <dd>{childEmail}</dd>
              </dl>
              <button type="button" onClick={openProfileEditor} disabled={!selectedParent}>Edit Profile</button>
            </article>

            <article className="support-panel">
              <strong>Need assistance?</strong>
              <span>Our support team is available 24/7 for app-related technical issues.</span>
              <a href="mailto:support@vatsalya.care">Contact Support</a>
            </article>

            <article className="device-status-panel">
              <div className="device-status-head">
                <strong>Parent Device</strong>
                <span>{selectedParent ? "Ready" : "Not linked"}</span>
              </div>
              <div className="device-code-box">
                <small>Activation Code</small>
                <b>{selectedParent?.uniqueCode || "No Code"}</b>
              </div>
              <DeviceCheck done={Boolean(selectedParent)} text="Parent profile linked" />
              <DeviceCheck done={settings.medReminders} text="Medicine reminders enabled" />
              <DeviceCheck done={settings.healthAlerts} text="Emergency alerts enabled" />
              <DeviceCheck done={Boolean(selectedParent?.location)} text="Location saved" />
            </article>
          </aside>
        </section>
      </main>

      {showContactForm && (
        <Modal title={editingContactId ? "Edit Contact" : "Add Emergency Contact"} onClose={() => setShowContactForm(false)}>
          <form onSubmit={saveContact} className="settings-form">
            <label>Name<input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required /></label>
            <label>Relation<input value={contactForm.relation} onChange={(e) => setContactForm({ ...contactForm, relation: e.target.value })} required /></label>
            <label>Phone<input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} required /></label>
            <button className="btn btn-primary" type="submit">Save Contact</button>
          </form>
        </Modal>
      )}

      {showProfileForm && (
        <Modal title="Edit Parent Profile" onClose={() => setShowProfileForm(false)}>
          <form onSubmit={saveParentProfile} className="settings-form">
            <label>Name<input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required /></label>
            <label>Age<input type="number" value={profileForm.age} onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })} /></label>
            <label>Phone<input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></label>
            <label>Conditions<input value={profileForm.conditions} onChange={(e) => setProfileForm({ ...profileForm, conditions: e.target.value })} /></label>
            <label>Location<input value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} /></label>
            <label>Blood Type<select value={profileForm.bloodType} onChange={(e) => setProfileForm({ ...profileForm, bloodType: e.target.value })}><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></label>
            <button className="btn btn-primary" type="submit">Save Profile</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function NotificationToggle({ title, desc, checked, onChange }) {
  return (
    <div className="notif-item">
      <div>
        <strong>{title}</strong>
        <small>{desc}</small>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span />
      </label>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function getInitials(name) {
  return String(name || "?").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function DeviceCheck({ done, text }) {
  return (
    <div className={`device-check ${done ? "done" : ""}`}>
      <span>{done ? "OK" : "--"}</span>
      <strong>{text}</strong>
    </div>
  );
}
