import Booking from "../models/bookingModel.js";
import Car from "../models/carModel.js";
import User from "../models/userModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { sendEmail } from "../utils/emailService.js";
import { sendWhatsAppMessage } from "../utils/whatsappService.js";

dotenv.config();

const CLIENT_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const STRIPE_API_VERSION = "2022-11-15";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key missing in env");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  });
};
//GET STRAP FROM .ENV

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const WHATSAPP_TEMPLATES = {
  pending: process.env.WHATSAPP_TEMPLATE_BOOKING_PENDING || "",
  confirmed: process.env.WHATSAPP_TEMPLATE_BOOKING_CONFIRMED || "",
  extended: process.env.WHATSAPP_TEMPLATE_BOOKING_EXTENDED || "",
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const calculateInclusiveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

const buildBookingWhatsappMessage = ({
  customer,
  intro,
  bookingId,
  pickupDate,
  returnDate,
  actionUrl,
  extraLines = [],
}) => {
  return [
    `Hi ${customer || "there"},`,
    intro,
    `Booking ID: ${bookingId}`,
    pickupDate ? `Pickup Date: ${new Date(pickupDate).toDateString()}` : null,
    returnDate ? `Return Date: ${new Date(returnDate).toDateString()}` : null,
    ...extraLines,
    actionUrl ? `More details: ${actionUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

export const createCheckoutSession = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Missing Request Body",
      });
    }

    const {
      userId,
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

    // =============================
    // BASIC VALIDATION
    // =============================

    if (!email)
      return res.status(400).json({
        success: false,
        message: "Email required",
      });

    if (!pickupDate || !returnDate)
      return res.status(400).json({
        success: false,
        message: "pickupDate and returnDate required",
      });

    const pd = new Date(pickupDate);
    const rd = new Date(returnDate);

    if (Number.isNaN(pd.getTime()) || Number.isNaN(rd.getTime()))
      return res.status(400).json({
        success: false,
        message: "Invalid dates",
      });

    if (rd < pd)
      return res.status(400).json({
        success: false,
        message: "returnDate must be same or after pickupDate",
      });

    // =============================
    // CAR VALIDATION
    // =============================

    let carField = car;

    if (typeof car === "string") {
      try {
        carField = JSON.parse(car);
      } catch {
        carField = {};
      }
    }

    if (!mongoose.Types.ObjectId.isValid(carField?.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid car ID",
      });
    }

    const carDoc = await Car.findById(carField.id).lean();
    if (!carDoc) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    const rentalDays = calculateInclusiveDays(pd, rd);
    if (rentalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking date range",
      });
    }

    const dailyRate = Number(carDoc.dailyRate ?? carField?.dailyRate ?? 0);
    if (!dailyRate || Number.isNaN(dailyRate) || dailyRate <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid car daily rate",
      });
    }

    // =============================
    // CURRENCY LOGIC
    // =============================

    const amountPKR = Number((dailyRate * rentalDays).toFixed(2));
    const clientAmountPKR = Number(amount);

    if (
      !Number.isNaN(clientAmountPKR) &&
      clientAmountPKR > 0 &&
      Math.abs(clientAmountPKR - amountPKR) >= 1
    ) {
      console.warn("Client amount mismatch; using server-calculated amount", {
        clientAmountPKR,
        amountPKR,
        rentalDays,
        dailyRate,
        carId: carDoc._id.toString(),
      });
    }

    // Fixed conversion rate (example)
    const PKR_TO_USD = 0.0036;

    const amountUSD = Number((amountPKR * PKR_TO_USD).toFixed(2));

    const stripeAmount = Math.round(amountUSD * 100); // cents

    // =============================
    // CREATE BOOKING (STORE BOTH)
    // =============================

    const booking = await Booking.create({
      userId,
      customer: String(customer ?? ""),
      email: String(email ?? ""),
      phone: String(phone ?? ""),
      car: carField,
      carImage: String(carImage ?? ""),
      pickupDate: pd,
      returnDate: rd,
      amountPKR: amountPKR,
      amountUSD: amountUSD,
      paymentStatus: "pending",
      details:
        typeof details === "string" ? JSON.parse(details) : details || {},
      address:
        typeof address === "string" ? JSON.parse(address) : address || {},
      status: "pending",
    });

    // =============================
    // STRIPE INIT
    // =============================

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      await Booking.findByIdAndDelete(booking._id).catch(() => {});
      return res.status(500).json({
        success: false,
        message: "Stripe not configured",
        error: err.message,
      });
    }

    let session;

    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email || undefined,
        line_items: [
          {
            price_data: {
              currency: "usd", // 👈 STRIPE USES USD
              product_data: {
                name:
                  carField?.name ||
                  `${carField?.make ?? ""} ${carField?.model ?? ""}` ||
                  "Car Rental",
                description: `Rental ${pickupDate} → ${returnDate}`,
              },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          },
        ],
        success_url: `${CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${CLIENT_URL}/cancel`,
        metadata: {
          bookingId: booking._id.toString(),
          userId: String(userId ?? ""),
          carId: String(carField?.id ?? ""),
        },
      });
    } catch (stripeErr) {
      await Booking.findByIdAndDelete(booking._id).catch(() => {});
      return res.status(500).json({
        success: false,
        message: "Failed to create Stripe session",
        error: stripeErr.message,
      });
    }

    // Save Stripe info
    booking.sessionId = session.id;
    booking.stripeSession = {
      id: session.id,
      url: session.url || null,
    };

    await booking.save();

    // SEND EMAIL: Payment Pending
    try {
      const carName = booking.car ? `${booking.car.make} ${booking.car.model}` : "your car";
      const pendingSubject = "Booking Pending: Payment Not Completed";
      const pendingHtml = `
        <h3>Dear ${booking.customer},</h3>
        <p>Your booking for <strong>${carName}</strong> is currently pending because payment was not completed.</p>
        <p><strong>Booking ID:</strong> ${booking._id.toString()}</p>
        <p><strong>Pickup Date:</strong> ${new Date(booking.pickupDate).toDateString()}</p>
        <p><strong>Return Date:</strong> ${new Date(booking.returnDate).toDateString()}</p>
        <p>To complete your booking, please follow this link:</p>
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
          <tr>
            <td align="center" bgcolor="#f97316" role="presentation" style="border:none;border-radius:5px;cursor:auto;mso-padding-alt:10px 20px;background:#f97316;" valign="middle">
              <a href="${session.url}" style="display:inline-block;background:#f97316;color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:normal;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:10px 20px;mso-padding-alt:0px;border-radius:5px;" target="_blank">
                Complete Payment
              </a>
            </td>
          </tr>
        </table>
        <p>If you did not initiate this booking, please ignore this email.</p>
      `;
      sendEmail(booking.email, pendingSubject, "Your booking is pending.", pendingHtml);

      await sendWhatsAppMessage(
        booking.phone,
        buildBookingWhatsappMessage({
          customer: booking.customer,
          intro: `Your booking for ${carName} is pending because payment has not been completed yet.`,
          bookingId: booking._id.toString(),
          pickupDate: booking.pickupDate,
          returnDate: booking.returnDate,
          actionUrl: session.url,
        }),
        {
          templateName: WHATSAPP_TEMPLATES.pending,
          templateParameters: [
            booking.customer,
            carName,
            booking._id.toString(),
            new Date(booking.pickupDate).toDateString(),
            new Date(booking.returnDate).toDateString(),
            session.url,
          ],
        },
      );

    } catch (emailErr) {
      console.error("Failed to send pending booking email:", emailErr);
    }

    return res.json({
      success: true,
      url: session.url,
      bookingId: booking._id,
    });
  } catch (err) {
    console.error("CheckoutSession Error", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server Error",
    });
  }
};

//EXTEND SESSION CHECKOUT
export const createExtendSession = async (req, res) => {
  try {
    const { bookingId, newReturnDate } = req.body;

    console.log("Extend Session Request:", { bookingId, newReturnDate });

    if (!bookingId || !newReturnDate) {
      return res.status(400).json({ message: "Missing bookingId or newReturnDate" });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      console.error("Booking not found:", bookingId);
      return res.status(404).json({ message: "Booking not found" });
    }

    const oldReturn = new Date(booking.returnDate);
    const newReturn = new Date(newReturnDate);

    if (Number.isNaN(newReturn.getTime())) {
      console.error("Invalid New Return Date:", newReturnDate);
      return res.status(400).json({ message: "Invalid new return date format" });
    }

    if (newReturn <= oldReturn) {
      console.error("Date validation failed:", { newReturn, oldReturn });
      return res.status(400).json({
        message: "New return date must be after current return date",
      });
    }

    if (!booking.car || !booking.car.dailyRate) {
      console.error("Car details missing in booking:", booking);
      return res.status(400).json({ message: "Car details or daily rate missing in booking" });
    }

    const extraDays = Math.ceil(
      (newReturn - oldReturn) / (1000 * 60 * 60 * 24),
    );

    let pricePerDay = Number(booking.car.dailyRate) || 0;

    // Fetch current car details to use updated daily rate if available
    const carId = booking.car.id || booking.car._id;
    if (carId) {
      const currentCar = await Car.findById(carId);
      if (currentCar && currentCar.dailyRate) {
        pricePerDay = Number(currentCar.dailyRate);
      }
    }

    const extraAmount = extraDays * pricePerDay;

    // Currency conversion (PKR -> USD) to match createCheckoutSession
    const PKR_TO_USD = 0.0036;
    const extraAmountUSD = Number((extraAmount * PKR_TO_USD).toFixed(2));
    const stripeAmount = Math.round(extraAmountUSD * 100);

    console.log("Extension Calculation:", { extraDays, pricePerDay, extraAmount, stripeAmount });

    if (stripeAmount < 50) {
      console.log("Stripe amount too low, enforcing minimum:", stripeAmount);
      stripeAmount = 50;
    }

    booking.extraAmount = extraAmount;
    booking.pendingReturnDate = newReturnDate;
    await booking.save();

    let stripeInstance;
    try {
      stripeInstance = getStripe();
    } catch (err) {
      console.error("Stripe config error:", err);
      return res.status(500).json({ message: "Stripe configuration error" });
    }

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Extend Booking - ${booking.car.make || 'Car'} ${booking.car.model || ''}`,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${CLIENT_URL}/extend-success?bookingId=${booking._id}&newReturn=${newReturnDate}`,
      cancel_url: `${CLIENT_URL}/bookings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Extension failed" });
  }
};

//EXTEND PAYMENT SUCCESSFULL VERIFICATION
export const confirmExtendPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bookingId, newReturn } = req.query;
    const booking = await Booking.findById(bookingId).session(session);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const newReturnDate = newReturn ? new Date(newReturn) : null;
    if (!newReturnDate || Number.isNaN(newReturnDate.getTime())) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Invalid new return date" });
    }

    const currentReturn = new Date(booking.returnDate);
    if (Number.isNaN(currentReturn.getTime())) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Current booking return date invalid" });
    }

    if (newReturnDate <= currentReturn) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "New return date must be after the current return date" });
    }

    const extraDays = Math.ceil((newReturnDate - currentReturn) / (1000 * 60 * 60 * 24));
    const pricePerDay = Number(booking.car?.dailyRate || 0);
    const extraAmountPKR = extraDays * pricePerDay;

    // Update booking amounts and return date
    booking.returnDate = newReturnDate;
    booking.amountPKR = (booking.amountPKR || 0) + extraAmountPKR;

    const PKR_TO_USD = 0.0036;
    booking.amountUSD = (booking.amountUSD || 0) + Number((extraAmountPKR * PKR_TO_USD).toFixed(2));

    // Ensure status allows for car availability update (hook requires active/upcoming/pending)
    if (booking.status === "completed") {
      booking.status = "active";
    }

    await booking.save({ session });

    // Ensure car availability sync is correct (force update even if hook missed)
    if (booking.car?.id) {
      try {
        await Car.updateOne(
          { _id: booking.car.id },
          { $pull: { bookings: { bookingId: booking._id } } },
        );

        if (['active', 'upcoming'].includes(booking.status) && booking.paymentStatus === 'paid') {
          await Car.updateOne(
            { _id: booking.car.id },
            {
              $push: {
                bookings: {
                  bookingId: booking._id,
                  pickupDate: booking.pickupDate,
                  returnDate: booking.returnDate,
                  status: booking.status,
                  paymentStatus: booking.paymentStatus,
                },
              },
            },
          );
        }
      } catch (syncErr) {
        console.error("Failed to sync car booking after extension:", syncErr);
      }
    }

    // Send email confirmation
    let userEmail = booking.email;
    let userPhone = booking.phone;
    const userId = booking.userId;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).lean();
      if (user && user.email) {
        userEmail = user.email;
      }
      if (user && user.phone) {
        userPhone = user.phone;
      }
    }

    const carName = booking.car ? `${booking.car.make} ${booking.car.model}` : "your car";
    const extendSubject = "Your Booking has been Extended!";
    const extendHtml = `
        <h3>Dear ${booking.customer},</h3>
        <p>Your booking for <strong>${carName}</strong> has been successfully extended.</p>
        <p><strong>Booking ID:</strong> ${booking._id.toString()}</p>
        <p><strong>New Return Date:</strong> ${new Date(booking.returnDate).toDateString()}</p>
        <p><strong>Updated Total Amount:</strong> ${booking.amountPKR.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })}</p>
        <p>You can view your updated booking details here:</p>
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
          <tr>
            <td align="center" bgcolor="#f97316" role="presentation" style="border:none;border-radius:5px;cursor:auto;mso-padding-alt:10px 20px;background:#f97316;" valign="middle">
              <a href="${CLIENT_URL}/bookings" style="display:inline-block;background:#f97316;color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:normal;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:10px 20px;mso-padding-alt:0px;border-radius:5px;" target="_blank">
                View My Bookings
              </a>
            </td>
          </tr>
        </table>
        <p>Thank you for choosing us.</p>
      `;

    if (userEmail) {
      sendEmail(userEmail, extendSubject, "Your booking has been extended.", extendHtml);
    }

    await sendWhatsAppMessage(
      userPhone,
      buildBookingWhatsappMessage({
        customer: booking.customer,
        intro: `Your booking for ${carName} has been extended successfully.`,
        bookingId: booking._id.toString(),
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate,
        actionUrl: `${CLIENT_URL}/bookings`,
        extraLines: [
          `Updated Total Amount: ${booking.amountPKR.toLocaleString("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })}`,
        ],
      }),
      {
        templateName: WHATSAPP_TEMPLATES.extended,
        templateParameters: [
          booking.customer,
          carName,
          booking._id.toString(),
          new Date(booking.pickupDate).toDateString(),
          new Date(booking.returnDate).toDateString(),
          booking.amountPKR.toLocaleString("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }),
          `${CLIENT_URL}/bookings`,
        ],
      },
    );

    await session.commitTransaction();
    session.endSession();

    const updatedBooking = await Booking.findById(booking._id).lean();
    return res.json({
      success: true,
      message: "Booking extended successfully",
      booking: updatedBooking,
      extension: { extraDays, extraAmountPKR },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Confirm Extend Payment Error:", err);
    res.status(500).json({ success: false, message: "Extension confirmation failed" });
  }
};

//SUCCESSFULL PAYMENT VERIFICATION
export const confirmPayment = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id)
      return res
        .status(400)
        .json({ success: false, message: "Session_id required" });

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Payment not configure",
        error: err.message,
      });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session)
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });

    if (session.payment_status !== "paid")
      return res.status(400).json({
        success: false,
        message: `Payment not completed. status=${session.payment_status}`,
        session,
      });

    const bookingId = session.metadata?.bookingId;

    const computeBookingStatus = (pickup, ret) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const pickupDay = pickup ? new Date(pickup) : null;
      const returnDay = ret ? new Date(ret) : null;

      if (pickupDay && !Number.isNaN(pickupDay.getTime())) {
        pickupDay.setHours(0, 0, 0, 0);
      }
      if (returnDay && !Number.isNaN(returnDay.getTime())) {
        returnDay.setHours(0, 0, 0, 0);
      }

      if (pickupDay && returnDay) {
        if (pickupDay > now) return "upcoming";
        if (pickupDay <= now && returnDay >= now) return "active";
        if (returnDay < now) return "completed";
      }

      return "active"; // default after payment
    };

    // Load the booking so we update it through save() (which triggers post-save hook)
    let order = null;
    if (bookingId) {
      order = await Booking.findById(bookingId);
    }

    if (!order) {
      order = await Booking.findOne({ sessionId: session_id });
    }

    if (!order)
      return res.status(404).json({
        success: false,
        message: "Booking not found for this session",
        session,
      });

    const newStatus = computeBookingStatus(order.pickupDate, order.returnDate);

    order.paymentStatus = "paid";
    order.status = newStatus;
    order.paymentIntentId = session.payment_intent || "";
    order.paymentDetails = {
      amount_total: session.amount_total || null,
      currency: session.currency || null,
    };

    await order.save();

    // Ensure car availability is synced after payment (in case post-save hook didn't run)
    try {
      if (order.car?.id) {
        await Car.updateOne(
          { _id: order.car.id },
          { $pull: { bookings: { bookingId: order._id } } },
        );

        if (["active", "upcoming"].includes(order.status) && order.paymentStatus === "paid") {
          await Car.updateOne(
            { _id: order.car.id },
            {
              $push: {
                bookings: {
                  bookingId: order._id,
                  pickupDate: order.pickupDate,
                  returnDate: order.returnDate,
                  status: order.status,
                  paymentStatus: order.paymentStatus,
                },
              },
            },
          );
        }
      }
    } catch (syncErr) {
      console.error("Failed to sync car booking after payment:", syncErr);
    }

    // Fetch the user to get the most up-to-date email, fallback to booking email
    let userEmail = order.email;
    let userPhone = order.phone;
    const userId = order.userId;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).lean();
      if (user && user.email) {
        userEmail = user.email;
      }
      if (user && user.phone) {
        userPhone = user.phone;
      }
    }

    const carName = order.car ? `${order.car.make} ${order.car.model}` : "your car";
    const confirmSubject = "Booking Confirmed!";
    const confirmHtml = `
        <h3>Dear ${order.customer},</h3>
        <p>Your payment was successful!</p>
        <p>Your booking for <strong>${carName}</strong> is now confirmed.</p>
        <p><strong>Booking ID:</strong> ${order._id.toString()}</p>
        <p><strong>Pickup Date:</strong> ${new Date(order.pickupDate).toDateString()}</p>
        <p><strong>Return Date:</strong> ${new Date(order.returnDate).toDateString()}</p>
        <p>You can view your confirmed booking details here:</p>
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
          <tr>
            <td align="center" bgcolor="#f97316" role="presentation" style="border:none;border-radius:5px;cursor:auto;mso-padding-alt:10px 20px;background:#f97316;" valign="middle">
              <a href="${CLIENT_URL}/bookings" style="display:inline-block;background:#f97316;color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:normal;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:10px 20px;mso-padding-alt:0px;border-radius:5px;" target="_blank">
                View My Bookings
              </a>
            </td>
          </tr>
        </table>
        <p>Thank you for choosing us.</p>
      `;

    if (userEmail) {
      sendEmail(userEmail, confirmSubject, "Your booking is confirmed!", confirmHtml);
    }

    await sendWhatsAppMessage(
      userPhone,
      buildBookingWhatsappMessage({
        customer: order.customer,
        intro: `Your payment was successful and your booking for ${carName} is now confirmed.`,
        bookingId: order._id.toString(),
        pickupDate: order.pickupDate,
        returnDate: order.returnDate,
        actionUrl: `${CLIENT_URL}/bookings`,
      }),
      {
        templateName: WHATSAPP_TEMPLATES.confirmed,
        templateParameters: [
          order.customer,
          carName,
          order._id.toString(),
          new Date(order.pickupDate).toDateString(),
          new Date(order.returnDate).toDateString(),
          `${CLIENT_URL}/bookings`,
        ],
      },
    );

    return res.json({ success: true, order });
  } catch (err) {
    console.error("Confirm Payment Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server Error",
    });
  }
};
