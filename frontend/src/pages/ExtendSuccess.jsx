import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import BookingConfirmationReceipt from "../components/BookingConfirmationReceipt";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ExtendSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const processed = useRef(false);

  const [statusMsg, setStatusMsg] = useState("Confirming extension payment…");
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [extensionMeta, setExtensionMeta] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const bookingId = params.get("bookingId");
    const newReturn = params.get("newReturn");

    if (!bookingId || !newReturn) {
      setStatusMsg("Missing booking or return date in the URL.");
      setFailed(true);
      return;
    }

    const confirm = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/payments/confirm-extend`, {
          params: { bookingId, newReturn },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 20000,
        });

        if (res?.data?.success && res.data?.booking) {
          setStatusMsg("Extension confirmed.");
          setConfirmedBooking(res.data.booking);
          setExtensionMeta(res.data.extension || null);
          try {
            localStorage.setItem(
              "latestConfirmedBooking",
              JSON.stringify(res.data.booking),
            );
          } catch {
            /* ignore */
          }
          return;
        }

        setStatusMsg(res?.data?.message || "Extension could not be confirmed.");
        setFailed(true);
      } catch (err) {
        console.error("Extension error:", err);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Extension confirmation failed";
        setStatusMsg(msg);
        setFailed(true);
        toast.error(msg);
      }
    };

    confirm();
  }, [params]);

  const goBookings = () => navigate("/bookings", { replace: true });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-gray-900">
      {confirmedBooking ? (
        <div className="w-full max-w-2xl">
          <BookingConfirmationReceipt
            booking={confirmedBooking}
            variant="extension"
            extension={extensionMeta}
            onClose={goBookings}
          />
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={goBookings}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Go to My Bookings
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center max-w-lg">
          <p className="mb-2">{statusMsg}</p>
          <p className="text-sm text-gray-900/60">
            {failed
              ? "You can return to My Bookings and try again if needed."
              : "Please wait while we confirm your extension payment."}
          </p>
          {failed && (
            <button
              type="button"
              onClick={goBookings}
              className="mt-6 rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              Go to My Bookings
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExtendSuccess;
