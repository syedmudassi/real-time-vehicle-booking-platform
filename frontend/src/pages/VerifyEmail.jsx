import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";

const VerifyEmail = () => {
  const [statusMsg, setStatusMsg] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);
  const location = useLocation();

  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (!token) {
      setStatusMsg("No verification token provided.");
      return;
    }

    const verify = async () => {
      try {
        setStatusMsg("Verifying email... Please wait.");
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await axios.get(`${base}/api/auth/verify-email`, {
          params: { token },
        });

        if (res?.data?.success) {
          setSuccess(true);
          setStatusMsg("Email verified successfully! Redirecting...");
          setTimeout(() => navigate("/", { replace: true }), 2000);
        } else {
          setStatusMsg(res?.data?.message || "Verification failed.");
        }
      } catch (err) {
        const serverMsg = err?.response?.data?.message;
        setStatusMsg(serverMsg || "Verification failed. Please try again.");
      }
    };

    verify();
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-900 p-4">
      <div className="text-center max-w-lg">
        <p className={success ? "text-green-200" : "text-red-200"}>{statusMsg}</p>
        {success && (
          <p className="mt-4 text-sm opacity-70">
            You can now <Link to="/login" className="underline">log in</Link> using your credentials.
          </p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
