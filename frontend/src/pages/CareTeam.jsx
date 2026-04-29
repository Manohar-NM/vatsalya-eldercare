import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import API from "../services/api";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import "./CareTeam.css";

const buildMapsUrl = (hospital, parentLocationText) => {
  const query = encodeURIComponent(`${hospital.name} ${parentLocationText || ""}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export default function CareTeam() {
  const [showEmergency, setShowEmergency] = useState(false);
  const [parents, setParents] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState("");
  const [hospitalNotice, setHospitalNotice] = useState("");
  const [dispatchHospital, setDispatchHospital] = useState(null);
  const [dispatchStatus, setDispatchStatus] = useState("");

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
      .catch((err) => console.error("Error loading parents:", err));
  }, []);

  const getBrowserLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location is not supported in this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          label: "current device location"
        }),
        () => reject(new Error("Allow location access or add the parent's location in settings.")),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });

  const fetchNearbyHospitals = async (origin) => {
    const res = await API.get("/nearby/hospitals", {
      params: {
        lat: origin?.lat,
        lon: origin?.lon,
        label: origin?.label,
        location: selectedParent?.location
      }
    });

    return res.data;
  };

  const loadHospitals = async () => {
    setLoadingHospitals(true);
    setHospitalError("");
    setHospitalNotice("");
    setDispatchStatus("");

    try {
      let origin = null;

      if (!selectedParent?.location) {
        try {
          origin = await getBrowserLocation();
        } catch {
          origin = null;
        }
      }

      const result = await fetchNearbyHospitals(origin);
      const results = result.hospitals || [];

      setHospitals(results);
      setHospitalNotice(result.message || "");

      if (!results.length) {
        setHospitalError("No hospitals were found within 10 km of this location.");
      }
    } catch (err) {
      setHospitals([]);
      setHospitalError(err.response?.data?.message || err.message || "Unable to load nearby hospitals.");
    } finally {
      setLoadingHospitals(false);
    }
  };

  useEffect(() => {
    if (!selectedParent) return undefined;
    const timer = setTimeout(loadHospitals, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParent?._id]);

  const triggerHospitalDispatch = async () => {
    if (!dispatchHospital || !selectedParent) return;

    const parentLocationText = selectedParent.location || "the parent's current/saved location";
    const message = `Emergency SOS for ${selectedParent.name}. Please dispatch an ambulance to ${parentLocationText}. Parent phone: ${selectedParent.phone || "not available"}.`;

    try {
      await navigator.clipboard?.writeText(message);
    } catch {
      // Clipboard may be blocked; the message is still shown in the UI.
    }

    setDispatchStatus(`SOS dispatch message prepared for ${dispatchHospital.name}.`);

    if (dispatchHospital.phone) {
      window.location.href = `tel:${dispatchHospital.phone}`;
    } else {
      window.open(buildMapsUrl(dispatchHospital, parentLocationText), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar onSOSClick={() => setShowEmergency(true)} />

      <main className="main-content" id="care-team-page">
        <div className="page-header animate-fade-in">
          <div>
            <span className="page-tag">Emergency Coordination</span>
            <h1>Nearby Hospitals</h1>
            <p className="page-subtitle">
              Real hospital results are loaded from OpenStreetMap near the parent's saved location. Select a hospital to prepare an ambulance dispatch request.
            </p>
          </div>
          <button className="btn btn-primary" id="refresh-hospitals-btn" onClick={loadHospitals} disabled={loadingHospitals || !selectedParent}>
            {loadingHospitals ? "Finding..." : "Refresh Hospitals"}
          </button>
        </div>

        <div className="hospital-controls card animate-fade-in">
          <label>
            <span>Parent location reference</span>
            <select value={selectedParent?._id || ""} onChange={(e) => setSelectedParentId(e.target.value)}>
              {parents.map((parent) => (
                <option key={parent._id} value={parent._id}>
                  {parent.name} {parent.location ? `- ${parent.location}` : "- browser location fallback"}
                </option>
              ))}
            </select>
          </label>
          <p>
            {selectedParent?.location
              ? `Using saved location for ${selectedParent.name}: ${selectedParent.location}`
              : "No saved parent location found. Browser location permission is used as fallback."}
          </p>
        </div>

        {hospitalError && (
          <div className="hospital-error card animate-fade-in">
            {hospitalError}
          </div>
        )}

        {hospitalNotice && !hospitalError && (
          <div className="hospital-notice card animate-fade-in">
            {hospitalNotice}
          </div>
        )}

        <div className="team-grid hospital-grid">
          {hospitals.map((hospital, i) => (
            <button
              key={hospital.id}
              className="team-card hospital-card card animate-slide-up"
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => setDispatchHospital(hospital)}
            >
              <div className="team-card-header">
                <div className="team-avatar hospital-avatar">
                  ER
                </div>
                <span className="team-status online">
                  {hospital.distanceKm.toFixed(1)} km
                </span>
              </div>
              <h3 className="team-name">{hospital.name}</h3>
              <p className="team-role">{hospital.address || "Address available on map"}</p>

              <div className="team-details">
                <div className="team-detail">
                  <span className="td-label">Emergency</span>
                  <span className="td-value">{hospital.emergency || "Hospital care"}</span>
                </div>
                <div className="team-detail">
                  <span className="td-label">Phone</span>
                  <span className="td-value">{hospital.phone || "Map contact"}</span>
                </div>
              </div>

              <div className="hospital-dispatch-btn">
                Prepare Ambulance SOS
              </div>
            </button>
          ))}
        </div>

        {!loadingHospitals && !hospitalError && !hospitals.length && (
          <div className="hospital-empty card animate-fade-in">
            Select a parent and refresh to load nearby hospitals.
          </div>
        )}
      </main>

      {dispatchHospital && (
        <div className="modal-overlay">
          <div className="hospital-dispatch-modal card animate-modal">
            <span className="page-tag">Confirm SOS Dispatch</span>
            <h2>{dispatchHospital.name}</h2>
            <p>
              Trigger an SOS request asking this hospital to dispatch an ambulance to {selectedParent?.name}'s location?
            </p>
            <div className="dispatch-message">
              Emergency SOS for {selectedParent?.name}. Please dispatch an ambulance to {selectedParent?.location || "the parent's current/saved location"}.
            </div>
            {dispatchStatus && <div className="dispatch-status">{dispatchStatus}</div>}
            <div className="dispatch-actions">
              <button className="btn btn-outline" onClick={() => { setDispatchHospital(null); setDispatchStatus(""); }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={triggerHospitalDispatch}>
                Trigger SOS
              </button>
            </div>
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
