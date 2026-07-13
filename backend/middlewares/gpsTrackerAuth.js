/**
 * Authenticates GPS tracker devices (Android phones) via API key header.
 * In development, requests are allowed when GPS_TRACKER_API_KEY is not set.
 */

export const gpsTrackerAuth = (req, res, next) => {
  const configuredKey = String(process.env.GPS_TRACKER_API_KEY || "").trim();

  // Dev convenience: skip key check when not configured
  if (!configuredKey) {
    return next();
  }

  const providedKey = String(
    req.headers["x-gps-api-key"] || req.headers["x-api-key"] || ""
  ).trim();

  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      message: "Invalid or missing GPS tracker API key",
    });
  }

  next();
};
