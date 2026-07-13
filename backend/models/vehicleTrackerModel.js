import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Latest known position per vehicle — fast lookup for live map.
 * Updated on every POST /api/gps/update.
 */
const vehicleTrackerSchema = new Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timestamp: { type: Date, required: true },
    lastUpdated: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
  },
  {
    timestamps: true,
    collection: "vehicle_trackers",
  }
);

vehicleTrackerSchema.index({ location: "2dsphere" });
vehicleTrackerSchema.index({ isActive: 1, lastUpdated: -1 });

const VehicleTracker = mongoose.model("VehicleTracker", vehicleTrackerSchema);

export default VehicleTracker;
