import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import API from "../services/api";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import "./HealthRecords.css";

export default function HealthRecords() {
  const [showEmergency, setShowEmergency] = useState(false);
  const [parents, setParents] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    API.get("/parents/my-parents")
      .then((res) => setParents(res.data || []))
      .catch((err) => console.error("Error loading health records:", err));
  }, []);

  useEffect(() => {
    return () => {
      prescriptions.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    };
  }, [prescriptions]);

  const medicineHistory = useMemo(() => {
    return parents.flatMap((parent) =>
      (parent.medicines || []).map((medicine) => ({
        ...medicine,
        parentName: parent.name,
        parentCode: parent.uniqueCode
      }))
    );
  }, [parents]);

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
      <Sidebar onSOSClick={() => setShowEmergency(true)} />

      <main className="main-content" id="health-records-page">
        <div className="page-header animate-fade-in">
          <div>
            <span className="page-tag">Caregiver Portal</span>
            <h1>Health Records</h1>
            <p className="page-subtitle">
              Keep parent medicine history and uploaded prescriptions together for easier care coordination.
            </p>
          </div>
        </div>

        <div className="services-grid health-records-grid">
          <div className="service-card card animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="service-icon-row">
              <div className="service-icon medicine-icon">Rx</div>
            </div>
            <h2>Past Medicines History</h2>
            <p className="service-desc">
              Medicines booked or added by the child/caregiver are shown here as parent medication history.
            </p>

            {medicineHistory.length ? (
              <div className="medicine-history-list">
                {medicineHistory.slice(0, 8).map((medicine) => (
                  <div key={`${medicine.parentCode}-${medicine._id || medicine.name}`} className="history-medicine-item">
                    <div className="history-medicine-icon">Rx</div>
                    <div>
                      <strong>{medicine.name}</strong>
                      <span>{medicine.dosage || "Dosage not set"} | {medicine.frequency || "Daily"}</span>
                      <small>{medicine.parentName} | Added by caregiver</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="records-empty-state">
                No medicine history yet. Add medicines from the dashboard to create a record.
              </div>
            )}
          </div>

          <div className="service-card card animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="service-icon-row">
              <div className="service-icon doctor-icon">PDF</div>
            </div>
            <h2>Upload Prescription</h2>
            <p className="service-desc">
              Upload prescription images or PDF documents for quick reference during medicine booking.
            </p>

            <label className="prescription-upload-zone">
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                multiple
                onChange={handlePrescriptionUpload}
              />
              <span>Upload images or PDF</span>
              <small>Supports JPG, PNG, WEBP, and PDF files</small>
            </label>

            <div className="prescription-list">
              {prescriptions.length ? (
                prescriptions.map((file) => (
                  <a
                    key={file.id}
                    className="prescription-file"
                    href={file.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="prescription-file-icon">
                      {file.type.includes("pdf") ? "PDF" : "IMG"}
                    </span>
                    <span>
                      <strong>{file.name}</strong>
                      <small>{formatFileSize(file.size)} | Uploaded {file.uploadedAt.toLocaleTimeString()}</small>
                    </span>
                  </a>
                ))
              ) : (
                <div className="records-empty-state">
                  Uploaded prescriptions will appear here for preview.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showEmergency && (
        <EmergencyAlertModal
          onClose={() => setShowEmergency(false)}
          onCallDispatch={() => { alert("Connecting..."); setShowEmergency(false); }}
        />
      )}
    </div>
  );
}
