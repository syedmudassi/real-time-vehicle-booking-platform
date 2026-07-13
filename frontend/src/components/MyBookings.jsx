// src/pages/MyBookings.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  FaCar,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaFilter,
  FaTimes,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUser,
  FaCreditCard,
  FaReceipt,
  FaArrowRight,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { myBookingsStyles as s } from "../assets/dummyStyles";

const API_BASE = "http://localhost:5000";
const TIMEOUT = 15000;

// ---------- Helpers ----------
const safeAccess = (fn, fallback = "") => {
  try {
    const v = fn();
    return v === undefined || v === null ? fallback : v;
  } catch {
    return fallback;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return Number.isNaN(d.getTime())
    ? String(dateString)
    : d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const formatPrice = (price) => {
  const num = typeof price === "number" ? price : Number(price) || 0;
  return num.toLocaleString("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  });
};

const daysBetween = (start, end) => {
  try {
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 0;
  }
};

const normalizeBooking = (booking) => {
  const getCarData = () => {
    if (!booking) return {};
    if (typeof booking.car === "string") return { name: booking.car };
    if (booking.car && typeof booking.car === "object") {
      const snapshot = { ...booking.car };
      if (snapshot.id && typeof snapshot.id === "object") {
        const populated = { ...snapshot.id };
        delete snapshot.id;
        return { ...snapshot, ...populated };
      }
      return snapshot;
    }
    return {};
  };

  const carObj = getCarData();
  const details = booking.details || {};
  const address = booking.address || {};

  const image =
    safeAccess(() => booking.carImage) ||
    safeAccess(() => carObj.image) ||
    "https://via.placeholder.com/800x450.png?text=No+Image";

  const pickupDate =
    safeAccess(() => booking.pickupDate) ||
    safeAccess(() => booking.dates?.pickup) ||
    booking.pickup ||
    null;

  const returnDate =
    safeAccess(() => booking.returnDate) ||
    safeAccess(() => booking.dates?.return) ||
    booking.return ||
    null;

  const normalized = {
    id: booking._id || booking.id || String(Math.random()).slice(2, 8),
    car: {
      make: carObj.make || carObj.name || "Unnamed Car",
      image,
      year: carObj.year || carObj.modelYear || "",
      category: carObj.category,
      seats: details.seats || carObj.seats || 4,
      transmission:
        details.transmission || carObj.transmission || carObj.gearbox || "",
      fuelType:
        details.fuelType ||
        details.fuel ||
        carObj.fuelType ||
        carObj.fuel ||
        carObj.fuel_type ||
        "",
      mileage:
        details.mileage || carObj.mileage || carObj.kmpl || carObj.mpg || "",
    },
    user: {
      name: booking.customer || safeAccess(() => booking.user?.name) || "Guest",
      email: booking.email || safeAccess(() => booking.user?.email) || "",
      phone: booking.phone || safeAccess(() => booking.user?.phone) || "",
      address:
        address.street || address.city || address.state
          ? `${address.street || ""}${address.city ? ", " + address.city : ""}${
              address.state ? ", " + address.state : ""
            }`
          : safeAccess(() => booking.user?.address) || "",
    },
    dates: { pickup: pickupDate, return: returnDate },
    location:
      details.pickupLocation ||
      address.city ||
      booking.location ||
      carObj.location ||
      "Pickup location",
    price: Number(
      booking.amountPKR ||
        booking.amount ||
        booking.price ||
        booking.total ||
        0,
    ),
    status: (typeof booking.status === "string" &&
      ["pending", "active", "upcoming", "completed", "cancelled"].includes(
        booking.status,
      )
      ? booking.status
      : booking.paymentStatus === "pending"
      ? "pending"
      : booking.paymentStatus === "paid"
      ? "active"
      : "pending"),
    bookingDate:
      booking.bookingDate ||
      booking.createdAt ||
      booking.updatedAt ||
      Date.now(),
    paymentMethod: booking.paymentMethod || booking.payment?.method || "",
    paymentId:
      booking.paymentIntentId || booking.paymentId || booking.sessionId || "",
    raw: booking,
  };

  // More robust status derivation
  let finalStatus = normalized.status;
  if (finalStatus !== "cancelled") {
    if (booking.paymentStatus === "paid") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pickupDay = normalized.dates.pickup
        ? new Date(normalized.dates.pickup)
        : null;
      if (pickupDay && !isNaN(pickupDay)) pickupDay.setHours(0, 0, 0, 0);

      const returnDay = normalized.dates.return
        ? new Date(normalized.dates.return)
        : null;
      if (returnDay && !isNaN(returnDay)) returnDay.setHours(0, 0, 0, 0);

      if (returnDay && returnDay < today) {
        finalStatus = "completed";
      } else if (pickupDay && pickupDay > today) {
        finalStatus = "upcoming";
      } else if (
        pickupDay &&
        returnDay &&
        pickupDay <= today &&
        returnDay >= today
      ) {
        finalStatus = "active";
      }
    } else {
      finalStatus = "pending";
    }
  }
  normalized.status = finalStatus;

  return normalized;
};

// ---------- Small presentational components ----------
const FilterButton = ({ filterKey, currentFilter, icon, label, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(filterKey)}
    className={s.filterButton(currentFilter === filterKey, filterKey)}
  >
    {icon} {label}
  </button>
);

const StatusBadge = ({ status }) => {
  const map = {
    completed: {
      text: "Completed",
      color: "bg-green-500",
      icon: <FaCheckCircle />,
    },
    upcoming: { text: "Upcoming", color: "bg-blue-500", icon: <FaClock /> },
    active: { text: "Active", color: "bg-yellow-500", icon: <FaCar /> },
    cancelled: {
      text: "Cancelled",
      color: "bg-red-500",
      icon: <FaTimesCircle />,
    },
    default: { text: "Unknown", color: "bg-gray-500", icon: null },
  };
  // Add pending status for clarity
  if (status === "pending") {
    map.pending = {
      text: "Pending Payment",
      color: "bg-gray-500",
      icon: <FaClock />,
    };
  }

  const { text, color, icon } = map[status] || map.default;
  return (
    <div
      className={`${color} text-gray-900 px-3 py-1 rounded-full inline-flex items-center gap-2 text-sm`}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
};

const BookingCard = ({ booking, onViewDetails }) => {
  const days = daysBetween(booking.dates.pickup, booking.dates.return);
  return (
    <div className={s.bookingCard}>
      <div className={s.cardImageContainer}>
        <img
          src={booking.car.image}
          alt={booking.car.make}
          className={s.cardImage}
        />
      </div>

      <div className={s.cardContent}>
        <div className={s.cardHeader}>
          <div>
            <h3 className={s.carTitle}>{booking.car.make}</h3>
            <p className={s.carSubtitle}>
              {booking.car.category} {booking.car.year}
            </p>
          </div>
          <div className="text-right">
            <p className={s.priceText}>{formatPrice(booking.price)}</p>
            <p className={s.daysText}>
              for {days} {days > 1 ? "days" : "day"}
            </p>
          </div>
        </div>

        <StatusBadge status={booking.status} />

        <div className={s.detailSection}>
          <div className={s.detailItem}>
            <div className={s.detailIcon}>
              <FaCalendarAlt />
            </div>
            <div>
              <p className={s.detailLabel}>Dates</p>
              <p className={s.detailValue}>
                {formatDate(booking.dates.pickup)} -{" "}
                {formatDate(booking.dates.return)}
              </p>
            </div>
          </div>

          <div className={s.detailItem}>
            <div className={s.detailIcon}>
              <FaMapMarkerAlt />
            </div>
            <div>
              <p className={s.detailLabel}>Pickup Location</p>
              <p className={s.detailValue}>{booking.location}</p>
            </div>
          </div>
        </div>

        <div className={s.cardActions}>
          <button
            type="button"
            onClick={() => onViewDetails(booking)}
            className={s.viewDetailsButton}
          >
            <FaReceipt /> View Details
          </button>
          <Link to="/cars" className={s.bookAgainButton}>
            <FaCar />
            {booking.status === "upcoming" ? "Modify" : "Book Again"}
          </Link>
        </div>
      </div>
    </div>
  );
};

const BookingModal = ({ booking, onClose, onCancel }) => {
  const [showExtend, setShowExtend] = useState(false);
  const [newReturnDate, setNewReturnDate] = useState("");
  const [extending, setExtending] = useState(false);

  const days = daysBetween(booking.dates.pickup, booking.dates.return);

  const currentReturn = new Date(booking.dates.return);

  const pricePerDay = days > 0 ? booking.price / days : booking.price;

  const extraDays = newReturnDate
    ? Math.ceil(
        (new Date(newReturnDate) - currentReturn) / (1000 * 60 * 60 * 24),
      )
    : 0;

  const extraAmount = extraDays > 0 ? extraDays * pricePerDay : 0;

  return (
    <div className={s.modalOverlay}>
      <div className={s.modalContainer}>
        <div className={s.modalContent}>
          <div className={s.modalHeader}>
            <h2 className={s.modalTitle}>
              <FaReceipt className="text-orange-400" /> Booking Details
            </h2>
            <div className="flex items-center gap-2">
              {(booking.status === "upcoming" ||
                booking.status === "active") && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowExtend(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Extend Booking
                  </button>

                  <button
                    type="button"
                    onClick={() => onCancel(booking.id)}
                    className={s.cancelButton}
                  >
                    Cancel Booking
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className={s.modalCloseButton}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div className={s.modalGrid}>
            <div>
              <img
                src={booking.car.image}
                alt={booking.car.make}
                className={s.carImageModal}
              />
            </div>

            <div>
              <h3 className={s.carTitle}>{booking.car.make}</h3>
              <div className={s.carTags}>
                <span className={s.carTag}>{booking.car.category}</span>
                <span className={s.carTag}>{booking.car.year}</span>
                <span className={s.carTag}>{booking.car.seats} seats</span>
                <span className={s.carTag}>{booking.car.transmission}</span>
              </div>

              <div className={s.infoGrid}>
                <div>
                  <p className={s.infoLabel}>Fuel Type</p>
                  <p className={s.infoValue}>{booking.car.fuelType}</p>
                </div>
                <div>
                  <p className={s.infoLabel}>Mileage</p>
                  <p className={s.infoValue}>{booking.car.mileage}</p>
                </div>
                <div>
                  <p className={s.infoLabel}>Price per day</p>
                  <p className={s.infoValue}>{formatPrice(pricePerDay)}</p>
                </div>
                <div>
                  <p className={s.infoLabel}>Total Price</p>
                  <p className={s.priceValue}>{formatPrice(booking.price)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={s.modalGrid}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FaCalendarAlt className="text-orange-400" /> Booking Dates
              </h3>
              <div className={s.infoCard}>
                {showExtend && (
                  <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">
                      Extend Booking
                    </h3>

                    <input
                      type="date"
                      min={
                        new Date(booking.dates.return)
                          .toISOString()
                          .split("T")[0]
                      }
                      value={newReturnDate}
                      onChange={(e) => setNewReturnDate(e.target.value)}
                      className="p-2 rounded bg-gray-200 text-gray-900 w-full"
                    />

                    {extraDays > 0 && (
                      <div className="mt-3 text-sm">
                        <p>Extra Days: {extraDays}</p>
                        <p>Extra Amount: {formatPrice(extraAmount)}</p>
                      </div>
                    )}

                    <button
                      disabled={extraDays <= 0 || extending}
                      onClick={async () => {
                        try {
                          setExtending(true);
                          const token = localStorage.getItem("token");

                          const res = await axios.post(
                            `${API_BASE}/api/payments/extend-checkout-session`,
                            {
                              bookingId: booking.id,
                              newReturnDate,
                            },
                            {
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            },
                          );

                          if (res.data.url) {
                            window.location.href = res.data.url;
                          }
                        } catch (err) {
                          const msg =
                            err.response?.data?.message ||
                            err.message ||
                            "Extension failed";
                          toast.error(msg);
                        } finally {
                          setExtending(false);
                        }
                      }}
                      className="mt-4 bg-orange-500 text-white px-4 py-2 rounded"
                    >
                      {extending ? "Processing..." : "Pay & Extend"}
                    </button>
                  </div>
                )}
                <div className={s.infoRow}>
                  <p className={s.infoLabel}>Pickup Date:</p>
                  <p className={s.infoValue}>
                    {formatDate(booking.dates.pickup)}
                  </p>
                </div>
                <div className={s.infoRow}>
                  <p className={s.infoLabel}>Return Date:</p>
                  <p className={s.infoValue}>
                    {formatDate(booking.dates.return)}
                  </p>
                </div>
                <div className={`${s.infoRow} ${s.infoDivider}`}>
                  <p className={s.infoLabel}>Duration:</p>
                  <p className={s.infoValue}>{days} days</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                <FaMapMarkerAlt className="text-orange-400" /> Location Details
              </h3>
              <div className={s.infoCard}>
                <p className={s.infoLabel}>Pickup Location:</p>
                <p className={s.infoValue}>{booking.location}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                <FaUser className="text-orange-400" /> User Information
              </h3>
              <div className={s.infoCard}>
                <div className="mb-3">
                  <p className={s.infoLabel}>Full Name:</p>
                  <p className={s.infoValue}>{booking.user.name}</p>
                </div>
                <div className="mb-3">
                  <p className={s.infoLabel}>Email:</p>
                  <p className={s.infoValue}>{booking.user.email}</p>
                </div>
                <div className="mb-3">
                  <p className={s.infoLabel}>Phone:</p>
                  <p className={s.infoValue}>{booking.user.phone}</p>
                </div>
                <div>
                  <p className={s.infoLabel}>Address:</p>
                  <p className={s.infoValue}>{booking.user.address}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                <FaCreditCard className="text-orange-400" /> Payment Details
              </h3>
              <div className={s.infoCard}>
                <div className="mb-3">
                  <p className={s.infoLabel}>Payment Method:</p>
                  <p className={s.infoValue}>
                    {booking.paymentMethod || "â€”"}
                  </p>
                </div>
                <div>
                  <p className={s.infoLabel}>Transaction ID:</p>
                  <p className={s.infoValue}>
                    {booking.paymentId || booking.raw?.sessionId || "â€”"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={s.infoCard}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={s.infoLabel}>Booking Status:</p>
                <StatusBadge status={booking.status} />
              </div>
              <div>
                <p className={s.infoLabel}>Booking Date:</p>
                <p className={s.infoValue}>{formatDate(booking.bookingDate)}</p>
              </div>
            </div>
          </div>

          <div className={s.modalActions}>
            <button type="button" onClick={onClose} className={s.closeButton}>
              Close
            </button>
            <Link to="/cars" onClick={onClose} className={s.modalBookButton}>
              Book Again <FaArrowRight className="text-sm" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- Main page ----------
const StatsCard = ({ value, label, color }) => (
  <div className={s.statsCard}>
    <div className={s.statsValue(color)}>{value}</div>
    <p className={s.statsLabel}>{label}</p>
  </div>
);

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  const isMounted = useRef(true);
  useEffect(() => () => (isMounted.current = false), []);

  const fetchBookings = useCallback(async () => {
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const token = localStorage.getItem("token");
      const headers = {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      };

      const response = await axios.get(`${API_BASE}/api/bookings/mybooking`, {
        headers,
        signal: controller.signal,
        params: { v: new Date().getTime() }, // Cache-busting to get fresh data
      });

      const rawData = Array.isArray(response.data)
        ? response.data
        : response.data?.data ||
          response.data?.bookings ||
          response.data?.rows ||
          response.data ||
          [];

      const normalized = (Array.isArray(rawData) ? rawData : []).map(
        normalizeBooking,
      );

      // Ensure the latest update (e.g. payment confirmation) is always shown first
      // and avoid duplicate pending+paid bookings for the same car/date-range.
      const deduped = Object.values(
        normalized.reduce((acc, booking) => {
          const key = `${booking.car.id}::${booking.dates.pickup}::${booking.dates.return}`;
          const existing = acc[key];
          if (!existing) {
            acc[key] = booking;
            return acc;
          }

          // Prefer the most recently updated booking (payment done should win)
          const existingUpdated = new Date(existing.raw?.updatedAt || existing.raw?.createdAt || 0).getTime();
          const currentUpdated = new Date(booking.raw?.updatedAt || booking.raw?.createdAt || 0).getTime();
          acc[key] = currentUpdated >= existingUpdated ? booking : existing;
          return acc;
        }, {}),
      );

      const sorted = deduped.sort((a, b) => {
        const aTime = new Date(a.raw?.updatedAt || a.raw?.createdAt || a.bookingDate).getTime();
        const bTime = new Date(b.raw?.updatedAt || b.raw?.createdAt || b.bookingDate).getTime();
        return bTime - aTime;
      });

      if (!isMounted.current) return;
      setBookings(sorted);
      setLoading(false);
    } catch (err) {
      if (!isMounted.current) return;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load bookings";

      if (err?.name === "CanceledError" || err?.message === "canceled") {
        toast.warn("Request cancelled / timed out");
        setError("Request cancelled / timed out");
      } else {
        toast.error(msg);
        setError(msg);
      }
      setLoading(false);
    } finally {
      clearTimeout(timeoutId);
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Automatically open booking details if bookingId is present in URL (from email)
  useEffect(() => {
    const linkedBookingId = searchParams.get("bookingId");
    if (linkedBookingId && bookings.length > 0) {
      const found = bookings.find((b) => b.id === linkedBookingId || b._id === linkedBookingId);
      if (found) {
        openDetails(found);
      }
    }
  }, [bookings, searchParams]);

  // Add an effect to refetch data when the tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchBookings();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchBookings]);

  const cancelBooking = useCallback(
    async (bookingId) => {
      if (!window.confirm("Are you sure you want to cancel this booking?"))
        return;
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        };
        const response = await axios.patch(
          `${API_BASE}/api/bookings/my/${bookingId}/status`,
          { status: "cancelled" },
          { headers },
        );

        const updated = normalizeBooking(
          response.data ||
            response.data?.data || { _id: bookingId, status: "cancelled" },
        );
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? updated : b)),
        );
        if (selectedBooking?.id === bookingId) setSelectedBooking(updated);
        toast.success("Booking cancelled successfully");
      } catch (err) {
        const msg =
          err.response?.data?.message || err.message || "Failed to cancel booking";
        toast.error(msg);
      }
    },
    [selectedBooking],
  );

  const filteredBookings = useMemo(
    () =>
      filter === "all" ? bookings : bookings.filter((b) => b.status === filter),
    [bookings, filter],
  );

  const filterButtons = [
    { key: "all", label: "All Bookings", icon: <FaFilter /> },
    { key: "upcoming", label: "Upcoming", icon: <FaClock /> },
    { key: "active", label: "Active", icon: <FaCar /> },
    { key: "completed", label: "Completed", icon: <FaCheckCircle /> },
    { key: "cancelled", label: "Cancelled", icon: <FaTimes /> },
  ];

  const openDetails = (b) => {
    setSelectedBooking(b);
    setShowModal(true);
  };
  const closeModal = () => {
    setSelectedBooking(null);
    setShowModal(false);
  };

  return (
    <div className={s.pageContainer}>
      <ToastContainer position="top-right" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className={s.title}>My Bookings</h1>
          <p className={s.subtitle}>
            View and manage all your current and past car rental bookings
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {filterButtons.map((btn) => (
            <FilterButton
              key={btn.key}
              filterKey={btn.key}
              currentFilter={filter}
              icon={btn.icon}
              label={btn.label}
              onClick={setFilter}
            />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className={s.loadingSpinner} />
          </div>
        )}

        {!loading && error && (
          <div className={s.errorContainer}>
            <p className={s.errorText}>{error}</p>
            <button
              type="button"
              onClick={fetchBookings}
              className={s.retryButton}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredBookings.length === 0 && (
          <div className={s.emptyState}>
            <div className={s.emptyIconContainer}>
              <FaCar className={s.emptyIcon} />
            </div>
            <h3 className={s.emptyTitle}>No bookings found</h3>
            <p className={s.emptyText}>
              {filter === "all"
                ? "You haven't made any bookings yet. Browse our collection to get started!"
                : `You don't have any ${filter} bookings.`}
            </p>
            <Link to="/cars" className={s.browseButton}>
              <FaCar /> Browse Cars
            </Link>
          </div>
        )}

        {!loading && !error && filteredBookings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onViewDetails={openDetails}
              />
            ))}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            value={bookings.length}
            label="Total Bookings"
            color="text-orange-400"
          />
          <StatsCard
            value={bookings.filter((b) => b.status === "completed").length}
            label="Completed Trips"
            color="text-green-400"
          />
          <StatsCard
            value={bookings.filter((b) => b.status === "upcoming").length}
            label="Upcoming Trips"
            color="text-blue-400"
          />
        </div>
      </div>

      {showModal && selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={closeModal}
          onCancel={cancelBooking}
        />
      )}
    </div>
  );
};

export default MyBookings;
