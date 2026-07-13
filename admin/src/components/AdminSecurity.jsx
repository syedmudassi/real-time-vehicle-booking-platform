import React, { useState } from "react";
import { api } from "../api";

const AdminSecurity = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const res = await api.post("/api/admin/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setMessage(res?.data?.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-28 text-gray-900">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-orange-500/20 bg-white p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-orange-600">Admin Security</h1>
        <p className="mt-2 text-sm text-gray-600">Change admin password securely. New password must be at least 8 characters.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-orange-400"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-orange-400"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-linear-to-r from-orange-600 to-amber-500 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Updating..." : "Change Password"}
          </button>
        </form>

        {(error || message) && (
          <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${error ? "bg-red-900/40 text-red-200" : "bg-emerald-900/40 text-emerald-200"}`}>
            {error || message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSecurity;
