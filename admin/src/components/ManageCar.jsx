import React, { useCallback, useEffect, useMemo, useState } from "react";
import { styles } from "../assets/dummyStyles";
import {
  FaCar,
  FaCog,
  FaEdit,
  FaFilter,
  FaGasPump,
  FaTachometerAlt,
  FaTrash,
  FaUser,
  FaTimes,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";
import { api } from "../api";
import { toast, ToastContainer } from "react-toastify";

const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:5000";

// Utility functions
const makeImageUrl = (img) => {
  if (!img) return "";
  const s = String(img).trim();
  return /^https?:\/\//i.test(s)
    ? s
    : `${BASE}/uploads/${s.replace(/^\/+/, "").replace(/^uploads\//, "")}`;
};

const sanitizeImageForBackend = (img) => {
  if (!img) return "";
  let s = String(img).trim();
  if (/^https?:\/\//i.test(s)) {
    const idx = s.lastIndexOf("/uploads/");
    s =
      idx !== -1
        ? s.slice(idx + "/uploads/".length)
        : s.slice(s.lastIndexOf("/") + 1);
  }
  return s.replace(/^\/+/, "").replace(/^uploads\//, "");
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const computeEffectiveAvailability = (car) => {
  const today = new Date();

  if (Array.isArray(car.bookings) && car.bookings.length) {
    const overlapping = car.bookings
      .map((b) => {
        const pickup = b.pickupDate ?? b.startDate ?? b.start ?? b.from;
        const ret = b.returnDate ?? b.endDate ?? b.end ?? b.to;
        if (!pickup || !ret) return null;
        return { pickup: new Date(pickup), return: new Date(ret) };
      })
      .filter(Boolean)
      .filter(
        (b) =>
          startOfDay(b.pickup) <= startOfDay(today) &&
          startOfDay(today) <= startOfDay(b.return)
      );

    if (overlapping.length) {
      overlapping.sort((a, b) => b.return - a.return);
      return {
        state: "booked",
        until: overlapping[0].return.toISOString(),
      };
    }
  }
  return { state: "available" };
};

//STORE IN DB
const buildSafeCar = (raw = {}, idx = 0) => {
  const _id = raw._id || raw.id || null;
  return {
    _id,
    id: _id || raw.id || raw.localId || `local-${idx + 1}`,
    make: raw.make || "",
    model: raw.model || "",
    year: raw.year ?? "",
    category: raw.category || "Sedan",
    seats: raw.seats ?? 4,
    transmission: raw.transmission || "Automatic",
    fuelType: raw.fuelType || raw.fuel || "Gasoline",
    mileage: raw.mileage ?? 0,
    dailyRate: raw.dailyRate ?? raw.price ?? 0,
    status: raw.status || "available",
    // gpsEnabled: Boolean(raw.gpsEnabled),
    // gpsVehicleId: raw.gpsVehicleId || "",
    _rawImage: raw.image ?? raw._rawImage ?? "",
    image: raw.image
      ? makeImageUrl(raw.image)
      : raw._rawImage
        ? makeImageUrl(raw._rawImage)
        : "",
    bookings: Array.isArray(raw.bookings) ? raw.bookings : [],
  };
};

// SUB - COMPONENTS
const StatCard = ({ title, value, icon: Icon, className = "" }) => (
  <div
    className={`${styles.gradientOrange} ${styles.rounded2xl} ${styles.statCard} ${styles.borderGray} ${styles.borderHoverOrange} ${className}`}
  >
    <div className=" flex items-start justify-between">
      <div>
        <h3 className={`${styles.textGray} text-sm font-medium mb-2`}>
          {title}
        </h3>
        <p className=" text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
        <Icon className={`${styles.textOrange} text-xl`} />
      </div>
    </div>
  </div>
);

const CarCard = ({ car, onEdit, onDelete, onViewCalendar }) => {
  const getStatusStyle = (status) => {
    const styles = {
      available: "bg-green-900/30 text-green-400",
      rented: "bg-yellow-900/30 text-yellow-400",
      booked: "bg-red-900/30 text-red-400",
      maintenance: "bg-red-900/30 text-red-400",
    };
    return styles[status] || "bg-gray-200 text-gray-700";
  };

  const availability = computeEffectiveAvailability(car);
  const displayStatus =
    availability.state === "booked" ? "booked" : car.status;

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={`${styles.gradientGray} ${styles.rounded2xl} ${styles.carCard} ${styles.borderGray} ${styles.borderHoverOrange}`}
    >
      <div className="relative">
        <img src={car.image} alt={car.model} className={styles.carImage} />
        <div className="absolute top-4 right-4">
          <span
            className={`${styles.statusBadge} ${getStatusStyle(displayStatus)}`}
          >
            {displayStatus === "booked"
              ? `Booked until ${formatDate(availability.until)}`
              : displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </span>
        </div>
      </div>

      <div className=" p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {car.make} {car.model}
            </h3>
            <p className={styles.textGray}>{car.year}</p>
          </div>

          <div className="text-2xl font-bold text-orange-500">
            Rs{car.dailyRate}
            <span className=" text-sm text-gray-400 font-normal">/day</span>
          </div>
        </div>

        <div className=" grid grid-cols-2 gap-4 mb-5">
          <div className=" flex items-center text-sm">
            <FaGasPump className={`${styles.textOrange} mr-2`} />
            <span className={styles.textGray300}>{car.fuelType}</span>
          </div>

          <div className=" flex items-center text-sm">
            <FaTachometerAlt className={`${styles.textOrange} mr-2`} />
            <span className={styles.textGray300}>
              {(car.mileage || 0).toLocaleString()} mi
            </span>
          </div>

          <div className=" flex items-center text-sm">
            <FaUser className={`${styles.textOrange} mr-2`} />
            <span className={styles.textGray300}>{car.seats} Seats</span>
          </div>

          <div className=" flex items-center text-sm">
            <FaCog className={`${styles.textOrange} mr-2`} />
            <span className={styles.textGray300}>{car.transmission}</span>
          </div>
        </div>

        <div className=" flex justify-between border-t border-gray-200 pt-4">
          <button
            onClick={() => onViewCalendar(car)}
            className={`flex items-center text-blue-400 hover:text-blue-300 transition-colors`}
          >
            <FaCalendarAlt className=" mr-1" /> Calendar
          </button>

          <button
            onClick={() => onEdit(car)}
            className={`flex items-center ${styles.textOrange} hover:text-orange-300 transition-colors`}
          >
            <FaEdit className=" mr-1" /> Edit
          </button>

          <button
            onClick={() => onDelete(car._id ?? car.id)}
            className={`flex items-center ${styles.textRed} hover:text-red-300 transition-colors`}
          >
            <FaTrash className=" mr-1" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const CalendarModal = ({ car, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isBooked = (day) => {
    const checkDate = new Date(year, month, day);
    checkDate.setHours(0, 0, 0, 0);

    if (!car.bookings || !Array.isArray(car.bookings)) return false;

    return car.bookings.some((b) => {
      const start = new Date(b.pickupDate || b.pickup || b.startDate || b.from);
      const end = new Date(b.returnDate || b.return || b.endDate || b.to);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return checkDate >= start && checkDate <= end;
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.gradientGrayToGray} ${styles.rounded2xl} ${styles.modalContainer} ${styles.borderOrange} max-w-md w-full`}>
        <div className="p-6">
          <div className="flex justify-between items-center border-b border-orange-800/30 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Booking Calendar</h2>
              <p className="text-sm text-gray-400">{car.make} {car.model}</p>
            </div>
            <button onClick={onClose} className={styles.textGray}>
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full text-orange-400"><FaChevronLeft /></button>
            <span className="text-lg font-semibold text-gray-900">{monthNames[month]} {year}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full text-orange-400"><FaChevronRight /></button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-xs font-bold text-gray-500 uppercase">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-10" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const booked = isBooked(day);
              return (
                <div key={day} className={`h-10 flex items-center justify-center rounded-md text-sm font-medium ${booked ? "bg-red-900/50 text-red-200 border border-red-700/50" : "bg-gray-50 border border-gray-200 text-gray-600"}`} title={booked ? "Booked" : "Available"}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({ car, onClose, onSubmit, onChange }) => {
  const mapToBackend = (c) => ({
    make: c.make,
    model: c.model,
    year: Number(c.year || 0),
    category: c.category || "Sedan",
    seats: Number(c.seats || 0),
    transmission: c.transmission || "Automatic",
    fuelType: c.fuelType,
    mileage: Number(c.mileage || 0),
    dailyRate: Number(c.dailyRate || 0),
    status: c.status || "available",
    image: sanitizeImageForBackend(c.image || c._rawImage || ""),
    // gpsEnabled: Boolean(c.gpsEnabled),
    // gpsVehicleId: String(c.gpsVehicleId || ""),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!car?.make || !car?.model)
      return toast.error("Make and Model required.");
    onSubmit(mapToBackend(car));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onChange({
      ...car,
      [name]: ["year", "dailyRate", "mileage", "seats"].includes(name)
        ? value === ""
          ? ""
          : Number(value)
        : value,
    });
  };

  const inputField = (label, name, type = "text", options = {}) => (
    <div>
      <label className={`block ${styles.textGray} text-sm mb-1`}>{label}</label>
      {type === "select" ? (
        <select
          name={name}
          value={car[name] || ""}
          onChange={handleInputChange}
          className={styles.inputField}
          required={options.required}
        >
          {options.items?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={car[name] || ""}
          onChange={handleInputChange}
          className={styles.inputField}
          required={options.required}
          min={options.min}
          max={options.max}
          step={options.step}
        />
      )}
    </div>
  );

  return (
    <div className={styles.modalOverlay}>
      <div
        className={`${styles.gradientGrayToGray} ${styles.rounded2xl} ${styles.modalContainer} ${styles.borderOrange}`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center border-b border-orange-800/30 pb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {car._id ? `Edit: ${car.make} ${car.model}` : "Add New Car"}
            </h2>
            <button onClick={onClose} className={styles.textGray}>
              <FaTimes className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {inputField("Make", "make", "text", { required: true })}
              {inputField("Model", "model", "text", { required: true })}
              {inputField("Year", "year", "number", {
                required: true,
                min: 1900,
                max: 2099,
              })}
              {inputField("Category", "category", "select", {
                required: true,
                items: [
                  "Sedan",
                  "SUV",
                  "Sports",
                  "Coupe",
                  "Hatchback",
                  "Luxury",
                ],
              })}
              {inputField("Status", "status", "select", {
                required: true,
                items: ["available", "rented", "maintenance"],
              })}
              {inputField("Daily Rate ($)", "dailyRate", "number", {
                required: true,
                min: 1,
                step: 0.01,
              })}
              {inputField("Mileage", "mileage", "number", {
                required: true,
                min: 0,
              })}
              {inputField("Transmission", "transmission", "select", {
                required: true,
                items: ["Automatic", "Manual", "CVT"],
              })}
              {inputField("Fuel Type", "fuelType", "select", {
                required: true,
                items: ["Gasoline", "Diesel", "Hybrid", "Electric"],
              })}
            </div>

            {inputField("Number of Seats", "seats", "number", {
              required: true,
              min: 1,
              max: 12,
            })}
            {inputField("Image (filename or URL)", "image", "text", {
              required: true,
            })}

            {/* GPS system disabled
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">
                GPS Tracking (Android phone)
              </p>
              <p className="mt-1 text-xs text-gray-400">
                If enabled, the Android tracker must send this Vehicle Tracker ID as
                <code className="mx-1">vehicleId</code>.
              </p>

              <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(car.gpsEnabled)}
                  onChange={(e) =>
                    onChange({
                      ...car,
                      gpsEnabled: e.target.checked,
                      gpsVehicleId: e.target.checked ? car.gpsVehicleId : "",
                    })
                  }
                />
                Enable GPS tracking
              </label>

              <div className="mt-3">
                <label className={`block ${styles.textGray} text-sm mb-1`}>
                  Vehicle Tracker ID
                </label>
                <div className="flex gap-2">
                  <input
                    name="gpsVehicleId"
                    value={car.gpsVehicleId || ""}
                    onChange={handleInputChange}
                    type="text"
                    className={styles.inputField}
                    placeholder="Auto-generated on save if blank"
                    disabled={!car.gpsEnabled}
                    readOnly={Boolean(car.gpsVehicleId)}
                  />
                  {car.gpsEnabled && car.gpsVehicleId ? (
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => {
                        navigator.clipboard?.writeText(car.gpsVehicleId);
                        toast.success("Tracker ID copied");
                      }}
                    >
                      Copy
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            */}

            {car.image && (
              <div className="flex justify-center">
                <img
                  src={makeImageUrl(car.image)}
                  alt="preview"
                  className="h-40 object-contain rounded-md border border-orange-800/30"
                />
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={styles.buttonSecondary}
              >
                Cancel
              </button>
              <button type="submit" className={styles.buttonPrimary}>
                {car._id ? "Save Changes" : "Add Car"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  ); //MAP INPUT FIELD TO EDIT AND SEND UPDATED VERSION ON BACKEND
};

const NoCarsView = ({ onResetFilter }) => (
  <div className={`${styles.gradientGray} ${styles.noCarsContainer}`}>
    <div className=" mx-auto w-24 h-24 rounded-full bg-linear-to-br from-orange-900/30 to-amber-900/30 flex items-center justify-center mb-6">
      <div className=" bg-linear-to-br from-orange-700 to-amber-700 w-16 h-16 flex rounded-full justify-center items-center">
        <FaCar className="h-8 w-8 text-orange-300" />
      </div>
    </div>
    <h3 className="mt-4 text-xl font-medium text-gray-900 ">No cars found</h3>
    <p className=" mt-2 text-gray-400">Try adjusting your filter criteria</p>

    <button onClick={onResetFilter} className={`${styles.buttonPrimary} mt-4`}>
      Show All Cars
    </button>
  </div>
);

//FILTER
const FilterSelect = ({ value, onChange, categories }) => (
  <div
    className={`${styles.gradientGray} ${styles.rounded2xl} ${styles.filterSelect} ${styles.borderGray} ${styles.borderHoverOrange}`}
  >
    <label className={`block text-sm font-medium ${styles.textGray} mb-2`}>
      Filter by Category
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${styles.inputField} focus:outline-none focus:ring-2 focus:ring-orange-500`}
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c === "all" ? "All Categories" : c}
          </option>
        ))}
      </select>
      <div className="absolute left-1 top-4 text-orange-500">
        <FaFilter />
      </div>
    </div>
  </div>
);

const ManageCar = () => {
  const [cars, setCars] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingCar, setEditingCar] = useState(null);
  const [showEditModel, setShowEditModal] = useState(false);
  const [viewingCalendarCar, setViewingCalendarCar] = useState(null);

  const fetchCars = useCallback(async () => {
    try {
      const res = await api.get("/api/cars?limit=100");

      const raw =
        res.data?.cars ||
        res.data?.data ||
        res.data?.data || // <-- YOUR ACTUAL FIELD
        [];

      if (!Array.isArray(raw)) {
        console.error("Cars response is not array:", raw);
        return;
      }

      setCars(raw.map((c, i) => buildSafeCar(c, i)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cars");
    }
  }, []);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const categories = useMemo(
    () => [
      "all",
      ...Array.from(new Set(cars.map((c) => c.category || "Sedan"))),
    ],
    [cars],
  );

  const filterCars = useMemo(
    () =>
      cars.filter(
        (car) => categoryFilter === "all" || car.category === categoryFilter,
      ),
    [cars, categoryFilter],
  );

  const handleDelete = async (identifier) => {
    const car = cars.find((c) => c._id === identifier || c.id === identifier);
    if (!car) return toast.error("Car not found");
    if (!window.confirm("Are you sure you want to delete this car?")) return;

    try {
      if (!car._id) {
        setCars((prev) => prev.filter((p) => p.id !== car.id));
        toast.success("Car removed locally");
        return;
      }
      await api.delete(`/api/cars/${car._id}`);
      toast.success("Car deleted");
      fetchCars();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete car");
    }
  };

  const openEdit = (car) => {
    setEditingCar({
      ...car,
      image: car._rawImage ?? car.image ?? "",
      _id: car._id ?? null,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (payload) => {
    try {
      if (!editingCar._id) {
        await api.post("/api/cars", payload);
        toast.success("Car added");
      } else {
        await api.put(`/api/cars/${editingCar._id}`, payload);
        toast.success("Car updated");
      }
      setShowEditModal(false);
      setEditingCar(null);
      fetchCars();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save car");
    }
  };
  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="relative mb-8 pt-16 text-center">
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <div className="h-1 w-20 bg-linear-to-r from-orange-500 to-amber-500 rounded-full"></div>
        </div>
        <h1 className=" text-4xl font-extrabold py-4 text-gray-900 sm:text-5xl mb-3 tracking-wide">
          <span className=" text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-400">
            Fleet Management
          </span>
        </h1>
        <p className=" text-gray-400 max-w-2xl mx-auto">
          Mangage your entire fleet, track bookings, and monitor vehicle status
          in real time
        </p>
      </div>
      <div className="bg-white border border-gray-200 backdrop-blur-sm rounded-2xl p-5 mb-6 shadow-sm">
        <div className=" flex flex-col md:flex-row items-center justify-between gap-6">
          <StatCard title="Total Cars" value={cars.length} icon={FaCar} />
          <FilterSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            categories={categories}
          />
        </div>
      </div>

      <div className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filterCars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            onEdit={openEdit}
            onViewCalendar={setViewingCalendarCar}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filterCars.length === 0 && (
        <NoCarsView onResetFilter={() => setCategoryFilter("all")} />
      )}

      {showEditModel && editingCar && (
        <EditModal
          car={editingCar}
          onClose={() => {
            setShowEditModal(false);
            setEditingCar(null);
          }}
          onSubmit={handleEditSubmit}
          onChange={setEditingCar}
        />
      )}

      {viewingCalendarCar && (
        <CalendarModal
          car={viewingCalendarCar}
          onClose={() => setViewingCalendarCar(null)}
        />
      )}

      <ToastContainer theme="light" />
    </div>
  );
};

export default ManageCar;
