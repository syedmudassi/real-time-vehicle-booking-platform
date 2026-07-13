import React, { useEffect, useState } from "react";
import { signupStyles } from "../assets/dummyStyles";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import {
  FaArrowLeft,
  FaCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaMapMarkerAlt,
  FaPhone,
  FaUser,
} from "react-icons/fa";
import logo from "../assets/logocar.png";
import axios from 'axios'

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailVerified, setEmailVerified] = useState(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);

  useEffect(() => {
    setIsActive(true);
  }, []);

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

  const handleChange = (e) => {
    const { name, value: rawValue } = e.target;
    let value = rawValue;

    if (name === "name" || name === "city" || name === "state") {
      value = value.replace(/[^A-Za-z ]/g, "");
    }
    if (name === "phone") {
      value = value.replace(/[^0-9+]/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "email") {
      setEmailExists(false);
      setEmailVerified(null);
      setShowResend(false);
      setResendSent(false);
    }
  };

  const checkEmailAvailability = async (email) => {
    if (!email) return;
    try {
      setEmailCheckLoading(true);
      const base = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${base}/api/auth/check-email`, {
        params: { email },
      });
      setEmailExists(Boolean(res.data?.exists));
      setEmailVerified(res.data?.verified ?? null);
    } catch (err) {
      console.error("Email availability check failed", err);
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowResend(false);
    setResendSent(false);

    if (!acceptedTerms) {
      toast.error("Please accept terms & conditions", { theme: "dark" });
      return;
    }

    if (emailCheckLoading) {
      toast.info("Checking email availability. Please wait...", { theme: "dark" });
      return;
    }

    if (!isValidName(formData.name)) {
      toast.error(
        "Invalid name. Use letters and spaces only, 2-50 characters. Example: John or Mudassir.",
        { theme: "dark" }
      );
      return;
    }

    if (!isValidCityState(formData.city) || !isValidCityState(formData.state)) {
      toast.error(
        "Invalid city or state. Use letters and spaces only, 2-50 characters. Example: Lahore or Karachi.",
        {
          theme: "dark",
        }
      );
      return;
    }

    if (!isValidPakistaniPhone(formData.phone)) {
      toast.error("Invalid phone. Use Pakistani format like 03001234567.", {
        theme: "dark",
      });
      return;
    }

    if (emailExists) {
      if (emailVerified === false) {
        setShowResend(true);
        toast.error("Email already registered but not verified. Check your inbox.", {
          theme: "dark",
        });
        return;
      }

      toast.error("Email already registered. Try logging in.", { theme: "dark" });
      return;
    }

    if (!formData.phone.trim() || !formData.city.trim() || !formData.state.trim()) {
      toast.error("Phone, city, and state are required.", { theme: "dark" });
      return;
    }

    setLoading(true);

    try{
      const base = import.meta.env.VITE_API_URL;
      const url = `${base}/api/auth/register`;

      const res = await axios.post(url, formData, {
        headers: { "Content-Type": "application/json"},
      });

      if(res.status >= 200 && res.status < 300) {
        const { token, user } = res.data || {};

        if(token) localStorage.setItem("token", token);
        if(user) localStorage.setItem("user", JSON.stringify(user));
        toast.success("Account created successfully! Check your email to verify your account.", {
          position: "top-right",
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "dark",
          autoClose: 2500
        });

        navigate(`/verify-wait?email=${encodeURIComponent(formData.email)}`);
      }
    }
    catch (err) {
       // Detailed axios error handling
      console.error("Signup error (frontend):", err);

      const status = err?.response?.status;
      const serverData = err?.response?.data;
      const serverMessage =
        serverData?.message || serverData?.error || `Server error: ${status}`;

      if (status === 409 && serverData?.unverified) {
        setShowResend(true);
        toast.error("Email already registered but not verified. Check your inbox.", {
          theme: "dark",
        });
      } else if (err.response) {
        toast.error(serverMessage, { theme: "dark" });
      } else if (err.request) {
        // Request made but no response
        console.log("No response received (debug):", err.request);
        toast.error(
          "No response from server — ensure backend is running and CORS is configured.",
          {
            theme: "dark",
          }
        );
      } else {
        // Something else happened
        toast.error(err.message || "Registration failed", { theme: "dark" });
      }
    }

    finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleResendVerification = async () => {
    if (!formData.email) return;

    setResendLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL;
      const url = `${base}/api/auth/resend-verification`;
      const res = await axios.post(
        url,
        { email: formData.email },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res?.data?.success) {
        setResendSent(true);
        toast.success(res.data.message || "Verification email sent.", {
          theme: "dark",
        });
      } else {
        toast.error(res.data.message || "Unable to send verification email.", {
          theme: "dark",
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to send verification email.";
      toast.error(msg, { theme: "dark" });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className={signupStyles.pageContainer}>
      {/* Animated Background */}
      <div className={signupStyles.animatedBackground.base}>
        <div
          className={`${signupStyles.animatedBackground.orb1} ${
            isActive
              ? "translate-x-10 sm:translate-x-20 translate-y-5 sm:translate-y-10"
              : ""
          }`}
        ></div>
        <div
          className={`${signupStyles.animatedBackground.orb2} ${
            isActive
              ? "-translate-x-10 sm:-translate-x-20 -translate-y-5 sm:-translate-y-10"
              : ""
          }`}
        ></div>
        <div
          className={`${signupStyles.animatedBackground.orb3} ${
            isActive
              ? "-translate-x-5 sm:-translate-x-10 translate-y-10 sm:translate-y-20"
              : ""
          }`}
        ></div>
      </div>

      <a href="/" className={signupStyles.backButton}>
        <FaArrowLeft className=" text-xs sm:text-sm group-hover:-translate-x-1 transition-transform" />
        <span className=" font-medium text-xs sm:text-sm">back to Home</span>
      </a>

      <div
        className={`${signupStyles.signupCard.container} ${isActive ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
      >
        <div
          className={signupStyles.signupCard.card}
          style={{
            boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
            borderRadius: "24px",
          }}
        >
          <div className={signupStyles.signupCard.decor1} />
          <div className={signupStyles.signupCard.decor2} />

          <div className={signupStyles.signupCard.headerContainer}>
            <div className={signupStyles.signupCard.logoContainer}>
              <div className={signupStyles.signupCard.logoText}>
                <img
                  src={logo}
                  alt="logo"
                  className="h-[1.2em] w-auto block object-contain"
                  style={{ display: "block" }}
                />
                <span className=" font-bold tracking-wider text-gray-900 mt-1">
                  SwiftRide
                </span>
              </div>
            </div>
            <h1 className={signupStyles.signupCard.title}>Join PremiumDrive</h1>
            <p className={signupStyles.signupCard.subtitle}>
              Create your exclusive account
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className={signupStyles.form.container}>
            <div className={signupStyles.form.inputContainer}>
              <div className={signupStyles.form.inputWrapper}>
                <div className={signupStyles.form.inputIcon}>
                  <FaUser className=" text-sm sm:text-base" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={signupStyles.form.input}
                  placeholder="Full name, e.g. John Doe"
                  required
                  style={{ borderRadius: "16px" }}
                />
                <p className="mt-1 text-xs text-gray-900/60">
                  Enter letters and spaces only, for example John or Mudassir.
                </p>
              </div>
            </div>

            <div className={signupStyles.form.inputContainer}>
              <div className={signupStyles.form.inputWrapper}>
                <div className={signupStyles.form.inputIcon}>
                  <FaEnvelope className=" text-sm sm:text-base" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => checkEmailAvailability(formData.email)}
                  className={signupStyles.form.input}
                  placeholder="Email Address"
                  required
                  style={{ borderRadius: "16px" }}
                />
                {emailExists && (
                  <p className="text-xs text-red-200 mt-1">
                    Email already registered. Try logging in.
                  </p>
                )}
                {emailCheckLoading && (
                  <p className="text-xs text-yellow-200 mt-1">Checking email...</p>
                )}
              </div>
            </div>

            <div className={signupStyles.form.inputContainer}>
              <div className={signupStyles.form.inputWrapper}>
                <div className={signupStyles.form.inputIcon}>
                  <FaPhone className=" text-sm sm:text-base" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={signupStyles.form.input}
                  placeholder="Mobile number, e.g. 03001234567"
                  required
                  style={{ borderRadius: "16px" }}
                />
                <p className="mt-1 text-xs text-gray-900/60">
                  Enter your Pakistani mobile number in local or country-code format.
                </p>
              </div>
            </div>

            <div className={signupStyles.form.inputContainer}>
              <div className={signupStyles.form.inputWrapper}>
                <div className={signupStyles.form.inputIcon}>
                  <FaMapMarkerAlt className=" text-sm sm:text-base" />
                </div>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={signupStyles.form.input}
                  placeholder="City name, letters only"
                  required
                  style={{ borderRadius: "16px" }}
                />
                <p className="mt-1 text-xs text-gray-900/60">
                  Enter your city using letters and spaces only.
                </p>
              </div>
            </div>

            <div className={signupStyles.form.inputContainer}>
              <div className={signupStyles.form.inputWrapper}>
                <div className={signupStyles.form.inputIcon}>
                  <FaMapMarkerAlt className=" text-sm sm:text-base" />
                </div>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={signupStyles.form.input}
                  placeholder="State name, letters only"
                  required
                  style={{ borderRadius: "16px" }}
                />
                <p className="mt-1 text-xs text-gray-900/60">
                  Enter your state using letters and spaces only.
                </p>
              </div>
            </div>

            <div className={signupStyles.form.inputContainer}>
              <div className={signupStyles.form.inputWrapper}>
                <div className={signupStyles.form.inputIcon}>
                  <FaLock className=" text-sm sm:text-base" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={signupStyles.form.input}
                  placeholder="Create Password"
                  required
                  style={{ borderRadius: "16px" }}
                />

                <div
                  onClick={togglePasswordVisibility}
                  className={signupStyles.form.passwordToggle}
                >
                  {showPassword ? (
                    <FaEyeSlash className=" text-sm sm:text-base" />
                  ) : (
                    <FaEye className="text-sm sm:text-base" />
                  )}
                </div>
              </div>
            </div>

            {/* TNC */}
            <div className="flex items-start mt-2 sm:mt-3 md:mt-4">
              <div className="flex items-center h-5 mt-0 sm:mt-1">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  checked={acceptedTerms}
                  onChange={() => setAcceptedTerms(!acceptedTerms)}
                  className={signupStyles.form.checkbox}
                  style={{ boxShadow: "none" }}
                />
              </div>

              <div className=" ml-2 sm:ml-3 text-xs sm:text-sm">
                <label
                  htmlFor="terms"
                  className={signupStyles.form.checkboxLabel}
                >
                  I agree to the{" "}
                  <span className={signupStyles.form.checkboxLink}>
                    Terms & Conditions
                  </span>
                </label>
              </div>
            </div>

            <button
              style={{
                borderRadius: "16px",
                boxShadow: "0 5px 15px rgba(8,90,20,0.6)",
              }}
              type="submit"
              disabled={loading || emailCheckLoading || emailExists}
              className={signupStyles.form.submitButton}
            >
              <span className={signupStyles.form.buttonText}>
                <FaCheck className=" text-gray-900 text-sm sm:text-base md:text-lg" />
                {loading ? "CREATING..." : "CREATE ACCOUNT"}
              </span>
              <div className={signupStyles.form.buttonHover} />
            </button>

            {showResend && (
              <div className="mt-4 text-center">
                <p className="text-sm text-yellow-200">
                  Didn’t receive a verification email? Click below to resend.
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading || resendSent}
                  className="mt-2 inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {resendLoading ? "Sending..." : resendSent ? "Sent" : "Resend verification email"}
                </button>
              </div>
            )}
          </form>

          <div
            style={{ borderColor: "rgba(255,255,255,0.06" }}
            className={signupStyles.signinSection}
          >
            <p className={signupStyles.signinText}>Already have an account?</p>
            <a
              href="/login"
              className={signupStyles.signinButton}
              style={{
                borderRadius: "16px",
                boxShadow: "0 2px 10px rgba(245, 124, 0, 0.08)",
              }}
            >
              LOGIN TO YOUR ACCOUNT
            </a>
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{
          backgroundColor: "#fb923c",
          color: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(245,124,0,0.18)",
          fontFamily: "'Montserrat', sans-serif",
        }}
      />

      {/* Font Import */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
          body { font-family: 'Montserrat', sans-serif; }
        `}
      </style>
    </div>
  );
};

export default SignUp;
