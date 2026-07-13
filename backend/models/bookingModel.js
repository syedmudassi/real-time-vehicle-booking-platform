import mongoose from "mongoose";
import Car from "./carModel.js";

const { Schema } = mongoose;

const addressSchema = new Schema(
  { street: String, city: String, state: String, zipCode: String },
  { _id: false, default: {} },
);

const carSummarySchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, ref: "Car", required: true }, // coming from car model
    make: { type: String, default: "" },
    model: { type: String, default: "" },
    year: Number,
    dailyRate: { type: Number, default: 0 },
    category: { type: String, default: "Sedan" },
    seats: { type: Number, default: 4 },
    transmission: { type: String, default: "" },
    fuelType: { type: String, default: "" },
    mileage: { type: Number, default: 0 },
    image: { type: String, default: "" },
    gpsEnabled: { type: Boolean, default: false },
    gpsVehicleId: { type: String, default: "" },
  },
  { _id: false },
); // car details

const bookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // coming from user
    customer: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    car: { type: carSummarySchema, required: true },
    carImage: { type: String, default: "" },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    bookingDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled", "upcoming"],
      default: "pending",
    },
    amountPKR: { type: Number, required: true },
    amountUSD: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["Credit Card", "Paypal"],
      default: "Credit Card",
    },
    sessionId: String,
    paymentIntentId: String,
    paymentDetails: { type: Schema.Types.Mixed, default: {} },
    details: { type: Schema.Types.Mixed, default: {} },
    address: { type: addressSchema, default: () => ({}) },
    stripeSession: { type: Schema.Types.Mixed, default: {} },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true },
); // customer details and shipping address

bookingSchema.pre("validate", async function () {
  if (!this.car?.id) return;

  const { make, model, dailyRate } = this.car;
  if (make || model || dailyRate) return;

  try {
    const carDoc = await Car.findById(this.car.id).lean();
    if (carDoc) {
      Object.assign(this.car, {
        make: carDoc.make ?? this.car.make,
        model: carDoc.model ?? this.car.model,
        year: carDoc.year ?? this.car.year,
        dailyRate: carDoc.dailyRate ?? this.car.dailyRate,
        seats: carDoc.seats ?? this.car.seats,
        transmission: carDoc.transmission ?? this.car.transmission,
        fuelType: carDoc.fuelType ?? this.car.fuelType,
        mileage: carDoc.mileage ?? this.car.mileage,
        image: carDoc.image ?? this.car.image,
        gpsEnabled: Boolean(carDoc.gpsEnabled),
        gpsVehicleId: String(carDoc.gpsVehicleId || ""),
      });
      if (!this.carImage) this.carImage = carDoc.image || "";
    }
  } catch (err) {
    console.error(err);
  }
});

const blockingStatuses = ["active", "upcoming"];

bookingSchema.post("save", async function (doc, next) {
  try {
    // If a temporary _skipSync flag is present, it means the sync is being
    // handled explicitly in a controller (likely within a transaction).
    // So, we skip the hook's logic to prevent duplicate operations.
    if (doc._skipSync) {
      return next();
    }

    if (!doc.car?.id) return;

    const carId = doc.car.id;
    const bookingEntry = {
      bookingId: doc._id,
      pickupDate: doc.pickupDate,
      returnDate: doc.returnDate,
      status: doc.status,
      paymentStatus: doc.paymentStatus || "pending",
    };

    // Always remove any existing entry for this booking to avoid duplicates.
    await Car.updateOne(
      { _id: carId },
      { $pull: { bookings: { bookingId: doc._id } } }
    );

    if (blockingStatuses.includes(doc.status) && doc.paymentStatus === "paid") {
      // If the booking is confirmed (paid) and should block availability, add it.
      await Car.updateOne(
        { _id: carId },
        {
          $push: { bookings: bookingEntry }
        }
      );
    }
    // If status is 'completed' or 'cancelled', the pull operation is sufficient.
  } catch (err) {
    console.error("Booking post-save hook error:", err);
  } finally {
    next();
  }
});

bookingSchema.post("remove", async function (doc) {
  try {
    if (!doc.car?.id) return;
    await Car.findByIdAndUpdate(doc.car.id, {
      $pull: { bookings: { bookingId: doc._id } },
    }).exec();
  } catch (err) {
    console.error(err);
  }
});

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
