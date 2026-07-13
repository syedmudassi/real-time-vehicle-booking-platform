import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { FaComments } from "react-icons/fa";

const FloatingChatButton = ({ raised = false }) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const token = useMemo(() => localStorage.getItem("token"), []);
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }

    let mounted = true;
    const loadSummary = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/chats/my/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setUnreadCount(Number(res?.data?.summary?.unreadForUser || 0));
      } catch {
        if (!mounted) return;
        setUnreadCount(0);
      }
    };

    loadSummary();

    return () => {
      mounted = false;
    };
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(apiBase, {
      transports: ["websocket"],
      auth: {
        role: "user",
        token,
      },
    });

    socket.on("chat:thread-updated", (payload) => {
      const fromSummary = Number(payload?.summary?.unreadForUser);
      const fromThread = Number(payload?.thread?.unreadForUser);
      if (!Number.isNaN(fromSummary)) {
        setUnreadCount(fromSummary);
        return;
      }
      if (!Number.isNaN(fromThread)) {
        setUnreadCount(fromThread);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [apiBase, token]);

  return (
    <button
      type="button"
      onClick={() => navigate("/contact")}
      className={`fixed right-8 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-r from-orange-600 to-amber-500 text-white shadow-lg transition hover:from-orange-500 hover:to-amber-400 ${raised ? "top-1/2 -translate-y-1/2" : "bottom-8"}`}
      aria-label="Open chat support"
      title="Chat with support"
    >
      <FaComments className="text-xl" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-3.5 w-3.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(17,24,39,0.9)]">
          <span className="sr-only">New chat message from admin</span>
        </span>
      )}
    </button>
  );
};

export default FloatingChatButton;
