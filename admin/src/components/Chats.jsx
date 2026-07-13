import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, getAdminToken } from "../api";
import { ArrowLeft, MessageCircle, RefreshCcw, SendHorizonal } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { io } from "socket.io-client";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-PK");
};

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
    const label = formatDayHeader(message.createdAt) || "Unknown Date";
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, messages: [message] });
    } else {
      last.messages.push(message);
    }
    return groups;
  }, []);
};

const Chats = () => {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [activeThread, setActiveThread] = useState(null);
  const [reply, setReply] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [syncingThreads, setSyncingThreads] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [syncingThread, setSyncingThread] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [mobileMode, setMobileMode] = useState("list");
  const messagesRef = useRef(null);
  const socketRef = useRef(null);

  const loadThreads = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setSyncingThreads(true);
      else setLoadingThreads(true);
      const res = await api.get("/api/chats/admin/threads");
      const items = res?.data?.threads || [];
      setThreads(items);
      setActiveThreadId((current) => {
        if (!current) return "";
        const stillExists = items.some((item) => item.id === current);
        return stillExists ? current : "";
      });
    } catch (err) {
      console.error("Failed to load chat threads", err);
      toast.error(err?.response?.data?.message || "Unable to load chats.");
    } finally {
      if (silent) setSyncingThreads(false);
      else setLoadingThreads(false);
    }
  }, []);

  const loadActiveThread = useCallback(async (threadId, { silent = false } = {}) => {
    if (!threadId) {
      setActiveThread(null);
      return;
    }

    try {
      if (silent) setSyncingThread(true);
      else setLoadingThread(true);
      const res = await api.get(`/api/chats/admin/threads/${threadId}`);
      setActiveThread(res?.data?.thread || null);
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId ? { ...thread, unreadForAdmin: 0 } : thread,
        ),
      );
    } catch (err) {
      console.error("Failed to load active thread", err);
      toast.error(err?.response?.data?.message || "Unable to load conversation.");
    } finally {
      if (silent) setSyncingThread(false);
      else setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadThreads({ silent: false });
  }, [loadThreads]);

  useEffect(() => {
    loadActiveThread(activeThreadId, { silent: false });
  }, [activeThreadId, loadActiveThread]);

  useEffect(() => {
    const socket = io(api.defaults.baseURL || "http://localhost:5000", {
      transports: ["websocket"],
      auth: { role: "admin", token: getAdminToken() },
    });
    socketRef.current = socket;

    socket.on("chat:thread-updated", (payload) => {
      const summary = payload?.summary;
      const thread = payload?.thread;

      if (summary?.id) {
        setThreads((prev) => {
          const exists = prev.some((item) => item.id === summary.id);
          const next = exists
            ? prev.map((item) => (item.id === summary.id ? { ...item, ...summary } : item))
            : [summary, ...prev];

          return [...next].sort((a, b) => {
            const aTime = new Date(a.lastMessageAt || 0).getTime();
            const bTime = new Date(b.lastMessageAt || 0).getTime();
            return bTime - aTime;
          });
        });
      }

      if (thread?.id && thread.id === activeThreadId) {
        setSyncingThread(true);
        setActiveThread(thread);
        setSyncingThread(false);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeThreadId]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeThread?.messages?.length]);

  const groupedMessages = useMemo(
    () => groupMessagesByDate(activeThread?.messages || []),
    [activeThread?.messages],
  );

  const activeThreadSummary = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [activeThreadId, threads],
  );

  const handleSendReply = async (e) => {
    e.preventDefault();
    const text = reply.trim();
    if (!activeThreadId || !text) return;

    try {
      setSendingReply(true);
      const res = await api.post(`/api/chats/admin/threads/${activeThreadId}/messages`, {
        text,
      });
      setActiveThread(res?.data?.thread || null);
      setReply("");
      await loadThreads();
    } catch (err) {
      console.error("Failed to send admin reply", err);
      toast.error(err?.response?.data?.message || "Unable to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-linear-to-b from-gray-50 via-white to-gray-100 px-4 py-28 text-gray-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-28 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <ToastContainer position="top-right" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="bg-linear-to-r from-orange-500 via-orange-500 to-amber-600 bg-clip-text text-4xl font-bold text-transparent">
              Admin Chats
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              View user conversations and reply directly from the admin dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadThreads({ silent: false })}
            disabled={loadingThreads || syncingThreads}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-orange-300 bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={syncingThreads ? "animate-spin" : ""} />
            {syncingThreads ? "Syncing..." : "Refresh"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={`rounded-3xl border border-orange-500/15 bg-white/95 p-4 shadow-lg backdrop-blur-sm ${
              mobileMode === "chat" ? "hidden lg:block" : "block"
            }`}
          >
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MessageCircle className="text-orange-400" size={18} /> Conversations
            </div>

            <div className="space-y-3">
              {loadingThreads && !threads.length ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                  Loading chats...
                </div>
              ) : threads.length ? (
                threads.map((thread) => (
                  <button
                    type="button"
                    key={thread.id}
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      if (window.innerWidth < 1024) setMobileMode("chat");
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                      activeThreadId === thread.id
                        ? "border-orange-400/70 bg-linear-to-r from-orange-500/20 to-amber-500/10 shadow-lg"
                        : "border-gray-200 bg-gray-50 hover:border-orange-500/25 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{thread.userName || "Unknown User"}</div>
                        <div className="text-xs text-gray-400">{thread.userEmail || "No email"}</div>
                        <div className="mt-1 text-xs text-gray-500">{thread.userPhone || "No phone"}</div>
                      </div>
                      {thread.unreadForAdmin > 0 && (
                        <span className="rounded-full bg-linear-to-r from-orange-600 to-amber-500 px-2 py-1 text-xs font-bold text-white shadow">
                          {thread.unreadForAdmin}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">{thread.lastMessage || "No messages yet"}</p>
                    <div className="mt-2 text-xs text-gray-500">{formatTime(thread.lastMessageAt)}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                  No user chats yet.
                </div>
              )}
            </div>
          </aside>

          <section
            className={`rounded-3xl border border-orange-500/15 bg-white/95 p-5 shadow-lg backdrop-blur-sm ${
              mobileMode === "list" ? "hidden lg:block" : "block"
            }`}
          >
            {activeThreadSummary ? (
              <>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => setMobileMode("list")}
                      className="mb-3 inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 lg:hidden"
                    >
                      <ArrowLeft size={14} /> Back to list
                    </button>
                    <h2 className="text-2xl font-semibold text-gray-900">{activeThreadSummary.userName || "User Chat"}</h2>
                    <p className="text-sm text-gray-400">{activeThreadSummary.userEmail || "No email"}</p>
                    <p className="text-sm text-gray-500">{activeThreadSummary.userPhone || "No phone"}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Last activity</div>
                    <div className="mt-1 text-sm text-gray-600">{formatTime(activeThreadSummary.lastMessageAt)}</div>
                  </div>
                </div>

                <div
                  ref={messagesRef}
                  className="mb-4 h-115 space-y-3 overflow-y-auto rounded-2xl border border-orange-500/70 bg-linear-to-b from-black/35 to-gray-900/40 p-4"
                >
                  {syncingThread && (
                    <div className="mb-2 text-center text-[11px] font-medium text-gray-600">
                      Syncing new messages...
                    </div>
                  )}
                  {loadingThread && !activeThread ? (
                    <div className="text-sm text-gray-400">Loading conversation...</div>
                  ) : groupedMessages.length ? (
                    groupedMessages.map((group) => (
                      <div key={group.label} className="space-y-2">
                        <div className="sticky top-0 z-10 mx-auto w-fit rounded-full border border-orange-500/20 bg-white/60 px-3 py-1 text-[11px] font-semibold text-orange-600">
                          {group.label}
                        </div>
                        {group.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.senderType === "admin" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                                message.senderType === "admin"
                                  ? "border border-orange-300/40 bg-linear-to-r from-orange-600 to-orange-500 text-white"
                                  : "border border-gray-300 bg-gray-200/90 text-gray-800"
                              }`}
                            >
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                                {message.senderType === "admin" ? "Admin" : activeThreadSummary.userName || "User"}
                              </div>
                              <p className="whitespace-pre-wrap">{message.text}</p>
                              <div className="mt-2 text-[10px] opacity-70">{formatTime(message.createdAt)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400">No messages yet in this conversation.</div>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="space-y-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows="4"
                    placeholder="Write your reply to this user..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500"
                  ></textarea>
                  <button
                    type="submit"
                    disabled={sendingReply}
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SendHorizonal size={16} /> {sendingReply ? "Sending..." : "Send Reply"}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex h-145 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center text-gray-500">
                <div>
                  <MessageCircle className="mx-auto mb-3 text-orange-400" size={32} />
                  Select a conversation from the left to read and reply.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Chats;