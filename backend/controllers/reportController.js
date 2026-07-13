import Booking from "../models/bookingModel.js";
import Car from "../models/carModel.js";
import PDFDocument from "pdfkit";
import { parse } from "json2csv";

/** Calendar ranges in UTC so filters match Mongo `createdAt` (stored in UTC). */
const getDateRange = (type, date, month, year) => {
  let startDate;
  let endDate;

  try {
    if (type === "daily" && date) {
      const [ys, ms, ds] = String(date).split("-").map((x) => parseInt(x, 10));
      const y = ys || new Date().getUTCFullYear();
      const mo = ms || 1;
      const d = ds || 1;
      startDate = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
    } else if (type === "monthly" && month) {
      const [ys, ms] = String(month).split("-");
      const y = parseInt(ys, 10) || new Date().getUTCFullYear();
      const mo = parseInt(ms, 10) || 1;
      startDate = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(y, mo, 0, 23, 59, 59, 999));
    } else if (type === "yearly" && year !== undefined && year !== "") {
      const y = parseInt(String(year), 10) || new Date().getUTCFullYear();
      startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    } else {
      const now = new Date();
      const y = now.getUTCFullYear();
      const mo = now.getUTCMonth();
      const d = now.getUTCDate();
      startDate = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(y, mo, d, 23, 59, 59, 999));
    }
  } catch (err) {
    console.error("Error in getDateRange:", err);
    const now = new Date();
    const y = now.getUTCFullYear();
    const mo = now.getUTCMonth();
    const d = now.getUTCDate();
    startDate = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(y, mo, d, 23, 59, 59, 999));
  }

  return { startDate, endDate };
};

/** Revenue = paid bookings only (realized). Counts use all bookings in period. */
const computeBookingReportStats = (bookings) => {
  const totalBookings = bookings.length;
  const isPaid = (b) => String(b.paymentStatus || "").toLowerCase() === "paid";
  const paid = bookings.filter(isPaid);
  const pendingPayment = bookings.filter(
    (b) => String(b.paymentStatus || "").toLowerCase() === "pending",
  );
  const paidCount = paid.length;

  const totalRevenue = paid.reduce(
    (sum, b) => sum + (Number(b.amountPKR) || 0),
    0,
  );

  const completedBookings = bookings.filter(
    (b) => b.status === "completed",
  ).length;
  const cancelledBookings = bookings.filter(
    (b) => b.status === "cancelled",
  ).length;
  const activeBookings = bookings.filter(
    (b) => b.status === "active" || b.status === "upcoming",
  ).length;

  const averageRevenuePerBooking =
    paidCount > 0 ? totalRevenue / paidCount : 0;

  const uniqueVehiclesUsed = new Set(
    paid.map((b) => b.car?.id?.toString()).filter(Boolean),
  ).size;

  return {
    totalBookings,
    paidBookingsCount: paidCount,
    pendingPaymentBookings: pendingPayment.length,
    completedBookings,
    cancelledBookings,
    activeBookings,
    totalRevenue: Math.round(totalRevenue),
    averageRevenuePerBooking: Math.round(averageRevenuePerBooking),
    uniqueVehiclesUsed,
  };
};

const buildDailyBreakdown = (bookings, type) => {
  if (type !== "monthly" && type !== "yearly") return [];
  const dailyData = {};
  bookings.forEach((b) => {
    const day = new Date(b.createdAt).toISOString().slice(0, 10);
    if (!dailyData[day]) {
      dailyData[day] = { bookings: 0, revenue: 0 };
    }
    dailyData[day].bookings += 1;
    if (String(b.paymentStatus || "").toLowerCase() === "paid") {
      dailyData[day].revenue += Number(b.amountPKR || 0);
    }
  });
  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    ...data,
  }));
};

// Get report data
export const getReport = async (req, res) => {
  try {
    // Set CORS headers explicitly
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type');
    
    const { type = "daily", date, month, year } = req.query;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Report type is required",
      });
    }

    const { startDate, endDate } = getDateRange(type, date, month, year);

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("userId", "name email phone")
      .lean();

    const metrics = computeBookingReportStats(bookings);
    const [fleetTotalCars, dailyBreakdown] = await Promise.all([
      Car.countDocuments({}),
      Promise.resolve(buildDailyBreakdown(bookings, type)),
    ]);

    return res.json({
      success: true,
      data: {
        ...metrics,
        dailyBreakdown,
        bookings,
        fleetTotalCars,
        period: {
          type,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report",
      error: error?.message || "Unknown error",
    });
  }
};

// Download report as PDF
export const downloadReportPDF = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Type, Content-Length",
    );

    const { type = "daily", date, month, year } = req.query;
    const { startDate, endDate } = getDateRange(type, date, month, year);

    // Fetch bookings for the date range
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("userId", "name email phone")
      .lean();

    const {
      totalBookings,
      paidBookingsCount,
      pendingPaymentBookings,
      completedBookings,
      cancelledBookings,
      activeBookings,
      totalRevenue,
      averageRevenuePerBooking,
    } = computeBookingReportStats(bookings);
    const fleetTotalCars = await Car.countDocuments({});

    const doc = new PDFDocument();
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("error", (err) => {
      console.error("PDFKit error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Failed to generate PDF",
          error: err.message,
        });
      }
    });
    doc.on("end", () => {
      if (res.writableEnded) return;
      try {
        const pdfBuffer = Buffer.concat(buffers);
        const filename = `report-${type}-${Date.now()}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", String(pdfBuffer.length));
        res.send(pdfBuffer);
      } catch (sendErr) {
        console.error("Error sending PDF buffer:", sendErr);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Failed to send PDF",
            error: sendErr.message,
          });
        }
      }
    });

    // Title
    doc.fontSize(24).font("Helvetica-Bold").text("Business Report", { align: "center" });
    doc.fontSize(12).font("Helvetica").text(`${type.toUpperCase()} Report`, { align: "center" });
    doc
      .fontSize(10)
      .text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, {
        align: "center",
      });

    doc.moveDown();

    // Summary Section
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Summary", { underline: true });
    doc.fontSize(11).font("Helvetica");

    doc.text(`Total bookings (records): ${totalBookings}`);
    doc.text(`Paid bookings: ${paidBookingsCount}`);
    doc.text(`Pending payment: ${pendingPaymentBookings}`);
    doc.text(`Completed Bookings: ${completedBookings}`);
    doc.text(`Cancelled Bookings: ${cancelledBookings}`);
    doc.text(`Active Bookings: ${activeBookings}`);
    doc.text(`Fleet (total cars in system): ${fleetTotalCars}`);
    doc.text(`Total revenue (paid, PKR): ${totalRevenue.toLocaleString()}`);
    doc.text(
      `Average revenue per paid booking (PKR): ${Math.round(averageRevenuePerBooking).toLocaleString()}`
    );

    doc.moveDown();

    // Bookings Table
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Booking Details", { underline: true });

    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const col1X = 50;
    const col2X = 150;
    const col3X = 250;
    const col4X = 350;
    const col5X = 450;

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Date", col1X, tableTop)
      .text("Customer", col2X, tableTop)
      .text("Car", col3X, tableTop)
      .text("Status", col4X, tableTop)
      .text("Amount", col5X, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    let yPosition = tableTop + 20;
    bookings.slice(0, 15).forEach((booking) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          new Date(booking.createdAt).toLocaleDateString(),
          col1X,
          yPosition
        )
        .text(booking.userId?.name || "N/A", col2X, yPosition)
        .text(
          `${booking.car?.make || "N/A"} ${booking.car?.model || ""}`,
          col3X,
          yPosition
        )
        .text(booking.status || "N/A", col4X, yPosition)
        .text(
          `PKR ${(booking.amountPKR || 0).toLocaleString()}`,
          col5X,
          yPosition
        );

      yPosition += 20;
    });

    if (bookings.length > 15) {
      doc.text(`... and ${bookings.length - 15} more bookings`, 50, yPosition);
    }

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to generate PDF",
        error: error.message,
      });
    }
  }
};

// Download report as CSV
export const downloadReportCSV = async (req, res) => {
  try {
    // Set CORS headers explicitly
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    
    const { type = "daily", date, month, year } = req.query;
    const { startDate, endDate } = getDateRange(type, date, month, year);

    // Fetch bookings for the date range
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("userId", "name email phone")
      .lean();

    // Prepare data for CSV
    const csvData = bookings.map((booking) => ({
      Date: new Date(booking.createdAt).toLocaleDateString(),
      Customer: booking.userId?.name || booking.customer || "N/A",
      Email: booking.userId?.email || booking.email || "N/A",
      Phone: booking.userId?.phone || booking.phone || "N/A",
      Car: `${booking.car?.make || "N/A"} ${booking.car?.model || ""}`,
      Status: booking.status || "N/A",
      PickupDate: booking.pickupDate
        ? new Date(booking.pickupDate).toLocaleDateString()
        : "N/A",
      ReturnDate: booking.returnDate
        ? new Date(booking.returnDate).toLocaleDateString()
        : "N/A",
      Amount: booking.amountPKR || 0,
      PaymentStatus: booking.paymentStatus || "N/A",
    }));

    // Convert to CSV
    const csv = parse(csvData);

    const filename = `report-${type}-${Date.now()}.csv`;
    const body = Buffer.from(csv, "utf8");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(body.length));
    res.send(body);
  } catch (error) {
    console.error("Error generating CSV:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate CSV",
      error: error.message,
    });
  }
};
