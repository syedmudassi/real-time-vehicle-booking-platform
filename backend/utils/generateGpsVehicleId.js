import crypto from "crypto";

/**
 * Generates a unique tracker ID for Android GPS devices.
 * Format: TRK-XXXXXXXX (8 hex chars)
 */
export const generateGpsVehicleId = () => {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `TRK-${suffix}`;
};
