import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const isValidName = (value) => {
  const trimmed = String(value || "").trim();
  return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 50;
};

const isValidCityState = (value) => {
  const trimmed = String(value || "").trim();
  return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 50;
};

const isValidPakistaniPhone = (value) => {
  const normalized = String(value || "").replace(/[^0-9+]/g, "");
  const digits = normalized.replace(/^\+/, "");
  return /^92?3\d{9}$/.test(digits) || /^03\d{9}$/.test(digits);
};

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingError, setBookingError] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await axios.get(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profile = res?.data?.user ?? res?.data ?? null;
      const fallbackUser = JSON.parse(localStorage.getItem("user") || "null");
      const merged = {
        ...(fallbackUser || {}),
        ...(profile || {}),
      };

      merged.state = merged?.state || merged?.address || "";

      setUser(merged);
      setName(merged?.name || "");
      setEmail(merged?.email || "");
      setPhone(merged?.phone || "");
      setCity(merged?.city || "");
      setStateName(merged?.state || "");

      localStorage.setItem("user", JSON.stringify(merged));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setBookingError(null);

    try {
      const token = localStorage.getItem("token");
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await axios.get(`${base}/api/bookings/mybooking`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBookings(res?.data || []);
    } catch (err) {
      setBookingError(err?.response?.data?.message || "Unable to load bookings.");
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchBookings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      if (!isValidName(name)) {
        throw new Error(
          "Invalid name. Use letters and spaces only, 2-50 characters. Example: John or Mudassir."
        );
      }
      if (phone && !isValidPakistaniPhone(phone)) {
        throw new Error("Invalid phone. Use Pakistani format like 03001234567.");
      }
      if (city && !isValidCityState(city)) {
        throw new Error(
          "Invalid city. Use letters and spaces only, 2-50 characters. Example: Lahore or Karachi."
        );
      }
      if (stateName && !isValidCityState(stateName)) {
        throw new Error(
          "Invalid state. Use letters and spaces only, 2-50 characters. Example: Punjab or Sindh."
        );
      }

      const payload = { name, email, phone, city, state: stateName };
      if (password) {
        payload.currentPassword = currentPassword;
        payload.password = password;
        payload.confirmPassword = confirmPassword;
      }

      const res = await axios.put(`${base}/api/auth/me`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updated = res?.data?.user;
      setUser(updated);
      setName(updated?.name || "");
      setEmail(updated?.email || "");
      setPhone(updated?.phone || "");
      setCity(updated?.city || "");
      setStateName(updated?.state || updated?.address || "");
      setPassword("");
      setConfirmPassword("");
      localStorage.setItem("user", JSON.stringify(updated));

      toast.success("Profile updated successfully.");

      if (updated.emailVerified === false) {
        toast.info("Your email is unverified. Please check your inbox for a verification link.");
      }

      fetchBookings();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Unable to update profile.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const normalizeStatus = (booking) => {
    const now = new Date();
    const pickup = booking.pickupDate ? new Date(booking.pickupDate) : null;
    const ret = booking.returnDate ? new Date(booking.returnDate) : null;

    const isPaid = String(booking.paymentStatus || "").toLowerCase() === "paid";
    const isCancelled = String(booking.status || "").toLowerCase() === "cancelled";

    if (isCancelled) return "cancelled";
    if (!isPaid) return "pending";

    if (pickup && ret && !Number.isNaN(pickup) && !Number.isNaN(ret)) {
      const start = new Date(pickup).setHours(0, 0, 0, 0);
      const end = new Date(ret).setHours(23, 59, 59, 999);
      const nowTime = now.getTime();

      if (nowTime >= start && nowTime <= end) return "active";
      if (nowTime < start) return "upcoming";
      if (nowTime > end) return "completed";
    }

    return "active";
  };

  const getBookingKey = (booking) => {
    const carId =
      booking?.car?.id ||
      booking?.car?._id ||
      (typeof booking?.car === "string" ? booking.car : "");

    const pickup = booking.pickupDate || booking.pickup || booking.dates?.pickup;
    const ret = booking.returnDate || booking.return || booking.dates?.return;

    return `${carId}::${pickup || ""}::${ret || ""}`;
  };

  const getBookingUpdatedAt = (booking) => {
    const updated = booking.updatedAt || booking.raw?.updatedAt;
    const created = booking.createdAt || booking.raw?.createdAt;
    const time = new Date(updated || created || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const dedupeBookings = (list) => {
    const map = {};
    (Array.isArray(list) ? list : []).forEach((booking) => {
      const key = getBookingKey(booking);
      if (!key) return;

      const existing = map[key];
      if (!existing) {
        map[key] = booking;
        return;
      }

      const existingTime = getBookingUpdatedAt(existing);
      const currentTime = getBookingUpdatedAt(booking);
      if (currentTime >= existingTime) {
        map[key] = booking;
      }
    });

    return Object.values(map);
  };

  const stats = useMemo(() => {
    const deduped = dedupeBookings(bookings);
    const total = deduped.length;

    const computed = deduped.reduce(
      (agg, booking) => {
        const status = normalizeStatus(booking);
        if (status === "active") agg.active += 1;
        if (status === "upcoming") agg.upcoming += 1;
        if (status === "completed") agg.completed += 1;
        return agg;
      },
      { total, active: 0, upcoming: 0, completed: 0 },
    );

    return computed;
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-900">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto" />
          <p className="mt-4">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      <ToastContainer position="top-right" theme="light" autoClose={3000} />
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
      >
        <FaArrowLeft /> Back
      </button>

      <div className="mx-auto max-w-3xl pt-16">
        <div className="surface-card p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mt-4 mb-4">My Profile</h1>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <aside className="space-y-5">
            <div className="rounded-2xl bg-gray-50/70 p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Profile overview</h2>
              <p className="text-sm text-gray-900/70">Use this section to keep your contact info up to date.</p>

              <div className="mt-4 space-y-3 text-white/90">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-900/50">Name</p>
                  <p className="mt-1 text-base font-medium">{user?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-900/50">Email</p>
                  <p className="mt-1 text-base font-medium">{user?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-900/50">Phone</p>
                  <p className="mt-1 text-base font-medium">{user?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-900/50">City</p>
                  <p className="mt-1 text-base font-medium">{user?.city || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-900/50">State</p>
                  <p className="mt-1 text-base font-medium">{user?.state || user?.address || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-900/50">Email verified</p>
                  <p className="mt-1 text-base font-medium">{user?.emailVerified ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50/70 p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick stats</h2>
              <div className="grid gap-3">
                <div className="rounded-xl bg-gray-50/60 p-3">
                  <p className="text-xs text-gray-900/70">Total bookings</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl bg-linear-to-r from-emerald-500/20 to-emerald-500/5 p-3">
                  <p className="text-xs text-gray-900/70">Active now</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-100">{stats.active}</p>
                </div>
                <div className="rounded-xl bg-gray-50/60 p-3">
                  <p className="text-xs text-gray-900/70">Upcoming</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.upcoming}</p>
                </div>
                <div className="rounded-xl bg-gray-50/60 p-3">
                  <p className="text-xs text-gray-900/70">Completed</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.completed}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/bookings")}
                  className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  View my bookings
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/cars")}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-emerald-600"
                >
                  Browse cars
                </button>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-2">
            <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-900/80">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^A-Za-z ]/g, ""))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Full name, e.g. John Doe"
              required
            />
            <p className="mt-1 text-xs text-gray-900/60">Use letters and spaces only.</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-900/80">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-900/80">Mobile number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Mobile number, e.g. 03001234567"
            />
            <p className="mt-1 text-xs text-gray-900/60">Use Pakistani mobile format only.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-900/80">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value.replace(/[^A-Za-z ]/g, ""))}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="City name, letters only"
              />
              <p className="mt-1 text-xs text-gray-900/60">Use letters and spaces only.</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-900/80">State</label>
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value.replace(/[^A-Za-z ]/g, ""))}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="State name, letters only"
              />
              <p className="mt-1 text-xs text-gray-900/60">Use letters and spaces only.</p>
            </div>
          </div>

          <div className="relative">
            <label className="text-sm font-semibold text-gray-900/80">New password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Leave blank to keep current password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-9.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-800"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="relative">
            <label className="text-sm font-semibold text-gray-900/80">Confirm new password</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-9.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-800"
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        {user?.emailVerified === false && (
          <div className="mt-6 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-100 border border-amber-400/30">
            <p className="font-medium">Email not verified yet.</p>
            <p className="mt-1">
              Check your inbox for the verification link. If you didn’t receive it, you can resend it below.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
                  await axios.post(`${base}/api/auth/resend-verification`, { email });
                  toast.success("Verification email resent. Check your inbox.");
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Unable to resend verification email.");
                }
              }}
              className="mt-3 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Resend verification email
            </button>
          </div>
        )}

        <p className="mt-6 text-sm text-gray-900/70">
          Update your name, email, phone, city, state or password here.
        </p>
      </section>
    </div>
  </div>
</div>
</div>
  );
};

export default Profile;
