import cron from "node-cron";
import Booking from "../models/bookingModel.js";
import { sendEmail } from "./emailService.js";
import { sendWhatsAppMessage } from "./whatsappService.js";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const REMINDER_LEAD_HOURS = 5;

const checkReminders = async () => {
  console.log("Running booking reminder check...");
  try {
    const now = new Date();

    // Send reminder once when booking is due in <= 5 hours and still not expired.
    // This avoids missing reminders if the server was down at the exact 5h point.
    const windowEnd = new Date(now.getTime() + REMINDER_LEAD_HOURS * 60 * 60 * 1000);

    const expiringBookings = await Booking.find({
      status: { $in: ["active", "upcoming"] },
      returnDate: { $gt: now, $lte: windowEnd },
      reminderSent: { $ne: true },
    });

    console.log(`Found ${expiringBookings.length} bookings requiring reminder (<= ${REMINDER_LEAD_HOURS}h left).`);

    for (const booking of expiringBookings) {
      let sentAny = false;

      const carName = booking.car ? `${booking.car.make} ${booking.car.model}` : "your car";
      // Create direct link with query param
      const bookingUrl = `${CLIENT_URL}/bookings?bookingId=${booking._id}`;

      const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #ea580c;">Booking Ending Soon</h2>
            <p>Dear ${booking.customer},</p>
            <p>Your booking for <strong>${carName}</strong> is scheduled to end in approximately ${REMINDER_LEAD_HOURS} hours.</p>
            <p><strong>Return Time:</strong> ${new Date(booking.returnDate).toLocaleString()}</p>
            
            <p>If you need more time, you can extend your booking directly from your dashboard.</p>
            
            <div style="margin: 25px 0;">
              <a href="${bookingUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Details / Extend Booking
              </a>
            </div>
            
            <p style="font-size: 12px; color: #666;">Or copy this link: <a href="${bookingUrl}">${bookingUrl}</a></p>
          </div>
        `;

      if (booking.email) {
        await sendEmail(
          booking.email,
          `Action Required: ${REMINDER_LEAD_HOURS} Hours Left for ${carName}`,
          "Your booking is ending soon.",
          html,
        );
        sentAny = true;
      }

      const whatsAppText = [
        `PremiumDrive Reminder`,
        `Hi ${booking.customer},`,
        `Your booking for ${carName} will end in about ${REMINDER_LEAD_HOURS} hours.`,
        `Return time: ${new Date(booking.returnDate).toLocaleString()}`,
        `Manage or extend booking: ${bookingUrl}`,
      ].join("\n");

      if (booking.phone) {
        const whatsappSent = await sendWhatsAppMessage(booking.phone, whatsAppText);
        sentAny = sentAny || Boolean(whatsappSent);
      }

      // Mark as sent only when at least one channel was delivered/skipped as successful.
      if (sentAny) {
        booking.reminderSent = true;
        await booking.save();
        console.log(`Reminder sent for booking ${booking._id}`);
      } else {
        console.warn(`Reminder skipped for booking ${booking._id}: missing/invalid email and phone`);
      }
    }
  } catch (err) {
    console.error("Scheduler Error:", err);
  }
};

export const initScheduler = () => {
  checkReminders().catch((err) => {
    console.error("Initial reminder check failed:", err);
  });

  // Run every 10 minutes to check for upcoming expirations
  cron.schedule("*/10 * * * *", async () => {
    await checkReminders();
  });
};
