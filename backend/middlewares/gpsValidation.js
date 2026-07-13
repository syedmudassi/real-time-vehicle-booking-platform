/**
 * Validates incoming GPS payload from Android tracker devices.
 */

const isValidNumber = (value, min, max) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max;
};

export const validateGpsUpdate = (req, res, next) => {
  const { vehicleId, latitude, longitude, speed, accuracy, timestamp } =
    req.body || {};

  const errors = [];

  if (!vehicleId || typeof vehicleId !== "string" || !vehicleId.trim()) {
    errors.push("vehicleId is required and must be a non-empty string");
  }

  if (!isValidNumber(latitude, -90, 90)) {
    errors.push("latitude must be a number between -90 and 90");
  }

  if (!isValidNumber(longitude, -180, 180)) {
    errors.push("longitude must be a number between -180 and 180");
  }

  if (speed !== undefined && speed !== null && !isValidNumber(speed, 0, 500)) {
    errors.push("speed must be a number between 0 and 500 (km/h)");
  }

  if (
    accuracy !== undefined &&
    accuracy !== null &&
    !isValidNumber(accuracy, 0, 10000)
  ) {
    errors.push("accuracy must be a number between 0 and 10000 (meters)");
  }

  if (!timestamp) {
    errors.push("timestamp is required");
  } else {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("timestamp must be a valid ISO date string or Unix ms");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "GPS validation failed",
      errors,
    });
  }

  // Normalise types for the controller
  req.validatedGps = {
    vehicleId: vehicleId.trim(),
    latitude: Number(latitude),
    longitude: Number(longitude),
    speed: speed != null ? Number(speed) : 0,
    accuracy: accuracy != null ? Number(accuracy) : 0,
    timestamp: new Date(timestamp),
  };

  next();
};
