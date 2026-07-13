import VehicleLocation from "../models/vehicleLocationModel.js";

export const updateLocation = async (req, res) => {
  try {
    const { vehicleId, latitude, longitude, speed, accuracy, timestamp } =
      req.body;

    if (
      !vehicleId ||
      latitude == null ||
      longitude == null ||
      timestamp == null
    ) {
      return res.status(400).json({
        success: false,
        message: "vehicleId, latitude, longitude, and timestamp are required.",
      });
    }

    const parsedTimestamp = new Date(timestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      return res.status(400).json({
        success: false,
        message: "timestamp must be a valid date.",
      });
    }

    const location = await VehicleLocation.create({
      vehicleId: String(vehicleId).trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed: speed != null ? Number(speed) : 0,
      accuracy: accuracy != null ? Number(accuracy) : 0,
      timestamp: parsedTimestamp,
    });

    return res.status(201).json({
      success: true,
      message: "Location updated.",
      data: location,
    });
  } catch (error) {
    console.error("updateLocation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update location.",
    });
  }
};

export const getLatestLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const latest = await VehicleLocation.findOne({
      vehicleId: String(vehicleId).trim(),
    })
      .sort({ timestamp: -1 })
      .lean();

    if (!latest) {
      return res.status(404).json({
        success: false,
        message: "No location found for this vehicle.",
      });
    }

    return res.status(200).json({
      success: true,
      data: latest,
    });
  } catch (error) {
    console.error("getLatestLocation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest location.",
    });
  }
};

export const getLocationHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);

    const filter = { vehicleId: String(vehicleId).trim() };

    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (!Number.isNaN(fromDate.getTime())) {
        filter.timestamp = { ...filter.timestamp, $gte: fromDate };
      }
    }

    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (!Number.isNaN(toDate.getTime())) {
        filter.timestamp = { ...filter.timestamp, $lte: toDate };
      }
    }

    const history = await VehicleLocation.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      vehicleId: filter.vehicleId,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("getLocationHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch location history.",
    });
  }
};
