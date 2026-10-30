import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../services/api";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import "./CareTeam.css";

const buildMapsUrl = (hospital, parentLocationText) => {
  const query = encodeURIComponent(`${hospital.name} ${parentLocationText || ""}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

const buildNearbyHospitalsUrl = (locationText) => {
  const query = encodeURIComponent(`hospitals near ${locationText}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export default function CareTeam() {
  const navigate = useNavigate();
  const [showEmergency, setShowEmergency] = useState(false);
  const [parents, setParents] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [resolvedOrigin, setResolvedOrigin] = useState(null);
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
        setLocationInput(parentList[0]?.location || "");
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
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude, label: "current device location" }),
        () => reject(new Error("Allow location access or add the parent's location in settings.")),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });

  const fetchNearbyHospitals = async (origin, locationOverride = "") => {
    const savedLocation = locationOverride || locationInput.trim() || selectedParent?.location || "";
    const res = await API.get("/nearby/hospitals", {
      params: { lat: origin?.lat, lon: origin?.lon, label: origin?.label, location: savedLocation }
    });
    return res.data;
  };

  const loadHospitals = async (locationOverride = "") => {
    setLoadingHospitals(true);
    setHospitalError("");
    setResolvedOrigin(null);
    setDispatchStatus("");
    try {
      let origin = null;
      const activeLocation = locationOverride || locationInput.trim() || selectedParent?.location || "";
      if (!activeLocation) {
        try {
          origin = await getBrowserLocation();
        } catch {
          origin = null;
        }
      }
      const result = await fetchNearbyHospitals(origin, activeLocation);
      const results = result.hospitals || [];
      setHospitals(results);
      setResolvedOrigin(result.origin || null);
      if (!results.length) setHospitalError("No hospitals were found within 10 km of this location.");
    } catch (err) {
      setHospitals([]);
      setHospitalError(err.response?.data?.message || err.message || "Unable to load nearby hospitals.");
    } finally {
      setLoadingHospitals(false);
    }
  };

  useEffect(() => {
    if (!selectedParent) return undefined;
    const timer = setTimeout(() => loadHospitals(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParent?._id]);

  const selectParent = (parentId) => {
    const nextParent = parents.find((parent) => parent._id === parentId);
    setSelectedParentId(parentId);
    setLocationInput(nextParent?.location || "");
    setResolvedOrigin(null);
    setHospitals([]);
  };

  const openGoogleHospitals = () => {
    const locationText = locationInput.trim() || selectedParent?.location || "";
    if (locationText) window.open(buildNearbyHospitalsUrl(locationText), "_blank", "noopener,noreferrer");
  };

  const triggerHospitalDispatch = async () => {
    if (!dispatchHospital || !selectedParent) return;
    const parentLocationText = selectedParent.location || "the parent's current/saved location";
    const message = `Emergency SOS for ${selectedParent.name}. Please dispatch an ambulance to ${parentLocationText}. Parent phone: ${selectedParent.phone || "not available"}.`;
    try {
      await navigator.clipboard?.writeText(message);
    } catch {
      // Clipboard may be blocked; message remains visible.
    }
    setDispatchStatus(`SOS dispatch message prepared for ${dispatchHospital.name}.`);
    if (dispatchHospital.phone) window.location.href = `tel:${dispatchHospital.phone}`;
    else window.open(buildMapsUrl(dispatchHospital, parentLocationText), "_blank", "noopener,noreferrer");
  };

  const isFallback = !hospitals.length || hospitals.some(h => h.source === "Fallback");
  const displayHospitals = hospitals.length ? hospitals : [
    { id: "placeholder-1", name: "City Heart Multispecialty (Demo)", address: "Bengaluru", distanceKm: 0.8, emergency: "Emergency Care", rating: "4.9", phone: "", source: "Demo" },
    { id: "placeholder-2", name: "Apollo Medical Centre (Demo)", address: "Indiranagar", distanceKm: 2.3, emergency: "General Practice", rating: "4.5", phone: "", source: "Demo" },
    { id: "placeholder-3", name: "Cloudnine Hospitals (Demo)", address: "Jayanagar", distanceKm: 3.1, emergency: "Specialized Care", rating: "4.9", phone: "", source: "Demo" }
  ];

  return (
    <div className="app-layout">
      <Sidebar onSOSClick={() => setShowEmergency(true)} />
      <main className="main-content care-shell">
        <header className="topbar">
          <div>
            <button className="icon-btn" type="button" onClick={() => navigate(-1)} aria-label="Back">‹</button>
            <Link className="icon-btn" to="/" aria-label="Home">⌂</Link>
            <strong className="page-mini-title">Care Team</strong>
          </div>
          <span className="nearby-pill">{loadingHospitals ? "Searching nearby" : isFallback ? "Demo fallback data shown" : "Live hospitals found nearby"}</span>
        </header>

        <section className="care-controls">
          <label>
            <span>Care Recipient</span>
            <select value={selectedParent?._id || ""} onChange={(e) => selectParent(e.target.value)}>
              {parents.map((parent) => <option key={parent._id} value={parent._id}>{parent.name}</option>)}
            </select>
          </label>
          <label>
            <span>Current Location / Address</span>
            <input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="MG Road, Bangalore, KA" disabled={!selectedParent} />
          </label>
          <button className="btn btn-primary" type="button" onClick={openGoogleHospitals} disabled={!selectedParent || !locationInput.trim()}>Open Google Hospitals</button>
        </section>

        <section className="care-grid">
          <div className="hospital-list-wrap">
            <div className="section-row">
              <h1>Nearby Hospitals</h1>
              <div className="sort-pills"><button>Distance</button><button className="active">Rating</button></div>
            </div>
            <div className="hospital-list">
              {displayHospitals.map((hospital, index) => (
                <button className="hospital-card" key={hospital.id} onClick={() => setDispatchHospital(hospital)} type="button">
                  <div className="hospital-photo">{index + 1}</div>
                  <div>
                    <h2>{hospital.name}</h2>
                    <strong>{hospital.distanceKm?.toFixed ? hospital.distanceKm.toFixed(1) : hospital.distanceKm} km - {hospital.emergency || "Hospital Care"}</strong>
                    <span>{hospital.address || "Address available on map"}</span>
                    <small>Star {hospital.rating || "4.8"} / Open 24h</small>
                  </div>
                  <em>{hospital.source === "Fallback" || hospital.source === "Demo" || !hospitals.length ? "Demo Data" : "Live OSM"}</em>
                </button>
              ))}
            </div>
            {hospitalError && <p className="hospital-error">{hospitalError}</p>}
          </div>

          <aside className="care-side">
            <div className="map-card">
              <div className="map-tiles">
                {Array.from({ length: 36 }).map((_, index) => <span key={index} />)}
              </div>
              <button className="map-plus" type="button" onClick={() => loadHospitals()}>+</button>
              <button className="map-minus" type="button">-</button>
              <div className="eta-card">
                <span>AMB</span>
                <strong>12 mins (Traffic: Low)</strong>
                <small>{resolvedOrigin ? `${resolvedOrigin.label}` : "ETA to city center"}</small>
              </div>
            </div>
            <div className="emergency-team-card">
              <h3>Assigned Emergency Team</h3>
              <TeamMember initials="JD" name="Dr. Jayesh Das" role="Primary On-Call" />
              <TeamMember initials="RM" name="Ram Murthy" role="Ambulance Dispatch" />
            </div>
          </aside>
        </section>
      </main>

      {dispatchHospital && (
        <div className="modal-overlay">
          <div className="hospital-dispatch-modal modal-container">
            <div className="modal-header">
              <h2>{dispatchHospital.name}</h2>
              <button type="button" onClick={() => { setDispatchHospital(null); setDispatchStatus(""); }}>x</button>
            </div>
            <p>Trigger an SOS request asking this hospital to dispatch an ambulance to {selectedParent?.name}'s location?</p>
            <div className="dispatch-message">Emergency SOS for {selectedParent?.name}. Dispatch ambulance to {selectedParent?.location || "current/saved location"}.</div>
            {dispatchStatus && <div className="dispatch-status">{dispatchStatus}</div>}
            <div className="dispatch-actions">
              <button className="btn btn-outline" onClick={() => setDispatchHospital(null)} type="button">Cancel</button>
              <button className="btn btn-danger" onClick={triggerHospitalDispatch} type="button">Trigger SOS</button>
            </div>
          </div>
        </div>
      )}

      {showEmergency && (
        <EmergencyAlertModal
          onClose={() => setShowEmergency(false)}
          onCallChild={() => setShowEmergency(false)}
          childName={localStorage.getItem("userName") || "Caregiver"}
          childPhone={localStorage.getItem("childPhone") || "Phone not added"}
        />
      )}
    </div>
  );
}

function TeamMember({ initials, name, role }) {
  return (
    <div className="team-member">
      <span>{initials}</span>
      <div>
        <strong>{name}</strong>
        <small>{role}</small>
      </div>
      <a href="tel:+91108">Call</a>
    </div>
  );
}
