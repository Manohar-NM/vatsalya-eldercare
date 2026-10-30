import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AiHealthInsights from "../components/AiHealthInsights";
import HealthPatternAnalysis from "../components/HealthPatternAnalysis";
import API from "../services/api";
import "./HealthRecords.css";

export default function HealthRecords() {
  const navigate = useNavigate();
  const [parents, setParents] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    let isSubscribed = true;
    API.get("/parents/my-parents")
      .then((res) => {
        if (isSubscribed) setParents(res.data || []);
      })
      .catch((err) => {
        if (isSubscribed) console.error("Error loading health records:", err);
      });
    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    return () => prescriptions.forEach((file) => URL.revokeObjectURL(file.previewUrl));
  }, [prescriptions]);

  const activeParent = useMemo(() => {
    if (!parents.length) return null;
    return parents.find((parent) => parent._id === selectedParentId) || parents[0] || null;
  }, [parents, selectedParentId]);

  const medicineHistory = useMemo(() => {
    return parents.flatMap((parent) =>
      (parent.medicines || []).map((medicine) => ({
        ...medicine,
        parentName: parent.name,
        parentCode: parent.uniqueCode
      }))
    );
  }, [parents]);

  const totalMedicines = medicineHistory.length;
  const configuredParents = parents.filter((parent) => (parent.medicines || []).length > 0).length;

  const handlePrescriptionUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setPrescriptions((prev) => [
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type || "Document",
        uploadedAt: new Date(),
        previewUrl: URL.createObjectURL(file)
      })),
      ...prev
    ]);
    event.target.value = "";
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content records-shell">
        <header className="topbar records-topbar">
          <div>
            <button className="icon-btn" type="button" onClick={() => navigate(-1)} aria-label="Back">‹</button>
            <Link className="icon-btn" to="/" aria-label="Home">⌂</Link>
          </div>
          <button className="btn btn-primary compact" type="button" onClick={() => navigate("/dashboard")}>Add Parent</button>
        </header>

        {parents.length > 1 && (
          <div className="parent-tabs" style={{ marginBottom: "18px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {parents.map((parent) => (
              <button
                key={parent._id}
                className={`parent-pill ${activeParent?._id === parent._id ? "active" : ""}`}
                onClick={() => setSelectedParentId(parent._id)}
                type="button"
              >
                <span>{parent.name?.slice(0, 2).toUpperCase()}</span>
                <strong>{parent.name}</strong>
                <small>{parent.uniqueCode}</small>
              </button>
            ))}
          </div>
        )}

        {/* AI Health Insights Section */}
        {activeParent && (
          <AiHealthInsights
            key={`insights-${activeParent._id}`}
            parent={activeParent}
            onRecordVitals={() => navigate("/dashboard")}
          />
        )}

        {/* Health Pattern & Trend Analysis */}
        {activeParent && (
          <HealthPatternAnalysis
            key={`trends-${activeParent._id}`}
            parent={activeParent}
            onRecordVitals={() => navigate("/dashboard")}
          />
        )}

        <section className="records-grid">
          <article className="record-card medicine-history-card">
            <div className="empty-illustration">Rx</div>
            <h1>{medicineHistory.length ? "Medicine History" : "No Medicine History"}</h1>
            <p>
              {medicineHistory.length
                ? "Medicines assigned by caregivers are listed below for quick review."
                : "You haven't added any medication records yet. Start by logging current prescriptions to track dosage and timings."}
            </p>
            {medicineHistory.length ? (
              <div className="history-list">
                {medicineHistory.slice(0, 8).map((medicine) => (
                  <div className="history-row" key={`${medicine.parentCode}-${medicine._id || medicine.name}`}>
                    <span>Rx</span>
                    <div>
                      <strong>{medicine.name}</strong>
                      <small>{medicine.dosage || "Dosage not set"} / {medicine.frequency || "Daily"} / {medicine.parentName}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button className="btn btn-outline" type="button" onClick={() => navigate("/dashboard")}>+ Log New Medicine</button>
            )}
            <div className="health-tip">
              <strong>Health Tip</strong>
              <span>Consistent tracking leads to stronger clinical outcomes for long-term recovery.</span>
            </div>
          </article>

          <article className="record-card upload-card">
            <div className="upload-title-row">
              <h2>Upload Prescription</h2>
              <span>Secure PWA Cloud</span>
            </div>
            <label className="drop-zone">
              <input type="file" accept="image/*,.pdf,application/pdf" multiple onChange={handlePrescriptionUpload} />
              <span className="upload-cloud">Up</span>
              <strong>Drag & Drop Files</strong>
              <small>Select or drag and drop clinical reports or prescription images here for AI-powered processing.</small>
              <em>JPG</em><em>PNG</em><em>WEBP</em><em>PDF</em>
              <b>Choose Files</b>
            </label>
            <div className="upload-meta">
              <span>End-to-End Encrypted</span>
              <span>Max size 20MB per file</span>
            </div>
            {prescriptions.length > 0 && (
              <div className="prescription-list">
                {prescriptions.map((file) => (
                  <a key={file.id} href={file.previewUrl} target="_blank" rel="noreferrer" className="prescription-file">
                    <span>{file.type.includes("pdf") ? "PDF" : "IMG"}</span>
                    <div>
                      <strong>{file.name}</strong>
                      <small>{formatFileSize(file.size)} / {file.uploadedAt.toLocaleTimeString()}</small>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </article>

          <aside className="record-card health-summary-card">
            <div className="summary-heading">
              <span>Care Summary</span>
              <strong>{activeParent?.name || "No parent selected"}</strong>
              <small>{activeParent?.uniqueCode || "Add a parent to begin"}</small>
            </div>

            <div className="summary-stat-grid">
              <SummaryStat label="Medicines" value={totalMedicines} />
              <SummaryStat label="Parents" value={parents.length} />
              <SummaryStat label="Prescriptions" value={prescriptions.length} />
              <SummaryStat label="Configured" value={configuredParents} />
            </div>

            <div className="summary-progress">
              <div>
                <strong>Record Completion</strong>
                <span>{Math.min(100, Math.round(((totalMedicines ? 1 : 0) + (prescriptions.length ? 1 : 0) + (activeParent?.phone ? 1 : 0)) / 3 * 100))}%</span>
              </div>
              <i style={{ width: `${Math.min(100, Math.round(((totalMedicines ? 1 : 0) + (prescriptions.length ? 1 : 0) + (activeParent?.phone ? 1 : 0)) / 3 * 100))}%` }} />
            </div>

            <div className="summary-checklist">
              <ChecklistItem done={Boolean(activeParent)} text="Parent profile connected" />
              <ChecklistItem done={totalMedicines > 0} text="Medicine history available" />
              <ChecklistItem done={prescriptions.length > 0} text="Prescription uploaded" />
              <ChecklistItem done={Boolean(activeParent?.phone)} text="Emergency contact added" />
            </div>

            <button className="btn btn-primary" type="button" onClick={() => navigate("/dashboard")}>
              Manage Records
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div className="summary-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ChecklistItem({ done, text }) {
  return (
    <div className={`checklist-item ${done ? "done" : ""}`}>
      <span>{done ? "OK" : "--"}</span>
      <strong>{text}</strong>
    </div>
  );
}
