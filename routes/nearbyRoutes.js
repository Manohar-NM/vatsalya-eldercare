const express = require("express");

const router = express.Router();

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_ORIGIN = {
  lat: 12.9716,
  lon: 77.5946,
  label: "Bengaluru demo fallback"
};

const fallbackHospitals = [
  {
    id: "fallback-manipal-old-airport",
    name: "Manipal Hospital Old Airport Road",
    lat: 12.9606,
    lon: 77.6486,
    address: "Old Airport Road, Bengaluru",
    phone: "",
    emergency: "Emergency care",
    source: "Fallback"
  },
  {
    id: "fallback-st-philomenas",
    name: "St. Philomena's Hospital",
    lat: 12.9663,
    lon: 77.6033,
    address: "Mother Teresa Road, Bengaluru",
    phone: "",
    emergency: "Hospital care",
    source: "Fallback"
  },
  {
    id: "fallback-aster-cmi",
    name: "Aster CMI Hospital",
    lat: 13.0544,
    lon: 77.5931,
    address: "Hebbal, Bengaluru",
    phone: "",
    emergency: "Emergency care",
    source: "Fallback"
  },
  {
    id: "fallback-fortis-bannerghatta",
    name: "Fortis Hospital Bannerghatta Road",
    lat: 12.8952,
    lon: 77.5992,
    address: "Bannerghatta Road, Bengaluru",
    phone: "",
    emergency: "Emergency care",
    source: "Fallback"
  }
];

router.get("/hospitals", async (req, res) => {
  try {
    const origin = await resolveOrigin(req.query);
    const hospitals = await fetchNearbyHospitals(origin);

    if (hospitals.length) {
      return res.json({
        origin,
        fallback: false,
        hospitals
      });
    }

    return res.json({
      origin,
      fallback: true,
      message: "No OpenStreetMap hospitals were found nearby, so demo fallback hospitals are shown.",
      hospitals: getFallbackHospitals(origin)
    });
  } catch (error) {
    console.error("Nearby hospitals lookup failed:", error.message);
    const origin = parseCoordinates(req.query) || DEFAULT_ORIGIN;
    return res.json({
      origin,
      fallback: true,
      message: "Live hospital lookup is temporarily unavailable, so demo fallback hospitals are shown.",
      hospitals: getFallbackHospitals(origin)
    });
  }
});

async function fetchNearbyHospitals(origin) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:10000,${origin.lat},${origin.lon});
      way["amenity"="hospital"](around:10000,${origin.lat},${origin.lon});
      relation["amenity"="hospital"](around:10000,${origin.lat},${origin.lon});
      node["healthcare"="hospital"](around:10000,${origin.lat},${origin.lon});
      way["healthcare"="hospital"](around:10000,${origin.lat},${origin.lon});
      relation["healthcare"="hospital"](around:10000,${origin.lat},${origin.lon});
    );
    out center tags 30;
  `;

  const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": "Vatsalya-Eldercare/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`OpenStreetMap returned ${response.status}`);
  }

  const data = await response.json();
  return (data.elements || [])
    .map((item) => mapHospital(item, origin))
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function mapHospital(item, origin) {
  const tags = item.tags || {};
  const lat = Number(item.lat || item.center?.lat);
  const lon = Number(item.lon || item.center?.lon);

  if (!lat || !lon || !tags.name) return null;

  return {
    id: `${item.type}-${item.id}`,
    name: tags.name,
    phone: tags.phone || tags["contact:phone"] || "",
    emergency: tags.emergency || tags.emergency_service || "Hospital care",
    address: [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:city"] || tags["addr:town"] || tags["addr:suburb"]
    ].filter(Boolean).join(", "),
    lat,
    lon,
    distanceKm: getDistanceKm(origin.lat, origin.lon, lat, lon),
    source: "OpenStreetMap"
  };
}

async function resolveOrigin(query) {
  const coordinates = parseCoordinates(query);
  if (coordinates) return coordinates;

  if (query.location) {
    const geocoded = await geocodeLocation(query.location);
    if (geocoded) return geocoded;
  }

  return DEFAULT_ORIGIN;
}

function parseCoordinates(query) {
  const lat = Number(query.lat);
  const lon = Number(query.lon || query.lng);

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return {
      lat,
      lon,
      label: query.label || "selected parent location"
    };
  }

  return null;
}

async function geocodeLocation(locationText) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationText)}`,
    {
      headers: {
        "User-Agent": "Vatsalya-Eldercare/1.0"
      }
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (!data.length) return null;

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    label: locationText
  };
}

function getFallbackHospitals(origin) {
  return fallbackHospitals
    .map((hospital) => ({
      ...hospital,
      distanceKm: getDistanceKm(origin.lat, origin.lon, hospital.lat, hospital.lon)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return Number((earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

module.exports = router;
