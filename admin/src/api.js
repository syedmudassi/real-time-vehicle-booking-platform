import axios from "axios";

/** Origin only (no trailing slash) so paths like `/api/...` resolve correctly. */
export const API_ORIGIN = String(
  import.meta.env.VITE_API_URL || "http://localhost:5000",
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_ORIGIN,
  headers: { Accept: "application/json" },
});

export const getAdminToken = () => localStorage.getItem("adminToken") || "";

export const clearAdminAuth = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
};

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});