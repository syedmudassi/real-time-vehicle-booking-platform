import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createGpsSocket } from "../socket/gpsSocket";
import { fetchActiveVehicles } from "../services/gpsApi";
import { MapPin, Navigation, RefreshCw } from "lucide-react";

// Fix default marker icons broken by bundlers (Vite/Webpack)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const vehicleIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: "vehicle-gps-marker",
});

const formatSpeed = (speed) => `${Number(speed || 0).toFixed(1)} km/h`;

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

/** Keeps map centred when a vehicle is selected */
const MapFocus = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
};

const LiveTracking = () => {
  const location = useLocation();
  const [vehicles, setVehicles] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);

  const vehicleList = useMemo(
    () => Object.values(vehicles).sort((a, b) => a.vehicleId.localeCompare(b.vehicleId)),
    [vehicles]
  );

  const upsertVehicle = useCallback((payload) => {
    if (!payload?.vehicleId) return;
    setVehicles((prev) => ({
      ...prev,
      [payload.vehicleId]: {
        ...prev[payload.vehicleId],
        ...payload,
      },
    }));
  }, []);

  const loadInitialFleet = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchActiveVehicles();
      const map = {};
      (res?.data || []).forEach((v) => {
        map[v.vehicleId] = v;
      });
      setVehicles(map);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load active vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialFleet();

    const socket = createGpsSocket();
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    const applyFleet = (payload) => {
      const map = {};
      (payload?.vehicles || []).forEach((v) => {
        map[v.vehicleId] = v;
      });
      setVehicles((prev) => ({ ...prev, ...map }));
    };

    socket.on("activeFleetSnapshot", applyFleet);
    socket.on("locationUpdate", (payload) => upsertVehicle(payload));

    // Backward compatibility with older event names
    socket.on("gps:fleet-snapshot", applyFleet);
    socket.on("gps:location-update", (payload) => upsertVehicle(payload));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadInitialFleet, upsertVehicle]);

  // Auto-select vehicle if URL contains ?vehicleId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const vehicleId = String(params.get("vehicleId") || "").trim();
    if (vehicleId) {
      setSelectedId(vehicleId);
    }
  }, [location.search]);

  const selectedVehicle = selectedId ? vehicles[selectedId] : null;

  const mapCenter = useMemo(() => {
    if (selectedVehicle) {
      return [selectedVehicle.latitude, selectedVehicle.longitude];
    }
    if (vehicleList.length > 0) {
      return [vehicleList[0].latitude, vehicleList[0].longitude];
    }
    return [31.5204, 74.3587]; // Default: Lahore, PK
  }, [selectedVehicle, vehicleList]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Vehicle Tracking</h1>
            <p className="mt-1 text-sm text-slate-600">
              Real-time GPS positions from Android tracker devices
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                connected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {connected ? "Live" : "Disconnected"}
            </span>
            <button
              type="button"
              onClick={loadInitialFleet}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-500"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Vehicle list sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Navigation className="h-4 w-4 text-orange-600" />
              Active Vehicles ({vehicleList.length})
            </h2>

            {loading ? (
              <p className="text-sm text-slate-500">Loading fleet...</p>
            ) : vehicleList.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active vehicles. Start the Android GPS tracker app in a vehicle.
              </p>
            ) : (
              <ul className="max-h-[520px] space-y-2 overflow-y-auto">
                {vehicleList.map((v) => (
                  <li key={v.vehicleId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(v.vehicleId)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        selectedId === v.vehicleId
                          ? "border-orange-300 bg-orange-50"
                          : "border-slate-200 hover:border-orange-200 hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">
                        {v.vehicleName || v.vehicleId}
                      </p>
                      {v.vehicleName ? (
                        <p className="text-xs text-slate-500">{v.vehicleId}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-600">
                        Speed: {formatSpeed(v.speed)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Updated: {formatTime(v.lastUpdated || v.timestamp)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Map */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-[560px] w-full">
              <MapContainer
                center={mapCenter}
                zoom={13}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapFocus
                  center={selectedVehicle ? mapCenter : null}
                  zoom={15}
                />
                {vehicleList.map((v) => (
                  <Marker
                    key={v.vehicleId}
                    position={[v.latitude, v.longitude]}
                    icon={vehicleIcon}
                    eventHandlers={{
                      click: () => setSelectedId(v.vehicleId),
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <p className="font-bold">{v.vehicleName || v.vehicleId}</p>
                        {v.vehicleName ? (
                          <p className="text-xs text-slate-500">ID: {v.vehicleId}</p>
                        ) : null}
                        <p>Speed: {formatSpeed(v.speed)}</p>
                        <p>Accuracy: {Number(v.accuracy || 0).toFixed(0)} m</p>
                        <p>Last update: {formatTime(v.lastUpdated || v.timestamp)}</p>
                        <p className="text-xs text-slate-500">
                          {v.latitude.toFixed(6)}, {v.longitude.toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {selectedVehicle && (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    {selectedVehicle.vehicleName || selectedVehicle.vehicleId}
                  </span>
                  {selectedVehicle.vehicleName ? (
                    <span className="text-slate-500">({selectedVehicle.vehicleId})</span>
                  ) : null}
                  <span>Speed: {formatSpeed(selectedVehicle.speed)}</span>
                  <span>
                    Last updated: {formatTime(selectedVehicle.lastUpdated || selectedVehicle.timestamp)}
                  </span>
                  <span>
                    Coords: {selectedVehicle.latitude.toFixed(6)},{" "}
                    {selectedVehicle.longitude.toFixed(6)}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
