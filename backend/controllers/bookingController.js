import mongoose from "mongoose";
import Booking from "../models/bookingModel.js";
import Car from "../models/carModel.js";
import User from "../models/userModel.js";
import { sendEmail } from "../utils/emailService.js";
import { sendWhatsAppMessage } from "../utils/whatsappService.js";

import path from "path";
import fs from "fs";

const CLIENT_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const WHATSAPP_CANCELLED_TEMPLATE = process.env.WHATSAPP_TEMPLATE_BOOKING_CANCELLED || "";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const BLOCKING_STATUSES = ["active", "upcoming"];

const tryParseJSON = (v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const buildCarSummary = (src = {}) => {
  const id = src._id?.toString?.() || src.id || null;

  return {
    id,
    make: src.make,
    model: src.model || "",
    year: src.year ? Number(src.year) : null,
    dailyRate: src.dailyRate ? Number(src.dailyRate) : 0,
    seats: src.seats ? Number(src.seats) : 4,
    transmission: src.transmission,
    fuelType: src.fuelType,
    mileage: src.mileage ? Number(src.mileage) : 0,
    image: src.image || src.carImage || "",
    // GPS system disabled
    // gpsEnabled: Boolean(src.gpsEnabled),
    // gpsVehicleId: String(src.gpsVehicleId || ""),
  };
};

const deleteLocalFileIfPresent = (filePath) => {
  if (!filePath) return;
  const filename = filePath.replace(/^\/uploads\//, "");
  const full = path.join(UPLOADS_DIR, filename);
  fs.unlink(full, (err) => {
    if (err) console.warn("Failed to delete file:", full, err);
  });
};

// CREATE BOOKING
export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let {
      customer,
      email,
      phone,
      car,
      pickupDate,
      returnDate,
      amount,
      details,
      address,
      carImage,
    } = req.body;

    if (!customer || !email || !car || !pickupDate || !returnDate) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Missing required fileds" });
    }

    const pickup = new Date(pickupDate);
    const ret = new Date(returnDate);

    if (
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(ret.getTime()) ||
      pickup > ret
    ) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Invalid pickup and return date" });
    }

    // Resolve car summary (accepts ObjectId string, object, or stringified JSON)
    let carSummary = null;
    if (typeof car === "string" && /^[0-9a-fA-F]{24}$/.test(car)) {
      const carDoc = await Car.findById(car).session(session).lean();
      if (!carDoc) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: "Car not found" });
      }
      carSummary = buildCarSummary(carDoc);
    } else {
      const parsed = tryParseJSON(car) || car;
      carSummary = buildCarSummary(parsed);
      if (!carSummary.id) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: "Invalid car payload" });
      }
      const carExists = await Car.exists({ _id: carSummary.id }).session(
        session,
      );
      if (!carExists) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: "Car not found" });
      }
    }

    const carId = carSummary.id;
    const overlappingCount = await Booking.countDocuments({
      "car.id": carId,
      status: { $in: BLOCKING_STATUSES },
      pickupDate: { $lte: ret },
      returnDate: { $gte: pickup },
    }).session(session);

    if (overlappingCount > 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(409)
        .json({ success: false, message: "Car already booked" });
    }

    const USD_TO_PKR = 279.50;
    const total = amount * USD_TO_PKR;
    const bookingData = {
      userId: req?.user?.id || req.user?._id || null, //for particular user
      customer,
      email,
      phone,
      car: carSummary,
      carImage: carImage || carSummary.image || "",
      pickupDate: pickup,
      returnDate: ret,
      amount: Number(total || 0),
      details: tryParseJSON(details),
      address: tryParseJSON(address),
      paymentStatus: "pending",
      status: "pending",
    };

    const createdArr = await Booking.create([bookingData], { session });
    const createdBooking = createdArr[0];

    await session.commitTransaction();
    session.endSession();
    const saved = await Booking.findById(createdBooking._id).lean();
    return res.status(201).json({
      success: true,
      booking: saved,
    });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    console.error("Create Booking Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

//GET FUNCTION
export const getBookings = async (req, res,) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 12, 100);
    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || "";
    const carFilter = req.query.car?.trim() || "";
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const query = {};
    if (search) {
      const q = { $regex: search, $options: "i" };
      query.$or = [
        { customer: q },
        { email: q },
        { "car.make": q },
        { "car.model": q },
      ];
    }

    if (status) query.status = status;
    if (carFilter) {
      if (/^[0-9a-fA-F]{24}$/.test(carFilter)) query["car.id"] = carFilter;
      else
        query.$or = [
          ...(query.$or || []),
          { "car.make": { $regex: carFilter, $options: "i" } },
          { "car.model": { $regex: carFilter, $options: "i" } },
        ];
    }

    if (from || to) {
      query.pickupDate = {};
      if (from) query.pickupDate.$gte = from;
      if (to) query.pickupDate.$lte = to;
    }

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .sort({ bookingDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      page,
      pages: Math.ceil(total / limit),
      total,
      data: bookings,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET BOOKING FOR A PARTICULAR USER
export const getMyBookings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.user._id;
    const bookings = await Booking.find({ userId })
      .sort({ bookingDate: -1 })
      .lean();

    res.json(bookings);
  } catch (err) {
    console.error(err);
  return res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE FUNCTION
export const updateBooking = async (req, res,) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const nextPickup =
      req.body.pickupDate !== undefined
        ? new Date(req.body.pickupDate)
        : new Date(booking.pickupDate);
    const nextReturn =
      req.body.returnDate !== undefined
        ? new Date(req.body.returnDate)
        : new Date(booking.returnDate);

    if (
      Number.isNaN(nextPickup.getTime()) ||
      Number.isNaN(nextReturn.getTime()) ||
      nextPickup > nextReturn
    ) {
      return res
        .status(400)
        .json({ message: "Invalid pickup and return date" });
    }

    let nextCarId = booking.car?.id;
    if (req.body.car !== undefined) {
      const parsedCar = tryParseJSON(req.body.car);
      const summary = buildCarSummary(parsedCar || {});
      if (summary.id) nextCarId = summary.id;
    }

    const nextStatus = String(req.body.status || booking.status || "");
    const shouldBlockAvailability =
      BLOCKING_STATUSES.includes(nextStatus) && booking.paymentStatus === "paid";

    if (nextCarId && shouldBlockAvailability) {
      const overlapCount = await Booking.countDocuments({
        _id: { $ne: booking._id },
        "car.id": nextCarId,
        status: { $in: BLOCKING_STATUSES },
        paymentStatus: "paid",
        pickupDate: { $lte: nextReturn },
        returnDate: { $gte: nextPickup },
      });

      if (overlapCount > 0) {
        return res
          .status(409)
          .json({ message: "Updated dates overlap with another booking" });
      }
    }

    //image handling
    if (req.file) {
      if (booking.carImage && booking.carImage.startsWith("/uploads/"))
        deleteLocalFileIfPresent(booking.carImage);
      booking.carImage = `/uploads/${req.file.filename}`;
    } else if (req.body.carImage !== undefined) {
      if (
        req.body.carImage &&
        !String(req.body.carImage).startsWith("/uploads/") &&
        booking.carImage &&
        booking.carImage.startsWith("/uploads/")
      ) {
        deleteLocalFileIfPresent(booking.carImage);
      }
      booking.carImage = req.body.carImage || booking.carImage;
    }

    const updatable = [
      "customer",
      "email",
      "phone",
      "car",
      "pickupDate",
      "returnDate",
      "bookingDate",
      "status",
      "amount",
      "details",
      "address",
    ];
    for (const f of updatable) {
      if (req.body[f] === undefined) continue;
      if (["pickupDate", "returnDate", "bookingDate"].includes(f))
        booking[f] = new Date(req.body[f]);
      else if (f === "amount") booking[f] = Number(req.body[f]);
      else if (f === "details" || f === "address")
        booking[f] = tryParseJSON(req.body[f]);
      else if (f === "car") {
        const c = tryParseJSON(req.body.car);
        if (c) {
          const summary = buildCarSummary(c);
          if (!summary.id && booking.car?.id) summary.id = booking.car.id;
          booking.car = summary;
        }
      } else booking[f] = req.body[f];
    }

    const updated = await booking.save();
    res.json(updated);
  } catch (err) {
    console.error(err);
  return res.status(500).json({ success: false, message: err.message });
  }
};

async function sendCancellationNotifications(booking) {
  try {
    let userEmail = booking.email;
    let userPhone = booking.phone;
    let user = null;
    if (booking.userId) {
      user = await User.findById(booking.userId).lean();
    }

    if (!userEmail && user?.email) {
      userEmail = user.email;
    }
    if (!userPhone && user?.phone) {
      userPhone = user.phone;
    }

    const carName = booking.car
      ? `${booking.car.make} ${booking.car.model}`
      : "your car";

    const pickupDate = booking.pickupDate
      ? new Date(booking.pickupDate).toDateString()
      : "N/A";
    const returnDate = booking.returnDate
      ? new Date(booking.returnDate).toDateString()
      : "N/A";

    const subject = "Booking Cancelled";
    const bookingPageLink = `${CLIENT_URL}/bookings`;

    const html = `
            <h3>Dear ${booking.customer},</h3>
            <p>Your booking for <strong>${carName}</strong> has been cancelled.</p>
            <p><strong>Booking ID:</strong> ${booking._id.toString()}</p>
            <p><strong>Pickup Date:</strong> ${pickupDate}</p>
            <p><strong>Return Date:</strong> ${returnDate}</p>

            <p style="margin: 24px 0;">
              <a href="${bookingPageLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 20px;background:#374151;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View My Bookings</a>
            </p>

            <p>If you have any questions, feel free to contact us.</p>
          `;

    if (userEmail) {
      console.log(
        "Sending cancellation email for booking",
        booking._id.toString(),
        "to",
        userEmail,
      );

      sendEmail(
        userEmail,
        subject,
        "Your booking has been cancelled.",
        html,
      );
    }

    await sendWhatsAppMessage(
      userPhone,
      [
        `Hi ${booking.customer},`,
        `Your booking for ${carName} has been cancelled.`,
        `Booking ID: ${booking._id.toString()}`,
        `Pickup Date: ${pickupDate}`,
        `Return Date: ${returnDate}`,
        `More details: ${bookingPageLink}`,
      ].join("\n"),
      {
        templateName: WHATSAPP_CANCELLED_TEMPLATE,
        templateParameters: [
          booking.customer,
          carName,
          booking._id.toString(),
          pickupDate,
          returnDate,
          bookingPageLink,
        ],
      },
    );

    if (!userEmail && !userPhone) {
      console.warn(
        "Cancellation notification not sent: no email or phone found for booking",
        booking._id.toString(),
      );
    }
  } catch (emailErr) {
    console.error("Failed to send cancellation email:", emailErr);
  }
}

// UPDATE STATUS OF BOOKING ORDER (admin)
export const updateBookingStatus = async (req, res,) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = status;
    const updated = await booking.save();

    if (status === "cancelled") {
      await sendCancellationNotifications(updated);
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
  return res.status(500).json({ success: false, message: err.message });
  }
};

// Customer: cancel own booking (same notifications, no admin role)
export const updateMyBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });
    if (status !== "cancelled") {
      return res.status(400).json({
        message: "Only cancellation is allowed from your account",
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.userId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this booking",
      });
    }

    booking.status = status;
    const updated = await booking.save();

    if (status === "cancelled") {
      await sendCancellationNotifications(updated);
    }

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE FUNCTION
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.carImage && booking.carImage.startsWith("/uploads/"))
      deleteLocalFileIfPresent(booking.carImage);

    await booking.remove();
    res.json({ message: "Booking delted successfully" });
  } catch (err) {
    console.error(err);
  return res.status(500).json({ success: false, message: err.message });
  }
};
