import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Stores every GPS ping from a vehicle tracker device.
 * Used for route history, geofencing (future), and analytics.
 */
const gpsLocationSchema = new Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    speed: {
      type: Number,
      default: 0,
      min: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
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
    collection: "gps_locations",
  }
);

gpsLocationSchema.index({ vehicleId: 1, timestamp: -1 });
gpsLocationSchema.index({ location: "2dsphere" });

gpsLocationSchema.pre("save", function setGeoPoint(next) {
  this.location = {
    type: "Point",
    coordinates: [this.longitude, this.latitude],
  };
  next();
});

const GpsLocation = mongoose.model("GpsLocation", gpsLocationSchema);

export default GpsLocation;
