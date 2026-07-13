import React from "react";
import { FaCheckCircle, FaTimes } from "react-icons/fa";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatCurrencyPKR = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Rs ${n.toLocaleString("en-PK")}`;
};

/** Booking model uses amountPKR; legacy may use amount; Stripe stores paymentDetails. */
const getPaidAmountLines = (booking) => {
  const pkr = Number(booking?.amountPKR ?? booking?.amount);
  const pkrLine = formatCurrencyPKR(pkr);

  const total = booking?.paymentDetails?.amount_total;
  const cur = String(booking?.paymentDetails?.currency || "").toLowerCase();
  let cardLine = null;
  if (Number.isFinite(Number(total)) && Number(total) > 0) {
    const minor = Number(total);
    const major =
      cur === "jpy" || cur === "vnd" || cur === "krw"
        ? minor
        : minor / 100;
    if (cur === "usd") {
      cardLine = `Card charge (Stripe): US$${major.toFixed(2)}`;
    } else if (cur) {
      cardLine = `Card charge (Stripe): ${cur.toUpperCase()} ${major}`;
    } else {
      cardLine = `Card charge (Stripe): ${major}`;
    }
  }

  if (pkrLine) return { main: pkrLine, sub: cardLine };
  if (cardLine) return { main: cardLine, sub: null };
  return { main: "—", sub: null };
};

const rowClass = "grid grid-cols-2 gap-3 text-sm";

const BookingConfirmationReceipt = ({
  booking,
  onClose,
  compact = false,
  variant = "booking",
  extension = null,
}) => {
  if (!booking) return null;

  const isExtension = variant === "extension";

  const carName =
    `${booking?.car?.make || ""} ${booking?.car?.model || ""}`.trim() ||
    booking?.car?.name ||
    "Vehicle";

  const address = booking?.address || {};
  const details = booking?.details || {};
  const addressLabel =
    [address.street, address.city, address.state, address.zipCode]
      .filter(Boolean)
      .join(", ") ||
    details.pickupLocation ||
    "—";

  const paidLines = getPaidAmountLines(booking);

  return (
    <div
      className={`relative w-full rounded-2xl border border-orange-500/40 bg-white text-gray-900 shadow-2xl ${
        compact ? "max-w-md p-4" : "max-w-2xl p-5 sm:p-6"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200 hover:text-gray-900"
        aria-label="Close receipt"
      >
        <FaTimes />
      </button>

      <div className="mb-4 flex items-center gap-3 pr-8">
        <FaCheckCircle className="text-2xl text-emerald-400" />
        <div>
          <h2 className="text-lg font-bold sm:text-xl">
            {isExtension ? "Booking extended" : "Booking confirmed"}
          </h2>
          <p className="text-xs text-gray-600 sm:text-sm">
            {isExtension
              ? "Extension payment received. An updated confirmation has been sent to your email."
              : "Payment successful. Confirmation email has been sent."}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200/80 bg-white border border-gray-200 shadow-sm p-4">
        <div className={rowClass}>
          <span className="text-gray-400">Booking ID</span>
          <span className="text-right font-medium">{booking?._id || "—"}</span>
        </div>
        <div className={rowClass}>
          <span className="text-gray-400">Customer</span>
          <span className="text-right font-medium">{booking?.customer || "—"}</span>
        </div>
        <div className={rowClass}>
          <span className="text-gray-400">Vehicle</span>
          <span className="text-right font-medium">{carName}</span>
        </div>
        <div className={rowClass}>
          <span className="text-gray-400">Pickup Date</span>
          <span className="text-right font-medium">
            {formatDate(booking?.pickupDate)}
          </span>
        </div>
        <div className={rowClass}>
          <span className="text-gray-400">Return Date</span>
          <span className="text-right font-medium">
            {formatDate(booking?.returnDate)}
          </span>
        </div>
        {isExtension && extension && (
          <>
            <div className={rowClass}>
              <span className="text-gray-400">Extra days added</span>
              <span className="text-right font-medium">
                {Number.isFinite(Number(extension.extraDays))
                  ? String(extension.extraDays)
                  : "—"}
              </span>
            </div>
            <div className={rowClass}>
              <span className="text-gray-400">Extension (this payment)</span>
              <span className="text-right font-medium text-emerald-300">
                {formatCurrencyPKR(extension.extraAmountPKR) || "—"}
              </span>
            </div>
          </>
        )}
        <div className={rowClass}>
          <span className="text-gray-400">Email</span>
          <span className="truncate text-right font-medium">{booking?.email || "—"}</span>
        </div>
        <div className={rowClass}>
          <span className="text-gray-400">Address / pickup</span>
          <span className="text-right font-medium">{addressLabel}</span>
        </div>
        <div className="mt-2 border-t border-gray-200 pt-3">
          <div className={rowClass}>
            <span className="text-gray-600">
              {isExtension ? "Updated booking total (PKR)" : "Total amount (PKR)"}
            </span>
            <span className="text-right text-base font-bold text-emerald-400">
              {paidLines.main}
            </span>
          </div>
          {paidLines.sub && (
            <p className="mt-1 text-right text-xs text-gray-400">{paidLines.sub}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationReceipt;
