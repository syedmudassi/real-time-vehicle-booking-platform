import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { api } from "../api";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", credentials, {
        headers: { "Content-Type": "application/json" },
      });

      const { token, role, message } = res.data || {};

      if (role !== "admin" || !token) {
        toast.error("Admin access only. Use the customer site for user login.");
        return;
      }

      localStorage.setItem("adminToken", token);
      if (res.data?.user) {
        localStorage.setItem("adminUser", JSON.stringify(res.data.user));
      }

      toast.success(message || "Admin login successful");
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
        <p className="mt-2 text-sm text-gray-400">
          Sign in to manage fleet and bookings.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">Email</label>
            <input
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none focus:border-orange-500"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">Password</label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none focus:border-orange-500"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-linear-to-r from-orange-600 to-amber-500 py-2.5 font-semibold text-white transition hover:from-orange-500 hover:to-amber-400 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <ToastContainer theme="light" position="top-right" />
    </div>
  );
};

export default AdminLogin;
