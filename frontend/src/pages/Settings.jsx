import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import API from "../services/api";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import "./Settings.css";

const languages = [
  { code: "en", label: "English", script: "Aa" },
  { code: "hi", label: "Hindi", script: "अ" },
  { code: "kn", label: "Kannada", script: "ಅ" },
  { code: "ta", label: "Tamil", script: "அ" },
  { code: "te", label: "Telugu", script: "అ" },
  { code: "ml", label: "Malayalam", script: "അ" }
];

const defaultSettings = {
  language: "English",
  healthAlerts: true,
  medReminders: true,
  activityReports: false,
  contacts: []
};

export default function Settings() {
  const [showEmergency, setShowEmergency] = useState(false);
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

  const childName = localStorage.getItem("userName") || "Caregiver";
  const childEmail = localStorage.getItem("userEmail") || "";

  const selectedParent = useMemo(
    () => parents.find((parent) => parent._id === selectedParentId) || parents[0] || null,
    [parents, selectedParentId]
  );

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
    const connectedParentContact = selectedParent ? [{
      id: `parent-${selectedParent._id}`,
      name: selectedParent.name,
      relation: "Connected Parent",
      phone: selectedParent.phone || "Phone not added",
      initials: getInitials(selectedParent.name),
      color: "#1a3c5e",
      locked: true
    }] : [];

    return [
      ...connectedParentContact,
      ...settings.contacts.map((contact) => ({
        ...contact,
        initials: getInitials(contact.name),
        color: "#3b82f6"
      }))
    ];
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
    alert(`Permissions are active for ${selectedParent?.name || "the connected parent"}.\n\nNotifications: ${settings.healthAlerts ? "On" : "Off"}\nMedication reminders: ${settings.medReminders ? "On" : "Off"}\nActivity reports: ${settings.activityReports ? "On" : "Off"}`);
  };

  const avatarInitials = getInitials(selectedParent?.name || childName);

  return (
    <div className="app-layout">
      <Sidebar onSOSClick={() => setShowEmergency(true)} />

      <main className="main-content" id="settings-page">
        <div className="page-header animate-fade-in">
          <div>
            <h1>Account Settings</h1>
            <p className="page-subtitle">
              Settings are connected to the selected parent under {childName}'s caregiver account.
            </p>
          </div>
        </div>

        {toast && (
          <div className="settings-toast" onAnimationEnd={() => setToast("")}>
            {toast}
          </div>
        )}

        <div className="settings-layout">
          <div className="settings-main">
            <div className="settings-section card animate-slide-up" style={{ animationDelay: "0.05s" }}>
              <div className="section-header">
                <div className="section-icon" style={{ background: "var(--info-bg)" }}>ID</div>
                <div>
                  <h3>Connected Parent</h3>
                  <p>Choose which parent these settings should apply to.</p>
                </div>
              </div>
              <select className="parent-select" value={selectedParent?._id || ""} onChange={(e) => setSelectedParentId(e.target.value)}>
                {parents.map((parent) => (
                  <option key={parent._id} value={parent._id}>
                    {parent.name} - {parent.uniqueCode}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-section card animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="section-header">
                <div className="section-icon" style={{ background: "var(--info-bg)" }}>Lang</div>
                <div>
                  <h3>Preferred Language</h3>
                  <p>Choose the language for alerts and interface.</p>
                </div>
              </div>
              <div className="language-grid">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`lang-btn ${settings.language === lang.label ? "active" : ""}`}
                    onClick={() => updateSetting("language", lang.label)}
                    id={`lang-${lang.code}`}
                  >
                    <span className="lang-script">{lang.script}</span>
                    <span className="lang-label">{lang.label}</span>
                    {settings.language === lang.label && <span className="lang-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-section card animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="section-header">
                <div className="section-icon" style={{ background: "var(--warning-bg)" }}>Bell</div>
                <div>
                  <h3>Notifications</h3>
                  <p>Control how you receive updates for {selectedParent?.name || "the selected parent"}.</p>
                </div>
              </div>
              <div className="notification-list">
                <NotificationToggle
                  title="Health Alerts"
                  desc="Enable alerts for critical health events."
                  checked={settings.healthAlerts}
                  onChange={() => updateSetting("healthAlerts", !settings.healthAlerts)}
                />
                <NotificationToggle
                  title="Medication Reminders"
                  desc="Schedule notifications for daily doses."
                  checked={settings.medReminders}
                  onChange={() => updateSetting("medReminders", !settings.medReminders)}
                />
                <NotificationToggle
                  title="Activity Reports"
                  desc="Weekly digest of health summaries."
                  checked={settings.activityReports}
                  onChange={() => updateSetting("activityReports", !settings.activityReports)}
                />
              </div>
            </div>

            <div className="settings-section card animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <div className="section-header">
                <div className="section-icon" style={{ background: "var(--danger-bg)" }}>SOS</div>
                <div>
                  <h3>Emergency Contacts</h3>
                  <p>Connected parent and custom contacts for emergency follow-up.</p>
                </div>
                <button className="btn btn-outline add-contact-btn" id="add-contact-btn" onClick={openAddContact}>+ Add New</button>
              </div>
              <div className="contacts-grid">
                {parentContacts.map((contact) => (
                  <div key={contact.id} className="contact-card">
                    <div className="contact-avatar" style={{ background: contact.color }}>
                      {contact.initials}
                    </div>
                    <div className="contact-info">
                      <span className="contact-name">{contact.name}</span>
                      <span className="contact-relation">{contact.relation}</span>
                      <span className="contact-phone">{contact.phone}</span>
                    </div>
                    <button className="contact-edit" onClick={() => openEditContact(contact)}>Edit</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-section card animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <div className="section-header">
                <div className="section-icon" style={{ background: "var(--success-bg)" }}>Lock</div>
                <div>
                  <h3>Security & Data Privacy</h3>
                  <p>Review current permission status for this caregiver account.</p>
                </div>
                <button className="btn btn-primary" id="review-permissions-btn" onClick={reviewPermissions}>Review Permissions</button>
              </div>
            </div>
          </div>

          <div className="settings-profile animate-slide-right">
            <div className="profile-card-settings card">
              <div className="profile-image-wrapper">
                <div className="profile-image-placeholder">
                  <span>{avatarInitials}</span>
                </div>
              </div>
              <h3 className="profile-settings-name">{selectedParent?.name || "No parent connected"}</h3>
              <p className="profile-settings-id">
                Parent ID: {selectedParent?.uniqueCode || "Not available"}
              </p>
              <p className="profile-settings-id">
                Child: {childName}{childEmail ? ` (${childEmail})` : ""}
              </p>
              <button className="btn btn-outline edit-profile-btn" id="edit-profile-btn" onClick={openProfileEditor} disabled={!selectedParent}>Edit Profile</button>
            </div>
          </div>
        </div>
      </main>

      {showContactForm && (
        <div className="modal-overlay">
          <div className="settings-modal card animate-modal">
            <h2>{editingContactId ? "Edit Contact" : "Add Emergency Contact"}</h2>
            <form onSubmit={saveContact} className="settings-form">
              <label>Name<input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required /></label>
              <label>Relation<input value={contactForm.relation} onChange={(e) => setContactForm({ ...contactForm, relation: e.target.value })} required /></label>
              <label>Phone<input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} required /></label>
              <div className="settings-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowContactForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileForm && (
        <div className="modal-overlay">
          <div className="settings-modal card animate-modal">
            <h2>Edit Parent Profile</h2>
            <form onSubmit={saveParentProfile} className="settings-form">
              <label>Name<input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required /></label>
              <label>Age<input type="number" value={profileForm.age} onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })} /></label>
              <label>Phone<input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></label>
              <label>Conditions<input value={profileForm.conditions} onChange={(e) => setProfileForm({ ...profileForm, conditions: e.target.value })} /></label>
              <label>Location<input value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} placeholder="e.g. Bengaluru, Karnataka" /></label>
              <label>Blood Type
                <select value={profileForm.bloodType} onChange={(e) => setProfileForm({ ...profileForm, bloodType: e.target.value })}>
                  <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                  <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
                </select>
              </label>
              <div className="settings-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowProfileForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmergency && (
        <EmergencyAlertModal
          onClose={() => setShowEmergency(false)}
          onCallDispatch={() => { alert("Connecting..."); setShowEmergency(false); }}
        />
      )}
    </div>
  );
}

function NotificationToggle({ title, desc, checked, onChange }) {
  return (
    <div className="notif-item">
      <div className="notif-info">
        <span className="notif-title">{title}</span>
        <span className="notif-desc">{desc}</span>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}

function getInitials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
