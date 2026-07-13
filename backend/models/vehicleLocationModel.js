import mongoose from "mongoose";

const { Schema } = mongoose;

const vehicleLocationSchema = new Schema(
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
  },
  {
    timestamps: true,
    collection: "vehicle_locations",
  }
);

vehicleLocationSchema.index({ vehicleId: 1, timestamp: -1 });

const VehicleLocation =
  mongoose.models.VehicleLocation ||
  mongoose.model("VehicleLocation", vehicleLocationSchema);

export default VehicleLocation;
