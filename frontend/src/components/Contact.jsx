import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contactPageStyles as styles } from "../assets/dummyStyles";
import {
  FaCalendarAlt,
  FaCar,
  FaComments,
  FaClock,
  FaComment,
  FaEnvelope,
  FaMapMarkedAlt,
  FaPhone,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";
import { IoIosSend } from "react-icons/io";
import axios from "axios";
import { io } from "socket.io-client";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  headers: { Accept: "application/json" },
});

const formatDayHeader = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const messageDay = new Date(date);
  messageDay.setHours(0, 0, 0, 0);

  const msDiff = today - messageDay;
  const dayDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const groupMessagesByDate = (messages = []) => {
  return messages.reduce((groups, message) => {
    const key = formatDayHeader(message.createdAt) || "Unknown Date";
    const last = groups[groups.length - 1];
    if (!last || last.label !== key) {
      groups.push({ label: key, messages: [message] });
    } else {
      last.messages.push(message);
    }
    return groups;
  }, []);
};

const Contact = () => {
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const token = localStorage.getItem("token");
  const [formData, setFormData] = useState({
    name: storedUser?.name || "",
    email: storedUser?.email || "",
    phone: storedUser?.phone || "",
    carType: "",
    message: "",
  });
  const [activeField, setActiveField] = useState(null);
  const [chatThread, setChatThread] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSyncing, setChatSyncing] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatScrollRef = useRef(null);
  const socketRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFocus = (field) => {
    setActiveField(field);
  };

  const handleBlur = () => {
    setActiveField(null);
  };

  const loadChatThread = useCallback(async ({ silent = false } = {}) => {
    if (!token) {
      setChatThread(null);
      setChatError("");
      return;
    }

    try {
      if (silent) setChatSyncing(true);
      else setChatLoading(true);
      const res = await api.get("/api/chats/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChatThread(res?.data?.thread || null);
      setChatError("");
    } catch (err) {
      console.error("Failed to load chat thread", err);
      setChatError(err?.response?.data?.message || "Unable to load chat.");
    } finally {
      if (silent) setChatSyncing(false);
      else setChatLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadChatThread({ silent: false });
    return undefined;
  }, [loadChatThread, token]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      transports: ["websocket"],
      auth: {
        role: "user",
        token,
      },
    });
    socketRef.current = socket;

    socket.on("chat:thread-updated", (payload) => {
      if (!payload?.thread) return;
      setChatSyncing(true);
      setChatThread(payload.thread);
      setChatSyncing(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatThread?.messages?.length]);

  const groupedMessages = useMemo(
    () => groupMessagesByDate(chatThread?.messages || []),
    [chatThread?.messages],
  );

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!token) {
      setChatError("Please log in to start chatting with admin.");
      return;
    }

    const text = chatMessage.trim();
    if (!text) return;

    try {
      setChatSending(true);
      const res = await api.post(
        "/api/chats/my/messages",
        { text },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setChatThread(res?.data?.thread || null);
      setChatMessage("");
      setChatError("");
    } catch (err) {
      console.error("Failed to send chat message", err);
      setChatError(err?.response?.data?.message || "Unable to send message.");
    } finally {
      setChatSending(false);
    }
  };

  // WHATSAPP API
  const handleSubmit = (e) => {
    e.preventDefault();
    const whatsappMessage =
      `Name: ${formData.name}%0A` +
      `Email: ${formData.email}%0A` +
      `Phone: ${formData.phone}%0A` +
      `Car Type: ${formData.carType}%0A` +
      `Message: ${formData.message}`;
    window.open(
      `https://wa.me/+923329219597?text=${whatsappMessage}`,
      "_blank",
    );

    setFormData({ name: "", email: "", phone: "", carType: "", message: "" });
  };

  return (
    <div
      className={styles.container}
      style={{
        backgroundImage: `url("https://images.pexels.com/photos/5965324/pexels-photo-5965324.jpeg")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(4px)",
    }}
  ></div>
      <div className={styles.diamondPattern}>
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
            linear-gradient(30deg, rgba(249,115,22,0.08) 12%, transparent 12.5%, transparent 87%, rgba(249,115,22,0.08) 87.5%, rgba(249,115,22,0.08)),
            linear-gradient(150deg, rgba(249,115,22,0.08) 12%, transparent 12.5%, transparent 87%, rgba(249,115,22,0.08) 87.5%, rgba(249,115,22,0.08)),
            linear-gradient(30deg, rgba(249,115,22,0.08) 12%, transparent 12.5%, transparent 87%, rgba(249,115,22,0.08) 87.5%, rgba(249,115,22,0.08)),
            linear-gradient(150deg, rgba(249,115,22,0.08) 12%, transparent 12.5%, transparent 87%, rgba(249,115,22,0.08) 87.5%, rgba(249,115,22,0.08)),
            linear-gradient(60deg, rgba(234,88,12,0.08) 25%, transparent 25.5%, transparent 75%, rgba(234,88,12,0.08) 75%, rgba(234,88,12,0.08)),
            linear-gradient(60deg, rgba(234,88,12,0.08) 25%, transparent 25.5%, transparent 75%, rgba(234,88,12,0.08) 75%, rgba(234,88,12,0.08))`,
            backgroundSize: "80px 140px",
            backgroundPosition:
              "0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px",
          }}
        ></div>
      </div>

      {/* FLOATING PARTICLES
      <div className={styles.floatingTriangles}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={styles.triangle}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
              background:
                i % 3 === 0 ? "#f97316" : i % 3 === 1 ? "#fb923c" : "#fdba74",
              transform: `rotate(${Math.random() * 360}deg) scale(${Math.random() * 0.5 + 0.5})`,
            }}
          ></div>
        ))}
      </div> */}

      {/* TITLE */}
      <div className={styles.content}>
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>Contact Our Team</h1>
          <div className={styles.divider} />
          <p className={styles.subtitle}>
            Have question about our premium fleet? Our team is ready to assist
            with your car rental needs
          </p>
        </div>

        <div className={`${styles.cardContainer} md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3`}>
          <div className={`${styles.infoCard} md:w-full`}>
            <div className={styles.infoCardCircle1}></div>
            <div className={styles.infoCardCircle2}></div>

            <div className="relative z-10 space-y-5">
              <h2 className={styles.infoTitle}>
                <FaMapMarkedAlt className={styles.infoIcon} /> Our Information
              </h2>

              <div className={styles.infoItemContainer}>
                {[
                  {
                    icon: FaWhatsapp,
                    label: "WhatsApp",
                    value: "+92 332 9219597",
                    color: "bg-green-900/30",
                  },
                  {
                    icon: FaEnvelope,
                    label: "Email",
                    value: "contact@mhdigitalservices.com",
                    color: "bg-orange-900/30",
                  },
                  {
                    icon: FaClock,
                    label: "Hours",
                    value: "Mon-Sat: 8AM-8PM",
                    color: "bg-orange-900/30",
                  },
                ].map((info, i) => (
                  <div key={i} className={styles.infoItem}>
                    <div className={styles.iconContainer(info.color)}>
                      <info.icon
                        className={
                          i === 0
                            ? "text-green-400 text-lg"
                            : "text-orange-400 text-lg"
                        }
                      />
                    </div>

                    <div>
                      <h3 className={styles.infoLabel}>{info.label}</h3>
                      <p className={styles.infoValue}>
                        {info.value}
                        {i === 2 && (
                          <span className=" block text-gray-500">
                            Sunday: 10AM-6PM
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.offerContainer}>
                <div className=" flex items-center">
                  <FaCalendarAlt className={styles.offerIcon} />
                  <span className={styles.offerTitle}>Special Offer!</span>
                </div>
                <p className={styles.offerText}>
                  Book for 3+ days and get 10% discount
                </p>
              </div>
            </div>
          </div>

          {/* FORM CARD */}
          <div className="md:w-full space-y-6 lg:contents">
            <div className={`${styles.formCard} md:w-full`}>
              <div className={styles.formCircle1}></div>
              <div className={styles.formCircle2}></div>

              <div className="mb-4">
                <h2 className={styles.formTitle}>
                  <IoIosSend className={styles.infoIcon} /> Send Your Inquiry
                </h2>
                <p className={styles.formSubtitle}>
                  Fill out the form and we'll get back to your promptly.
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  {["name", "email", "phone", "carType"].map((field) => {
                    const icons = {
                      name: FaUser,
                      email: FaEnvelope,
                      phone: FaPhone,
                      carType: FaCar,
                    };

                    const placeholders = {
                      name: "Full Name",
                      email: "Email Address",
                      phone: "Phone Number",
                      carType: "Select Car Type",
                    };

                    return (
                      <div key={field} className={styles.inputContainer}>
                        <div className={styles.inputIcon}>
                          {React.createElement(icons[field])}
                        </div>

                        {field !== "carType" ? (
                          <input
                            type={
                              field === "email"
                                ? "email"
                                : field === "phone"
                                  ? "tel"
                                  : "text"
                            }
                            name={field}
                            value={formData[field]}
                            onChange={handleChange}
                            onFocus={() => handleFocus(field)}
                            onBlur={handleBlur}
                            required
                            placeholder={placeholders[field]}
                            className={styles.input(activeField === field)}
                          />
                        ) : (
                          <select
                            name="carType"
                            value={formData.carType}
                            onChange={handleChange}
                            onFocus={() => handleFocus(field)}
                            onBlur={handleBlur}
                            required
                            className={styles.select(activeField === field)}
                          >
                            <option value="">Select Car Type</option>
                            {[
                              "Economy",
                              "SUV",
                              "Luxury",
                              "Van",
                              "Sports Car",
                              "Convertible",
                            ].map((opt) => (
                              <option
                                value={opt}
                                key={opt}
                                className=" bg-gray-100 cursor-pointer"
                              >
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="relative">
                  <div className={styles.textareaIcon}>
                    <FaComment />
                  </div>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    onFocus={() => handleFocus("message")}
                    onBlur={handleBlur}
                    required
                    rows="3"
                    placeholder="Tell us about your rental needs..."
                    className={styles.textarea(activeField === "message")}
                  ></textarea>
                </div>

                <button type="submit" className={styles.submitButton}>
                  Send Message
                  <FaWhatsapp className={styles.whatsappIcon} />
                </button>
              </form>
            </div>

          {/* CHAT CARD */}
            <div className={`${styles.formCard} md:w-full`}>
              <div className={styles.formCircle1}></div>
              <div className={styles.formCircle2}></div>

              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className={styles.formTitle}>
                    <FaComments className={styles.infoIcon} /> Chat With Admin
                  </h2>
                  <p className={styles.formSubtitle}>
                    Start a direct conversation with our admin team from here.
                  </p>
                </div>
                {token && (
                  <button
                    type="button"
                    onClick={() => loadChatThread({ silent: false })}
                    className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-200 hover:bg-orange-500/20"
                  >
                    {chatSyncing ? "Syncing..." : "Refresh"}
                  </button>
                )}
              </div>

              {!token ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                  Log in first to start a personal chat with admin. Your conversation will stay linked to your account.
                </div>
              ) : (
                <>
                  <div
                    ref={chatScrollRef}
                    className="mb-4 h-72 space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    {chatSyncing && (
                      <div className="mb-2 text-center text-[11px] font-medium text-gray-600">
                        Syncing new messages...
                      </div>
                    )}
                    {chatLoading ? (
                      <div className="text-sm text-gray-400">Loading chat...</div>
                    ) : groupedMessages.length ? (
                      groupedMessages.map((group) => (
                        <div key={group.label} className="space-y-2">
                          <div className="sticky top-0 z-10 mx-auto w-fit rounded-full border border-orange-500/20 bg-white/70 px-3 py-1 text-[11px] font-semibold text-orange-200">
                            {group.label}
                          </div>
                          {group.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.senderType === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow ${
                                  message.senderType === "user"
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-200 text-gray-800"
                                }`}
                              >
                                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                                  {message.senderType === "user" ? "You" : "Admin"}
                                </div>
                                <p className="whitespace-pre-wrap">{message.text}</p>
                                <div className="mt-2 text-[10px] opacity-70">
                                  {new Date(message.createdAt).toLocaleString("en-PK")}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400">
                        No messages yet. Send the first message to start chatting with admin.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendChat} className="space-y-3">
                    <div className="relative">
                      <div className={styles.textareaIcon}>
                        <FaComment />
                      </div>
                      <textarea
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        rows="3"
                        placeholder="Write your message to admin..."
                        className={styles.textarea(false)}
                      ></textarea>
                    </div>

                    {chatError && <p className="text-sm text-red-300">{chatError}</p>}

                    <button
                      type="submit"
                      disabled={chatSending}
                      className="w-full rounded-lg bg-linear-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-orange-500 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {chatSending ? "Sending..." : "Send To Admin"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Fade-in Animation */}
      <style>{`
        @keyframes fadeIn { 
          from { opacity:0; transform:translateY(10px);} 
          to { opacity:1; transform:translateY(0);} 
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Contact;
