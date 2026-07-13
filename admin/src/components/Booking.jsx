import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BookingPageStyles, statusConfig } from "../assets/dummyStyles";
import { api } from "../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaChevronDown,
  FaCity,
  FaCreditCard,
  FaEdit,
  FaEnvelope,
  FaFilter,
  FaGasPump,
  FaGlobeAsia,
  FaMapMarkerAlt,
  FaMapPin,
  FaPhone,
  FaSearch,
  FaSync,
  FaTachometerAlt,
  FaUser,
  FaUserFriends,
} from "react-icons/fa";

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:5000";

// Utility functions
const formatDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d)
    ? ""
    : `${d.getDate()}`.padStart(2, "0") +
        "/" +
        `${d.getMonth() + 1}`.padStart(2, "0") +
        "/" +
        d.getFullYear();
};

const formatPrice = (price) => {
  const num = typeof price === "number" ? price : Number(price) || 0;
  return num.toLocaleString("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  });
};

const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysToInputDate = (value, days) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return toInputDate(d);
};

const makeImageUrl = (filename) =>
  filename ? `${baseURL}/uploads/${filename}` : "";

const normalizeDetails = (d = {}, car = {}) => ({
  seats: d.seats ?? d.numSeats ?? car.seats ?? "",
  fuel: String(d.fuelType ?? d.fuel ?? car.fuelType ?? car.fuel ?? ""),
  mileage: d.mileage ?? d.miles ?? car.mileage ?? car.miles ?? "",
  transmission: String(d.transmission ?? car.transmission ?? d.trans ?? ""),
});

const extractCarInfo = (b) => {
  const snap =
    b.carSnapshot &&
    typeof b.carSnapshot === "object" &&
    Object.keys(b.carSnapshot).length
      ? b.carSnapshot
      : null;
  const car = snap || (b.car && typeof b.car === "object" ? b.car : null);

  if (car)
    return {
      title:
        `${car.make || ""} ${car.model || ""}`.trim() ||
        car.make ||
        car.model ||
        "",
      make: car.make || "",
      model: car.model || "",
      year: car.year ?? "",
      dailyRate: car.dailyRate ?? 0,
      seats: car.seats ?? "",
      transmission: car.transmission ?? "",
      fuel: car.fuelType ?? car.fuel ?? "",
      mileage: car.mileage ?? "",
      image: car.image || b.carImage || b.image || "",
    };

  return typeof b.car === "string"
    ? { title: b.car, image: b.carImage || b.image || "" }
    : {
        title: b.carName || b.vehicle || "",
        image: b.carImage || b.image || "",
      };
};

const Panel = ({ title, icon, children }) => (
  <div className={BookingPageStyles.panel}>
    <h3 className={BookingPageStyles.panelTitle}>
      {icon}
      <span className={BookingPageStyles.panelIcon}>{title}</span>
    </h3>
    <div className=" space-y-3">{children}</div>
  </div>
);

const Detail = ({ icon, label, value }) => (
  <div className={BookingPageStyles.detailContainer}>
    <div className={BookingPageStyles.detailIcon}>{icon}</div>
    <div className="flex-1">
      <div className={BookingPageStyles.detailLabel}>{label}</div>
      <div className={BookingPageStyles.detailValue}>{value ?? ""}</div>
    </div>
  </div>
);

const Spec = ({ icon, label, value }) => (
  <div className={BookingPageStyles.specContainer}>
    <div className={BookingPageStyles.specIcon}>{icon}</div>
    <p className={BookingPageStyles.specLabel}>{label}</p>
    <p className={BookingPageStyles.specValue}>{value ?? ""}</p>
  </div>
);

const StatusIndicator = ({ status, isEditing, newStatus, onStatusChange }) => {
  const availableStatuses = ['pending', 'upcoming', 'active', 'completed', 'cancelled'];
  return isEditing ? (
    <select
      value={newStatus}
      onChange={onStatusChange}
      className="bg-white border border-gray-200 text-gray-900 text-sm px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
    >
      {availableStatuses.map((opt) => (
          <option value={opt} key={opt} className="bg-gray-100 text-gray-900">
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
    </select>
  ) : (
    <span className={BookingPageStyles.statusIndicator(status)}>
      <div className={BookingPageStyles.statusIcon(status)} />
      {String(status || "unknown")
        .charAt(0)
        .toUpperCase() + String(status || "unknown").slice(1)}
    </span>
  );
};

const BookingCardHeader = ({ booking, onToggleDetails, isExpanded }) => (
  <div className={BookingPageStyles.bookingCardHeader}>
    <div className={BookingPageStyles.bookingIconContainer}>
      <FaCalendarAlt className={BookingPageStyles.bookingIcon} />
    </div>
    <div>
      <div className={BookingPageStyles.bookingCustomer}>
        {booking.customer || ""}
      </div>
      <div className={BookingPageStyles.bookingEmail}>
        {booking.email || ""}
      </div>
    </div>

    <div className={BookingPageStyles.bookingExpandIcon}>
      <FaChevronDown
        className={` transition-transform duration-300 ${
          isExpanded ? "rotate-180" : ""
        }`}
      />
      <span className="ml-2 text-sm">
        {isExpanded ? "Hide Details" : "Show Details"}
      </span>
    </div>
  </div>
);

const BookingCardInfo = ({ booking, isEditing, newStatus, onStatusChange }) => (
  <div className={BookingPageStyles.bookingInfoGrid}>
    <div className="text-center">
      <div className={BookingPageStyles.bookingInfoLabel}>Car</div>
      <div className={BookingPageStyles.bookingInfoValue}>
        {booking.car || ""}
      </div>
    </div>
    <div className="text-center">
      <div className={BookingPageStyles.bookingInfoLabel}>Dates</div>
      <div className={BookingPageStyles.bookingInfoValue}>
        {formatDate(booking.pickupDate)} - {formatDate(booking.returnDate)}
      </div>
    </div>
    <div className="text-center">
      <div className={BookingPageStyles.bookingInfoLabel}>Amount</div>
      <div className={BookingPageStyles.bookingAmount}>
        {formatPrice(booking.amount)}
      </div>
    </div>
    <div className="text-center">
      <div className={BookingPageStyles.bookingInfoLabel}>Status</div>
      <StatusIndicator
        status={booking.status}
        isEditing={isEditing}
        newStatus={newStatus}
        onStatusChange={onStatusChange}
      />
    </div>
  </div>
);

const BookingCarActions = ({
  isEditing,
  onEditStatus,
  onSaveStatus,
  onCancelEdit,
  onStartExtend,
  onSaveExtend,
  onCancelExtend,
  onExtendDateChange,
  extendDate,
  isExtending,
  isExtendingLoading,
  onToggleDetails,
  isExpanded,
}) => (
  <div className={BookingPageStyles.bookingActions}>
    <div className=" items-center text-orange-400 hidden md:flex">
      <FaChevronDown
        className={`transition-transform duration-300 ${
          isExpanded ? "rotate-180" : ""
        }`}
      />
      <span className="ml-2 text-sm">
        {isExpanded ? "Hide Details" : "Show Details"}
      </span>
    </div>

    <div className=" flex flex-wrap items-center gap-2 ml-auto">
      {isEditing ? (
        <>
          <button
            className={BookingPageStyles.bookingActionButton("green")}
            onClick={onSaveStatus}
          >
            Save
          </button>

          <button
            className={BookingPageStyles.bookingActionButton("gray")}
            onClick={onCancelEdit}
          >
            Cancel
          </button>
        </>
      ) : isExtending ? (
        <>
          <input
            type="date"
            value={extendDate}
            onChange={onExtendDateChange}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm"
            title="Select new return date"
          />
          <button
            className={BookingPageStyles.bookingActionButton("green")}
            onClick={onSaveExtend}
            disabled={isExtendingLoading}
          >
            {isExtendingLoading ? "Saving..." : "Save Date"}
          </button>
          <button
            className={BookingPageStyles.bookingActionButton("gray")}
            onClick={onCancelExtend}
            disabled={isExtendingLoading}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onEditStatus}
            className={BookingPageStyles.bookingEditButton}
            title="Edit Status"
          >
            <FaEdit className=" inline mr-1" /> Edit
          </button>
          <button
            onClick={onStartExtend}
            className={BookingPageStyles.bookingActionButton("orange")}
            title="Extend Booking Date"
          >
            Extend Date
          </button>
        </>
      )}
    </div>
  </div>
);

const BookingCardDetails = ({ booking }) => (
  <div className={BookingPageStyles.bookingDetails}>
    <div className={BookingPageStyles.bookingDetailsGrid}>
      <Panel
        title="Customer Details"
        icon={<FaUser className={BookingPageStyles.panelIcon} />}
      >
        <Detail icon={<FaUser />} label="Full Name" value={booking.customer} />
        <Detail icon={<FaEnvelope />} label="Email" value={booking.email} />
        <Detail icon={<FaPhone />} label="Phone" value={booking.phone} />
      </Panel>

      <Panel
        title="Booking Details"
        icon={<FaCalendarAlt className={BookingPageStyles.panelIcon} />}
      >
        <Detail
          icon={<FaCalendarAlt />}
          label="Pickup Date"
          value={formatDate(booking.pickupDate)}
        />
        <Detail
          icon={<FaCalendarAlt />}
          label="Return Date"
          value={formatDate(booking.returnDate)}
        />
        <Detail
          icon={<FaCalendarAlt />}
          label="Booking Date"
          value={formatDate(booking.bookingDate)}
        />
        <Detail
          icon={<FaCreditCard />}
          label="Total Amount"
          value={formatPrice(booking.amount)}
        />
      </Panel>

      <Panel
        title="Address Details"
        icon={<FaMapMarkerAlt className={BookingPageStyles.panelIcon} />}
      >
        <Detail
          icon={<FaMapMarkerAlt />}
          label="Street"
          value={booking.address.street}
        />
        <Detail icon={<FaCity />} label="City" value={booking.address.city} />
        <Detail
          icon={<FaGlobeAsia />}
          label="State"
          value={booking.address.state}
        />
        <Detail
          icon={<FaMapPin />}
          label="ZIP Code"
          value={booking.address.zipCode}
        />
      </Panel>

      <Panel
        title="Car Details"
        icon={<FaCar className={BookingPageStyles.panelIcon} />}
      >
        <div className="flex items-center mb-4">
          <div className={BookingPageStyles.carImageContainer}>
            <img
              src={makeImageUrl(booking.carImage)}
              alt={booking.car || "car image"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="ml-4">
            <div className={BookingPageStyles.bookingCustomer}>
              {booking.car || ""}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Spec
            icon={<FaUserFriends />}
            label="Seats"
            value={booking.details.seats}
          />
          <Spec
            icon={<FaGasPump />}
            label="Fuel"
            value={booking.details.fuel}
          />
          <Spec
            icon={<FaTachometerAlt />}
            label="Mileage"
            value={booking.details.mileage}
          />
          <Spec
            icon={<FaCheckCircle />}
            label="Transmission"
            value={booking.details.transmission}
          />
        </div>

        {/* GPS system disabled
        {booking.gpsEnabled && booking.gpsVehicleId ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-800/30 bg-orange-900/10 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                GPS Tracking Enabled
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Vehicle Tracker ID:{" "}
                <span className="font-mono text-gray-700">
                  {booking.gpsVehicleId}
                </span>
              </p>
            </div>
            <button
              type="button"
              className={BookingPageStyles.bookingActionButton("orange")}
              onClick={(e) => {
                e.stopPropagation();
                booking.onTrack?.(booking.gpsVehicleId);
              }}
              title="Open live tracking map for this vehicle"
            >
              Track Vehicle
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-gray-200/60 bg-gray-50 p-4 text-xs text-gray-500">
            GPS tracking is not enabled for this car.
          </div>
        )}
        */}
      </Panel>
    </div>
  </div>
);

const BookingCard = ({
  booking,
  isExpanded,
  isEditing,
  newStatus,
  onToggleDetails,
  onEditStatus,
  onStatusChange,
  onSaveStatus,
  onCancelEdit,
  onStartExtend,
  onSaveExtend,
  onCancelExtend,
  onExtendDateChange,
  extendDate,
  isExtending,
  isExtendingLoading,
  isHighlighted,
}) => (
  <div
    className={`${BookingPageStyles.bookingCard} ${
      isHighlighted ? BookingPageStyles.bookingCardHighlight : ""
    }`}
  >
    <div className="p-5 cursor-pointer" onClick={onToggleDetails}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <BookingCardHeader
          booking={booking}
          onToggleDetails={onToggleDetails}
          isExpanded={isExpanded}
        />

        <BookingCardInfo
          booking={booking}
          isEditing={isEditing}
          newStatus={newStatus}
          onStatusChange={onStatusChange}
        />
      </div>

      <BookingCarActions
        isEditing={isEditing}
        onEditStatus={onEditStatus}
        onSaveStatus={onSaveStatus}
        onCancelEdit={onCancelEdit}
        onStartExtend={onStartExtend}
        onSaveExtend={onSaveExtend}
        onCancelExtend={onCancelExtend}
        onExtendDateChange={onExtendDateChange}
        extendDate={extendDate}
        isExtending={isExtending}
        isExtendingLoading={isExtendingLoading}
        onToggleDetails={onToggleDetails}
        isExpanded={isExpanded}
      />
    </div>
    {isExpanded && <BookingCardDetails booking={booking} />}
  </div>
);

const SearchFilterBar = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  totalBookings,
}) => {
  const availableStatuses = ['pending', 'upcoming', 'active', 'completed', 'cancelled'];
  return (
  <div className={BookingPageStyles.searchFilterContainer}>
    <div className={BookingPageStyles.searchFilterGrid}>
      <div>
        <label className={BookingPageStyles.filterLabel}>Search Bookings</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by customer, car, or email..."
            value={searchTerm}
            onChange={onSearchChange}
            className={BookingPageStyles.filterInput}
          />
          <div className={BookingPageStyles.filterIconContainer}>
            <FaSearch />
          </div>
        </div>
      </div>

      <div>
        <label className={BookingPageStyles.filterLabel}>
          Filter by Status
        </label>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={onStatusChange}
            className={BookingPageStyles.filterInput}
          >
            <option value="all">All Statuses</option>
            {availableStatuses.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
          </select>
          <div className={BookingPageStyles.filterIconContainer}>
            <FaFilter />
          </div>
        </div>
      </div>

      <div className={BookingPageStyles.totalBookingsContainer}>
        <div className="text-center">
          <div className={BookingPageStyles.totalBookingsLabel}>
            Total Bookings
          </div>
          <div className={BookingPageStyles.totalBookingsValue}>
            {totalBookings}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

const NoBookingsView = ({ onResetFilter }) => (
  <div className={BookingPageStyles.noBookingsContainer}>
    <div className={BookingPageStyles.noBookingsIconContainer}>
      <div className={BookingPageStyles.noBookingsIcon}>
        <FaSearch className={BookingPageStyles.noBookingsIconSvg} />
      </div>
    </div>
    <h3 className={BookingPageStyles.noBookingsTitle}>No Bookings Found</h3>
    <p className={BookingPageStyles.noBookingsText}>
      Try adjusting your search or filter criteria.
    </p>

    <button
      onClick={onResetFilter}
      className={BookingPageStyles.noBookingsButton}
    >
      <FaSync className=" mr-2" /> Reset Filter
    </button>
  </div>
);

const BackgroundGradient = () => (
  <div className={BookingPageStyles.fixedBackground}>
    <div className={BookingPageStyles.gradientBlob1}></div>
    <div className={BookingPageStyles.gradientBlob2}></div>
    <div className={BookingPageStyles.gradientBlob3}></div>
  </div>
);

const PageHeader = () => (
  <div className={BookingPageStyles.headerContainer}>
    <div className={BookingPageStyles.headerDivider}>
      <div className={BookingPageStyles.headerDividerLine}></div>
    </div>
    <h1 className={BookingPageStyles.title}>
      <span className={BookingPageStyles.titleGradient}>Booking Dashboard</span>
    </h1>
    <p className={BookingPageStyles.subtitle}>
      Manage all bookings with detailed information and status updates.
    </p>
  </div>
);

const Booking = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [extendingBooking, setExtendingBooking] = useState(null);
  const [extendDate, setExtendDate] = useState("");
  const [isExtendingLoading, setIsExtendingLoading] = useState(false);
  const [highlightedKeys, setHighlightedKeys] = useState({});

  const prevBookingStatusRef = useRef({});
  const highlightTimeoutsRef = useRef({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      Object.values(highlightTimeoutsRef.current).forEach((timeout) =>
        clearTimeout(timeout),
      );
    };
  }, []);

  //FETCH BOOKING FROM SERVER
  const fetchBookings = useCallback(async () => {
    try {
      // Add cache-busting param 'v' to ensure fresh data is always fetched
      const res = await api.get("/api/bookings", { params: { limit: 200, v: new Date().getTime() } });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.bookings || [];
      const mapped = raw.map((b, i) => {
        const id = b._id || b.id || `local-${i + 1}`;
        const carInfo = extractCarInfo(b);
        const details = normalizeDetails(b.details || {}, carInfo);
        const pickupDate = b.pickupDate || b.pickup || b.startDate || "";
        const returnDate = b.returnDate || b.return || b.endDate || "";

        let status = b.status || "pending";

        // Only recalculate status if paymentStatus is explicitly 'paid'.
        // This prevents incorrectly marking legacy paid bookings (with no paymentStatus field) as 'pending'.
        if (b.paymentStatus === 'paid' && status !== 'cancelled') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const pickupDay = pickupDate ? new Date(pickupDate) : null;
          if (pickupDay && !isNaN(pickupDay)) pickupDay.setHours(0, 0, 0, 0);

          const returnDay = returnDate ? new Date(returnDate) : null;
          if (returnDay && !isNaN(returnDay)) returnDay.setHours(0, 0, 0, 0);

          if (returnDay && returnDay < today) {
            status = 'completed';
          } else if (pickupDay && pickupDay > today) {
            status = 'upcoming';
          } else if (pickupDay && returnDay && pickupDay <= today && returnDay >= today) {
            status = 'active';
          }
        }

        const key = `${carInfo.title || ""}::${pickupDate}::${returnDate}`;

        return {
          key,
          id: String(b._id),
          _id: b._id || b.id || null,
          customer: b.customer || b.customerName || "",
          email: b.email || "",
          phone: b.phone || "",
          car: carInfo.title || "",
          carImage: carInfo.image || "",
          pickupDate: pickupDate,
          returnDate: returnDate,
          bookingDate: b.bookingDate || b.createdAt || "",
          status: status,
          amount: b.amountPKR ?? b.amount ?? b.total ?? 0,
          details,
          // GPS system disabled
          // gpsEnabled: Boolean(b?.car?.gpsEnabled),
          // gpsVehicleId: String(b?.car?.gpsVehicleId || ""),
          // onTrack: (gpsVehicleId) => {
          //   if (!gpsVehicleId) return;
          //   navigate(`/live-tracking?vehicleId=${encodeURIComponent(gpsVehicleId)}`);
          // },
          address: {
            street:
              (b.address && (b.address.street || b.address.addressLine)) || "",
            city: (b.address && (b.address.city || "")) || "",
            state: (b.address && (b.address.state || "")) || "",
            zipCode:
              (b.address && (b.address.zipCode || b.address.postalCode)) || "",
          },
          _updatedAt: new Date(b.updatedAt || b.createdAt || Date.now()).getTime(),
        };
      });

      const deduped = Object.values(
        mapped.reduce((acc, booking) => {
          const existing = acc[booking.key];
          if (!existing) {
            acc[booking.key] = booking;
            return acc;
          }
          // Prefer the most recently updated booking (payment complete versions win)
          if ((booking._updatedAt || 0) >= (existing._updatedAt || 0)) {
            acc[booking.key] = booking;
          }
          return acc;
        }, {}),
      );

      const sorted = deduped.sort((a, b) => (b._updatedAt || 0) - (a._updatedAt || 0));

      // Highlight bookings that transitioned from "pending" -> paid/active/upcoming
      const newlyHighlighted = {};
      sorted.forEach((booking) => {
        const prev = prevBookingStatusRef.current[booking.key];
        if (prev?.status === "pending" && booking.status !== "pending") {
          newlyHighlighted[booking.key] = true;

          if (highlightTimeoutsRef.current[booking.key]) {
            clearTimeout(highlightTimeoutsRef.current[booking.key]);
          }
          highlightTimeoutsRef.current[booking.key] = setTimeout(() => {
            if (!isMountedRef.current) return;
            setHighlightedKeys((prevKeys) => {
              const next = { ...prevKeys };
              delete next[booking.key];
              return next;
            });
            delete highlightTimeoutsRef.current[booking.key];
          }, 3800);
        }
      });

      setHighlightedKeys((prev) => ({ ...prev, ...newlyHighlighted }));
      prevBookingStatusRef.current = sorted.reduce((acc, booking) => {
        acc[booking.key] = { status: booking.status };
        return acc;
      }, {});

      setBookings(sorted);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      toast.error("Failed to load bookings from server.");
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    const q = (searchTerm || "").toLowerCase().trim();
    const stringForSearch = (v) =>
      v === null || v === undefined ? "" : String(v).toLowerCase();

    return bookings.filter((b) => {
      const matchesSearch =
        !q ||
        stringForSearch(b.customer).includes(q) ||
        stringForSearch(b.car).includes(q) ||
        stringForSearch(b.email).includes(q);
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  // UPDATE STATUS
  const updateStatus = async (id) => {
    try {
      const booking = bookings.find((b) => b.id === id || b._id === id);
      if (!booking || !booking._id) {
        setEditingStatus(null);
        setNewStatus("");
        return;
      }

      if (!newStatus) {
        toast.warn("Please select a status before saving.");
        return;
      }
      await api.patch(`/api/bookings/${booking._id}/status`, {
        status: newStatus,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status: newStatus,
              }
            : b,
        ),
      );

      toast.success("Booking status updated");

      const key = `${booking.car}::${booking.pickupDate}::${booking.returnDate}`;
      if (booking.status === "pending" && newStatus !== "pending") {
        setHighlightedKeys((prev) => ({ ...prev, [key]: true }));
        if (highlightTimeoutsRef.current[key]) {
          clearTimeout(highlightTimeoutsRef.current[key]);
        }
        highlightTimeoutsRef.current[key] = setTimeout(() => {
          if (!isMountedRef.current) return;
          setHighlightedKeys((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          delete highlightTimeoutsRef.current[key];
        }, 3800);
      }

      prevBookingStatusRef.current[key] = { status: newStatus };

      setEditingStatus(null);
      setNewStatus("");
    } catch (err) {
      console.error("Failed to update status:", err);
      const msg = err.response?.data?.message || "Failed to update booking status";
      toast.error(msg);
    }
  };

  const handleToggleDetails = (id) =>
    setExpandedBooking(expandedBooking === id ? null : id);
  const handleEditStatus = (id, currentStatus) => {
    setEditingStatus(id);
    setNewStatus(currentStatus);
  };
  const handleCancelEdit = () => {
    setEditingStatus(null);
    setNewStatus("");
  };

  const handleStartExtend = (booking) => {
    setExtendingBooking(booking.id);
    const defaultDate = addDaysToInputDate(booking.returnDate, 1);
    setExtendDate(defaultDate || toInputDate(booking.returnDate));
  };

  const handleCancelExtend = () => {
    setExtendingBooking(null);
    setExtendDate("");
  };

  const handleSaveExtend = async (booking) => {
    if (!booking?._id) {
      toast.error("Invalid booking selected.");
      return;
    }

    if (!extendDate) {
      toast.error("Please select a new return date.");
      return;
    }

    const currentReturn = new Date(booking.returnDate);
    const nextReturn = new Date(`${extendDate}T00:00:00`);

    if (Number.isNaN(currentReturn.getTime()) || Number.isNaN(nextReturn.getTime())) {
      toast.error("Invalid date selected.");
      return;
    }

    currentReturn.setHours(0, 0, 0, 0);
    nextReturn.setHours(0, 0, 0, 0);

    if (nextReturn <= currentReturn) {
      toast.error("New return date must be after current return date.");
      return;
    }

    try {
      setIsExtendingLoading(true);
      await api.put(`/api/bookings/${booking._id}`, { returnDate: extendDate });
      toast.success("Booking return date extended.");
      handleCancelExtend();
      await fetchBookings();
    } catch (err) {
      console.error("Failed to extend booking:", err);
      const msg = err.response?.data?.message || "Failed to extend booking date";
      toast.error(msg);
    } finally {
      setIsExtendingLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  return (
    <div className={BookingPageStyles.pageContainer}>
      <ToastContainer position="top-right" />
      <BackgroundGradient />
      <PageHeader />

      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        statusFilter={statusFilter}
        onStatusChange={(e) => setStatusFilter(e.target.value)}
        totalBookings={bookings.length}
      />

      <div className=" space-y-4">
        {filteredBookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            isHighlighted={Boolean(highlightedKeys[booking.key])}
            isExpanded={expandedBooking === booking.id}
            isEditing={editingStatus === booking.id}
            newStatus={newStatus}
            onToggleDetails={() => handleToggleDetails(booking.id)}
            onEditStatus={(e) => {
              e.stopPropagation();
              handleEditStatus(booking.id, booking.status);
            }}
            onStatusChange={(e) => setNewStatus(e.target.value)}
            onSaveStatus={(e) => {
              e.stopPropagation();
              updateStatus(booking.id);
            }}
            onCancelEdit={(e) => {
              e.stopPropagation();
              handleCancelEdit();
            }}
            onStartExtend={(e) => {
              e.stopPropagation();
              handleStartExtend(booking);
            }}
            onSaveExtend={(e) => {
              e.stopPropagation();
              handleSaveExtend(booking);
            }}
            onCancelExtend={(e) => {
              e.stopPropagation();
              handleCancelExtend();
            }}
            onExtendDateChange={(e) => setExtendDate(e.target.value)}
            extendDate={extendingBooking === booking.id ? extendDate : ""}
            isExtending={extendingBooking === booking.id}
            isExtendingLoading={isExtendingLoading && extendingBooking === booking.id}
          />
        ))}

        {filteredBookings.length === 0 && (
            <NoBookingsView onResetFilter={handleResetFilters} />
        )}
      </div>
    </div>
  );
};

export default Booking;
