/**
 * Socket.IO helpers for real-time GPS broadcasting.
 * Event name: locationUpdate (admin dashboard listens for this).
 */

let ioInstance = null;

export const setGpsIoInstance = (io) => {
  ioInstance = io;
};

const formatPayload = (data) => ({
  vehicleId: data.vehicleId,
  vehicleName: data.vehicleName || "",
  latitude: data.latitude,
  longitude: data.longitude,
  speed: data.speed ?? 0,
  accuracy: data.accuracy ?? 0,
  timestamp: data.timestamp,
  lastUpdated: data.lastUpdated || data.timestamp,
  isActive: data.isActive !== false,
});

/** Emit when new GPS data arrives from Android tracker */
export const emitLocationUpdate = (locationData) => {
  if (!ioInstance || !locationData) return;

  const payload = formatPayload(locationData);

  ioInstance.to("admins").emit("locationUpdate", payload);
  ioInstance
    .to(`gps:vehicle:${payload.vehicleId}`)
    .emit("locationUpdate", payload);
};

/** Send fleet snapshot when admin connects */
export const emitActiveFleetSnapshot = (socketId, vehicles) => {
  if (!ioInstance || !socketId) return;

  ioInstance.to(socketId).emit("activeFleetSnapshot", {
    vehicles: (vehicles || []).map(formatPayload),
    count: vehicles?.length || 0,
    serverTime: new Date().toISOString(),
  });
};

// Backward-compatible aliases (older admin builds)
export const emitGpsLocationUpdate = emitLocationUpdate;
export const emitGpsFleetSnapshot = emitActiveFleetSnapshot;
