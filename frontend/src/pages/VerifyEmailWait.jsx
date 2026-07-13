import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";

const POLL_INTERVAL_MS = 3000;

const VerifyEmailWait = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const navigate = useNavigate();
  const [status, setStatus] = useState("Checking verification status...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    let active = true;
    let timer = null;

    const checkStatus = async () => {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await axios.get(`${base}/api/auth/verify-status`, {
          params: { email },
        });

        if (!active) return;

        const verified = res?.data?.verified;
        if (verified) {
          setStatus("Email verified! Redirecting to home...");
          setError(null);
          setLoading(false);
          window.setTimeout(() => navigate("/", { replace: true }), 2000);
          return;
        }

        setStatus("A verification link has been sent to your inbox. Waiting for confirmation...");
        setError(null);
      } catch (err) {
        const msg = err?.response?.data?.message || "Unable to check verification status.";
        setError(msg);
        setStatus("There was a problem checking your verification status.");
      } finally {
        setLoading(false);
        if (active) timer = window.setTimeout(checkStatus, POLL_INTERVAL_MS);
      }
    };

    if (!email) {
      setStatus("No email provided.");
      setLoading(false);
      return;
    }

    checkStatus();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [email, navigate]);

  const handleCancel = () => {
    navigate("/", { replace: true });
  };

  const handleResendVerification = async () => {
    if (!email) return;

    setResendLoading(true);
    setError(null);

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      await axios.post(`${base}/api/auth/resend-verification`, { email });
      setResendSent(true);
      toast.success("Verification email resent. Please check your inbox.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to resend verification email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md rounded-2xl p-7">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Verify your email</h2>
        <p className="text-sm text-gray-600 mb-4">{status}</p>

        {loading && (
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          onClick={handleCancel}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
        >
          Cancel
        </button>

        <button
          onClick={handleResendVerification}
          disabled={loading || resendLoading || resendSent}
          className="mt-3 w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {resendSent ? "Verification Sent" : resendLoading ? "Resending…" : "Resend Verification Email"}
        </button>
      </div>
    </div>
  );
};

export default VerifyEmailWait;
