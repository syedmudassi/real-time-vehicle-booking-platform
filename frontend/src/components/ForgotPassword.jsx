import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState("user");
  const [otpSent, setOtpSent] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const id = String(identifier || "").trim();
    if (!id) {
      toast.error("Please enter email or username.", { theme: "colored" });
      return;
    }

    setLoadingSend(true);
    try {
      const res = await axios.post(
        `${apiBase}/api/auth/forgot-password`,
        { identifier: id },
        { headers: { "Content-Type": "application/json" } },
      );

      setAccountType(res?.data?.accountType || "user");
      setOtpSent(true);
      toast.success(res?.data?.message || "OTP sent successfully.", {
        theme: "colored",
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to send OTP right now.";
      toast.error(msg, { theme: "colored" });
    } finally {
      setLoadingSend(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!otpSent) {
      toast.error("Send OTP first.", { theme: "colored" });
      return;
    }
    if (!code || !newPassword || !confirmPassword) {
      toast.error("All fields are required.", { theme: "colored" });
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.", { theme: "colored" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.", { theme: "colored" });
      return;
    }

    setLoadingReset(true);
    try {
      const payload = {
        accountType,
        code,
        newPassword,
        identifier: String(identifier || "").trim(),
      };

      const res = await axios.post(
        `${apiBase}/api/auth/reset-password`,
        payload,
        { headers: { "Content-Type": "application/json" } },
      );

      toast.success(res?.data?.message || "Password reset successful.", {
        theme: "colored",
        autoClose: 900,
        onClose: () => navigate("/login", { replace: true }),
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to reset password right now.";
      toast.error(msg, { theme: "colored" });
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--app-bg)] px-4 py-10 sm:py-16 text-gray-900">
      <div className="pointer-events-none absolute -left-16 top-10 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-8 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="glass-card relative mx-auto w-full max-w-xl rounded-2xl p-6 sm:p-8">
        <h1 className="bg-linear-to-r from-orange-500 to-orange-600 bg-clip-text text-center text-3xl font-bold text-transparent">
          Forgot Password
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Works for both user and admin accounts.
        </p>

        <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700">Email or Username</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your registered email or admin username"
            className="glass-input w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-500 focus:border-orange-400"
            required
          />
          <button
            type="submit"
            disabled={loadingSend}
            className="w-full rounded-xl bg-linear-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingSend ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
            Account detected: <span className="font-semibold uppercase">{accountType}</span>
          </div>

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter OTP"
            className="glass-input w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-500 focus:border-orange-400"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="glass-input w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-500 focus:border-orange-400"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="glass-input w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-500 focus:border-orange-400"
            required
          />
          <button
            type="submit"
            disabled={loadingReset}
            className="w-full rounded-xl border border-orange-500 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingReset ? "Updating password..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={2000} theme="colored" />
    </div>
  );
};

export default ForgotPassword;
