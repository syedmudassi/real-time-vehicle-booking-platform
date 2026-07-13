import { api } from "../api";

/** GET /api/gps/active — all vehicles with recent GPS pings */
export const fetchActiveVehicles = async () => {
  const res = await api.get("/api/gps/active");
  return res.data;
};

/** GET /api/gps/latest/:vehicleId */
export const fetchLatestLocation = async (vehicleId) => {
  const res = await api.get(`/api/gps/latest/${encodeURIComponent(vehicleId)}`);
  return res.data;
};

/** GET /api/gps/history/:vehicleId */
export const fetchLocationHistory = async (vehicleId, params = {}) => {
  const res = await api.get(
    `/api/gps/history/${encodeURIComponent(vehicleId)}`,
    { params }
  );
  return res.data;
};
