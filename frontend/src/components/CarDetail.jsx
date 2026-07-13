import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  FaUserFriends,
  FaGasPump,
  FaTachometerAlt,
  FaCheckCircle,
  FaCalendarAlt,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaArrowLeft,
  FaCreditCard,
  FaMapMarkerAlt,
  FaCity,
  FaGlobeAsia,
  FaMapPin,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import carsData from "../assets/carsData";
import { carDetailStyles } from "../assets/dummyStyles";
import BookingConfirmationReceipt from "./BookingConfirmationReceipt";

const API_BASE = "http://localhost:5000";
const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

const todayISO = () => {
  const date = new Date();
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
};

const toIsoDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const subtractDays = (date, days) => addDays(date, -days);

const buildImageSrc = (image) => {
  if (!image) return `${API_BASE}/uploads/default-car.png`;
  if (Array.isArray(image)) image = image[0];
  if (!image || typeof image !== "string")
    return `${API_BASE}/uploads/default-car.png`;
  const t = image.trim();
  if (!t) return `${API_BASE}/uploads/default-car.png`;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/")) return `${API_BASE}${t}`;
  return `${API_BASE}/uploads/${t}`;
}; //build image and store in uploads folder

const handleImageError = (
  e,
  fallback = `${API_BASE}/uploads/default-car.png`,
) => {
  const img = e?.target;
  if (!img) return;
  img.onerror = null;
  img.src = fallback;
  img.onerror = () => {
    img.onerror = null;
    img.src = "https://via.placeholder.com/800x500.png?text=No+Image";
  };
  img.alt = img.alt || "Image not available";
  img.style.objectFit = img.style.objectFit || "cover";
};

const calculateDays = (from, to) => {
  if (!from || !to) return 1;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const days =
    Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
};

const CarDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [car, setCar] = useState(() => location.state?.car || null);
  const [loadingCar, setLoadingCar] = useState(false);
  const [carError, setCarError] = useState("");
  const [currentImage, setCurrentImage] = useState(0);
  const [formData, setFormData] = useState(() => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      pickupDate: "",
      returnDate: "",
      pickupLocation: "",
      name: savedUser.name || "",
      email: savedUser.email || "",
      phone: savedUser.phone || "",
      city: savedUser.city || "",
      state: savedUser.state || "",
      zipCode: savedUser.zipCode || "",
    };
  });
  const [activeField, setActiveField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inlineConfirmedBooking, setInlineConfirmedBooking] = useState(null);
  const fetchControllerRef = useRef(null);
  const submitControllerRef = useRef(null);
  const [today, setToday] = useState(todayISO());

  const getPaidBookingRanges = () => {
    if (!Array.isArray(car.bookings)) return [];
    return car.bookings
      .map((b) => {
        const pickup = b.pickupDate || b.startDate || b.start || b.from;
        const ret = b.returnDate || b.endDate || b.end || b.to;
        if (!pickup || !ret) return null;
        return {
          start: new Date(pickup),
          end: new Date(ret),
          status: String(b.status || "").toLowerCase(),
          paymentStatus: String(b.paymentStatus || "").toLowerCase(),
        };
      })
      .filter(Boolean)
      .filter((r) => r.paymentStatus === "paid")
      .filter((r) => r.start <= r.end)
      .sort((a, b) => a.start - b.start);
  };

  const paidRanges = useMemo(() => getPaidBookingRanges(), [car.bookings]);

  const getCurrentBooking = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return paidRanges.find((r) => {
      const start = new Date(r.start);
      const end = new Date(r.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return start <= now && now <= end;
    });
  };

  const currentBooking = useMemo(() => getCurrentBooking(), [paidRanges]);

  const getNextBooking = (fromDate) => {
    const from = fromDate ? new Date(fromDate) : new Date();
    from.setHours(0, 0, 0, 0);
    return paidRanges.find((r) => {
      const start = new Date(r.start);
      start.setHours(0, 0, 0, 0);
      return start > from;
    });
  };

  const nextBookingFromToday = useMemo(() => getNextBooking(), [paidRanges]);

  useEffect(() => {
    const raw = localStorage.getItem("latestConfirmedBooking");
    if (!raw) {
      setInlineConfirmedBooking(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const bookingCarId = parsed?.car?.id || parsed?.car?._id;
      const currentCarId = car?._id || id;
      if (bookingCarId && currentCarId && String(bookingCarId) === String(currentCarId)) {
        setInlineConfirmedBooking(parsed);
      } else {
        setInlineConfirmedBooking(null);
      }
    } catch {
      setInlineConfirmedBooking(null);
    }
  }, [car?._id, id]);

  const pickupMin = currentBooking
    ? toIsoDate(addDays(currentBooking.end, 1))
    : today;

  const pickupMax = nextBookingFromToday
    ? toIsoDate(subtractDays(nextBookingFromToday.start, 1))
    : undefined;

  const returnMin = formData.pickupDate || pickupMin;

  const returnMax = nextBookingFromToday
    ? toIsoDate(subtractDays(nextBookingFromToday.start, 1))
    : undefined;

  useEffect(() => setToday(todayISO()), []);

  useEffect(() => {
    if (car) {
      setCurrentImage(0);
      return;
    }

    const local = carsData.find((c) => String(c.id) === String(id));
    if (local) {
      setCar(local);
      setCurrentImage(0);
      return;
    }

    const controller = new AbortController();
    fetchControllerRef.current = controller;
    (async () => {
      setLoadingCar(true);
      setCarError("");
      try {
        const res = await api.get(`/api/cars/${id}`, {
          signal: controller.signal,
        });
        const payload = res.data?.data ?? res.data ?? null;
        if (payload) setCar(payload);
        else setCarError("Car not found.");
      } catch (err) {
        const canceled =
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError" ||
          err?.message === "canceled";
        if (!canceled) {
          console.error("Failed to fetch car:", err);
          setCarError(
            err?.response?.data?.message || err.message || "Failed to load car",
          );
        }
      } finally {
        setLoadingCar(false);
      }
    })();

    return () => {
      try {
        controller.abort();
      } catch {}
      fetchControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!car && loadingCar)
    return <div className="p-6 text-gray-900">Loading car...</div>;
  if (!car && carError)
    return <div className="p-6 text-red-400">{carError}</div>;
  if (!car) return <div className="p-6 text-gray-900">Car not found.</div>;
  //get car by id as a particular car to book or to fetch its images, many more details

  const carImages = [
    ...(Array.isArray(car.images) ? car.images : []),
    ...(car.image ? (Array.isArray(car.image) ? car.image : [car.image]) : []),
  ].filter(Boolean);

  const price = Number(car.price ?? car.dailyRate ?? 0) || 0;
  const days = calculateDays(formData.pickupDate, formData.returnDate);
  const calculateTotal = () => days * price;

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "pickupDate") {
      // Clamp to available range
      let newValue = value;
      if (pickupMin && newValue < pickupMin) {
        toast.error(`Pickup date cannot be before ${pickupMin}`);
        newValue = pickupMin;
      }
      if (pickupMax && newValue > pickupMax) {
        toast.error(`Pickup date must be on or before ${pickupMax}`);
        newValue = pickupMax;
      }

      setFormData((f) => ({
        ...f,
        pickupDate: newValue,
        returnDate: f.returnDate && f.returnDate < newValue ? "" : f.returnDate,
      }));
      return;
    }

    if (name === "returnDate") {
      let newValue = value;
      if (returnMin && newValue < returnMin) {
        toast.error(`Return date must be on or after ${returnMin}`);
        newValue = returnMin;
      }
      if (returnMax && newValue > returnMax) {
        toast.error(`Return date must be on or before ${returnMax}`);
        newValue = returnMax;
      }
      setFormData((f) => ({ ...f, returnDate: newValue }));
      return;
    }

    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.pickupDate || !formData.returnDate) {
      toast.error("Please select pickup and return dates.");
      return;
    }

    if (pickupMin && formData.pickupDate < pickupMin) {
      toast.error(`Pickup date must be on or after ${pickupMin}`);
      return;
    }
    if (pickupMax && formData.pickupDate > pickupMax) {
      toast.error(`Pickup date must be on or before ${pickupMax}`);
      return;
    }

    if (returnMin && formData.returnDate < returnMin) {
      toast.error(`Return date must be on or after ${returnMin}`);
      return;
    }
    if (returnMax && formData.returnDate > returnMax) {
      toast.error(`Return date must be on or before ${returnMax}`);
      return;
    }

    if (new Date(formData.returnDate) < new Date(formData.pickupDate)) {
      toast.error("Return date must be the same or after pickup date.");
      return;
    }

    if (!car._id) {
      toast.error("Invalid car. Please reload from server.");
      return;
    }

    setSubmitting(true);
    if (submitControllerRef.current) {
      try {
        submitControllerRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    submitControllerRef.current = controller;

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.id || user?._id;
      const token = localStorage.getItem("token");

      if (!userId) {
        toast.error("Please log in to book a car.");
        setSubmitting(false);
        return;
      }

      // Format phone number for Twilio (E.164)
      // let formattedPhone = formData.phone.trim().replace(/[^0-9+]/g, "");
      // if (formattedPhone.startsWith("00")) {
      //   formattedPhone = "+" + formattedPhone.slice(2);
      // } else if (formattedPhone.startsWith("0")) {
      //   formattedPhone = "+92" + formattedPhone.slice(1);
      // } else if (formattedPhone.startsWith("92")) {
      //   formattedPhone = "+" + formattedPhone;
      // } else if (!formattedPhone.startsWith("+") && formattedPhone.length > 0) {
      //   formattedPhone = "+92" + formattedPhone;
      // }

      const payload = {
        userId,
        customer: formData.name,
        email: formData.email,
        phone: formData.phone,
        car: {
          id: car._id,
          name: car.name ?? `${car.make ?? ""} ${car.model ?? ""}`.trim(),
        },
        pickupDate: formData.pickupDate,
        returnDate: formData.returnDate,
        amount: calculateTotal(),
        details: { pickupLocation: formData.pickupLocation },
        address: {
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        carImage: car.image
          ? buildImageSrc(Array.isArray(car.image) ? car.image[0] : car.image)
          : undefined,
      };
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await api.post(
        `/api/payments/create-checkout-session`,
        payload,
        {
          headers,
          signal: controller.signal,
        },
      );

      if (res?.data?.url) {
        toast.success("Redirecting to payment...", {
          position: "top-right",
          autoClose: 1200,
        });
        window.location.href = res.data.url;
        return;
      }

      toast.success(
        "Booking created. Please complete payment from bookings page.",
        { position: "top-right", autoClose: 2000 },
      );
      setFormData({
        pickupDate: "",
        returnDate: "",
        pickupLocation: "",
        name: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        zipCode: "",
      });
      navigate("/bookings");
    } catch (err) {
      const canceled =
        err?.code === "ERR_CANCELED" ||
        err?.name === "CanceledError" ||
        err?.message === "canceled";
      if (canceled) return;
      console.error("Booking error:", err);
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data ||
        err.message ||
        "Booking failed";
      toast.error(String(serverMessage));
    } finally {
      setSubmitting(false);
    }
  };

  const transmissionLabel = car.transmission
    ? String(car.transmission).toLowerCase()
    : "standard";

  //below is the UI part
  const bookingNotice = (() => {
    if (currentBooking) {
      return `This car is currently booked until ${formatDate(
        currentBooking.end.toISOString(),
      )}. It will become available on ${formatDate(
        addDays(currentBooking.end, 1).toISOString(),
      )}.`;
    }

    if (nextBookingFromToday) {
      const until = subtractDays(nextBookingFromToday.start, 1);
      return `This car is reserved from ${formatDate(
        nextBookingFromToday.start.toISOString(),
      )} to ${formatDate(nextBookingFromToday.end.toISOString())}.
      You can book it until ${formatDate(until.toISOString())}.`;
    }

    return null;
  })();

  return (
    <div className={carDetailStyles.pageContainer}>
      <div className={carDetailStyles.contentContainer}>
        <ToastContainer />
        {inlineConfirmedBooking && (
          <div className="fixed left-1/2 top-24 z-50 w-[92%] max-w-md -translate-x-1/2">
            <BookingConfirmationReceipt
              booking={inlineConfirmedBooking}
              compact
              onClose={() => {
                localStorage.removeItem("latestConfirmedBooking");
                setInlineConfirmedBooking(null);
              }}
            />
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className={carDetailStyles.backButton}
        >
          <FaArrowLeft className={carDetailStyles.backButtonIcon} />
        </button>

        <div className={carDetailStyles.mainLayout}>
          <div className={carDetailStyles.leftColumn}>
            <div className={carDetailStyles.imageCarousel}>
              <img
                src={buildImageSrc(carImages[currentImage] ?? car.image)}
                alt={car.name}
                className={carDetailStyles.carImage}
                onError={(e) => handleImageError(e)}
              />
              {(carImages.length > 0 || (car.image && car.image !== "")) && (
                <div className={carDetailStyles.carouselIndicators}>
                  {(carImages.length > 0 ? carImages : [car.image]).map(
                    (_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        aria-label={`Show image ${idx + 1}`}
                        className={carDetailStyles.carouselIndicator(
                          idx === currentImage,
                        )}
                      />
                    ),
                  )}
                </div>
              )}
            </div>

            <h1 className={carDetailStyles.carName}>{car.make}</h1>
            <p className={carDetailStyles.carPrice}>
              Rs{price}{" "}
              <span className={carDetailStyles.pricePerDay}>/ day</span>
            </p>

            <div className={carDetailStyles.specsGrid}>
              {[
                {
                  Icon: FaUserFriends,
                  label: "Seats",
                  value: car.seats ?? "—",
                  color: "text-orange-400",
                },
                {
                  Icon: FaGasPump,
                  label: "Fuel",
                  value: car.fuel ?? car.fuelType ?? "—",
                  color: "text-green-400",
                },
                {
                  Icon: FaTachometerAlt,
                  label: "Mileage",
                  value: car.mileage ? `${car.mileage} kmpl` : "—",
                  color: "text-yellow-400",
                },
                {
                  Icon: FaCheckCircle,
                  label: "Transmission",
                  value: transmissionLabel,
                  color: "text-purple-400",
                },
              ].map((spec, i) => (
                <div key={i} className={carDetailStyles.specCard}>
                  <spec.Icon
                    className={`${spec.color} ${carDetailStyles.specIcon}`}
                  />
                  <p
                    className={
                      carDetailStyles.aboutText +
                      " " +
                      carDetailStyles.specLabel
                    }
                  >
                    {spec.label}
                  </p>
                  <p className={carDetailStyles.specValue}>{spec.value}</p>
                </div>
              ))}
            </div>

            <div className={carDetailStyles.aboutSection}>
              <h2 className={carDetailStyles.aboutTitle}>About this car</h2>
              <p className={carDetailStyles.aboutText}>
                Experience luxury in the {car.name}. With its{" "}
                {transmissionLabel} transmission and seating for{" "}
                {car.seats ?? "—"}, every journey is exceptional.
              </p>
              <p className={carDetailStyles.aboutText}>
                {car.description ??
                  "This car combines performance and comfort for an unforgettable drive."}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-400 mr-2 text-sm" />
                  <span className="text-gray-600 text-sm">
                    Free cancellation
                  </span>
                </div>
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-400 mr-2 text-sm" />
                  <span className="text-gray-600 text-sm">
                    24/7 Roadside assistance
                  </span>
                </div>
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-400 mr-2 text-sm" />
                  <span className="text-gray-600 text-sm">
                    Unlimited mileage
                  </span>
                </div>
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-400 mr-2 text-sm" />
                  <span className="text-gray-600 text-sm">
                    Collision damage waiver
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* {Right column} */}
          <div className={carDetailStyles.rightColumn}>
            <div className={carDetailStyles.bookingCard}>
              <h2 className={carDetailStyles.bookingTitle}>
                Reserve{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-orange-500">
                  Your Drive
                </span>
              </h2>
              <p className={carDetailStyles.bookingSubtitle}>
                Fast · Secure · Easy
              </p>

              <form onSubmit={handleSubmit} className={carDetailStyles.form}>
                {bookingNotice && (
                  <div className="mb-4 rounded border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    {bookingNotice}
                  </div>
                )}
                <div className={carDetailStyles.grid2}>
                  <div className="flex flex-col">
                    <label
                      htmlFor="pickupDate"
                      className={carDetailStyles.formLabel}
                    >
                      Pickup Date
                    </label>
                    <div
                      className={carDetailStyles.inputContainer(
                        activeField === "pickupDate",
                      )}
                    >
                      <div className={carDetailStyles.inputIcon}>
                        <FaCalendarAlt />
                      </div>
                      <input
                        id="pickupDate"
                        type="date"
                        name="pickupDate"
                        min={pickupMin}
                        max={pickupMax}
                        value={formData.pickupDate}
                        onChange={handleInputChange}
                        onFocus={() => setActiveField("pickupDate")}
                        onBlur={() => setActiveField(null)}
                        required
                        className={`${carDetailStyles.inputField} scheme-dark`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label
                      htmlFor="returnDate"
                      className={carDetailStyles.formLabel}
                    >
                      Return Date
                    </label>
                    <div
                      className={carDetailStyles.inputContainer(
                        activeField === "returnDate",
                      )}
                    >
                      <div className={carDetailStyles.inputIcon}>
                        <FaCalendarAlt />
                      </div>
                      <input
                        id="returnDate"
                        type="date"
                        name="returnDate"
                        min={returnMin}
                        max={returnMax}
                        value={formData.returnDate}
                        onChange={handleInputChange}
                        onFocus={() => setActiveField("returnDate")}
                        onBlur={() => setActiveField(null)}
                        required
                        className={`${carDetailStyles.inputField} scheme-dark`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className={carDetailStyles.formLabel}>
                    Pickup Location
                  </label>
                  <div
                    className={carDetailStyles.inputContainer(
                      activeField === "pickupLocation",
                    )}
                  >
                    <div className={carDetailStyles.inputIcon}>
                      <FaMapMarkerAlt />
                    </div>
                    <input
                      type="text"
                      name="pickupLocation"
                      placeholder="Enter pickup location"
                      value={formData.pickupLocation}
                      onChange={handleInputChange}
                      onFocus={() => setActiveField("pickupLocation")}
                      onBlur={() => setActiveField(null)}
                      required
                      className={carDetailStyles.textInputField}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className={carDetailStyles.formLabel}>Full Name</label>
                  <div
                    className={carDetailStyles.inputContainer(
                      activeField === "name",
                    )}
                  >
                    <div className={carDetailStyles.inputIcon}>
                      <FaUser />
                    </div>
                    <input
                      type="text"
                      name="name"
                      placeholder="Your full name"
                      readOnly
                      value={formData.name}
                      onChange={handleInputChange}
                      onFocus={() => setActiveField("name")}
                      onBlur={() => setActiveField(null)}
                      required
                      className={carDetailStyles.textInputField}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className={carDetailStyles.formLabel}>
                      Email Address
                    </label>
                    <div
                      className={carDetailStyles.inputContainer(
                        activeField === "email",
                      )}
                    >
                      <div className={carDetailStyles.inputIcon}>
                        <FaEnvelope />
                      </div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Your email"
                        readOnly
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => setActiveField("email")}
                        onBlur={() => setActiveField(null)}
                        required
                        className={carDetailStyles.textInputField}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className={carDetailStyles.formLabel}>
                      Phone Number
                    </label>
                    <div
                      className={carDetailStyles.inputContainer(
                        activeField === "phone",
                      )}
                    >
                      <div className={carDetailStyles.inputIcon}>
                        <FaPhone />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Your phone number"
                        value={formData.phone}
                        onChange={handleInputChange}
                        onFocus={() => setActiveField("phone")}
                        onBlur={() => setActiveField(null)}
                        required
                        className={carDetailStyles.textInputField}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className={carDetailStyles.formLabel}>City</label>
                    <div
                      className={carDetailStyles.inputContainer(
                        activeField === "city",
                      )}
                    >
                      <div className={carDetailStyles.inputIcon}>
                        <FaCity />
                      </div>
                      <input
                        type="text"
                        name="city"
                        placeholder="Your city"
                        value={formData.city}
                        onChange={handleInputChange}
                        onFocus={() => setActiveField("city")}
                        onBlur={() => setActiveField(null)}
                        required
                        className={carDetailStyles.textInputField}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className={carDetailStyles.formLabel}>State</label>
                    <div
                      className={carDetailStyles.inputContainer(
                        activeField === "state",
                      )}
                    >
                      <div className={carDetailStyles.inputIcon}>
                        <FaGlobeAsia />
                      </div>
                      <input
                        type="text"
                        name="state"
                        placeholder="Your state"
                        value={formData.state}
                        onChange={handleInputChange}
                        onFocus={() => setActiveField("state")}
                        onBlur={() => setActiveField(null)}
                        required
                        className={carDetailStyles.textInputField}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className={carDetailStyles.formLabel}>
                      ZIP Code
                    </label>
                    <div
                      className={carDetailStyles.inputContainer(
                        activeField === "zipCode",
                      )}
                    >
                      <div className={carDetailStyles.inputIcon}>
                        <FaMapPin />
                      </div>
                      <input
                        type="text"
                        name="zipCode"
                        placeholder="ZIP/Postal code"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        onFocus={() => setActiveField("zipCode")}
                        onBlur={() => setActiveField(null)}
                        required
                        className={carDetailStyles.textInputField}
                      />
                    </div>
                  </div>
                </div>

                {/* Price Calculation */}
                <div className={carDetailStyles.priceBreakdown}>
                  <div className={carDetailStyles.priceRow}>
                    <span>Rate/day</span>
                    <span>Rs{price}</span>
                  </div>
                  {formData.pickupDate && formData.returnDate && (
                    <div className={carDetailStyles.priceRow}>
                      <span>Days</span>
                      <span>{days}</span>
                    </div>
                  )}
                  <div className={carDetailStyles.totalRow}>
                    <span>Total</span>
                    <span>Rs{calculateTotal()}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={carDetailStyles.submitButton}
                >
                  <FaCreditCard className="mr-2 group-hover:scale-110 transition-transform" />
                  <span>
                    {submitting ? "Confirming..." : "Confirm Booking"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDetail;
