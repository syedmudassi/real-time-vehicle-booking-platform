import Chat from "../models/chatModel.js";
import { emitChatThreadUpdated } from "../utils/socket.js";

const serializeThread = (thread) => ({
  id: thread._id,
  userId: thread.userId,
  userName: thread.userName || "",
  userEmail: thread.userEmail || "",
  userPhone: thread.userPhone || "",
  unreadForAdmin: Number(thread.unreadForAdmin || 0),
  unreadForUser: Number(thread.unreadForUser || 0),
  lastMessage: thread.lastMessage || "",
  lastMessageAt: thread.lastMessageAt || thread.updatedAt || thread.createdAt,
  createdAt: thread.createdAt,
  updatedAt: thread.updatedAt,
  messages: Array.isArray(thread.messages)
    ? thread.messages.map((message) => ({
        id: message._id,
        senderType: message.senderType,
        text: message.text,
        createdAt: message.createdAt,
      }))
    : [],
});

const ensureText = (value) => String(value || "").trim();

const syncUserSnapshot = (thread, user) => {
  thread.userName = user?.name || thread.userName || "";
  thread.userEmail = user?.email || thread.userEmail || "";
  thread.userPhone = user?.phone || thread.userPhone || "";
};

export const getMyChatThread = async (req, res) => {
  try {
    const thread = await Chat.findOne({ userId: req.user._id });

    if (!thread) {
      return res.status(200).json({ success: true, thread: null });
    }

    syncUserSnapshot(thread, req.user);
    let shouldEmitUpdate = false;
    if (thread.unreadForUser > 0) {
      thread.unreadForUser = 0;
      shouldEmitUpdate = true;
    }
    await thread.save();

    if (shouldEmitUpdate) {
      emitChatThreadUpdated(serializeThread(thread));
    }

    return res.status(200).json({
      success: true,
      thread: serializeThread(thread),
    });
  } catch (err) {
    console.error("Get my chat thread error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getMyChatSummary = async (req, res) => {
  try {
    const thread = await Chat.findOne({ userId: req.user._id });

    if (!thread) {
      return res.status(200).json({
        success: true,
        summary: {
          unreadForUser: 0,
          lastMessageAt: null,
          lastMessage: "",
        },
      });
    }

    return res.status(200).json({
      success: true,
      summary: {
        unreadForUser: Number(thread.unreadForUser || 0),
        lastMessageAt: thread.lastMessageAt || thread.updatedAt || thread.createdAt,
        lastMessage: thread.lastMessage || "",
      },
    });
  } catch (err) {
    console.error("Get my chat summary error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const sendMyChatMessage = async (req, res) => {
  try {
    const text = ensureText(req.body.text);
    if (!text) {
      return res.status(400).json({ success: false, message: "Message text is required" });
    }

    let thread = await Chat.findOne({ userId: req.user._id });
    if (!thread) {
      thread = new Chat({ userId: req.user._id });
    }

    syncUserSnapshot(thread, req.user);
    thread.messages.push({ senderType: "user", text });
    thread.lastMessage = text;
    thread.lastMessageAt = new Date();
    thread.unreadForAdmin = Number(thread.unreadForAdmin || 0) + 1;
    thread.unreadForUser = 0;

    await thread.save();

    const serialized = serializeThread(thread);
    emitChatThreadUpdated(serialized);

    return res.status(201).json({
      success: true,
      thread: serialized,
    });
  } catch (err) {
    console.error("Send my chat message error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAdminThreads = async (_req, res) => {
  try {
    const threads = await Chat.find({}).sort({ lastMessageAt: -1, updatedAt: -1 });
    return res.status(200).json({
      success: true,
      threads: threads.map((thread) => ({
        id: thread._id,
        userId: thread.userId,
        userName: thread.userName || "",
        userEmail: thread.userEmail || "",
        userPhone: thread.userPhone || "",
        unreadForAdmin: Number(thread.unreadForAdmin || 0),
        unreadForUser: Number(thread.unreadForUser || 0),
        lastMessage: thread.lastMessage || "",
        lastMessageAt: thread.lastMessageAt || thread.updatedAt || thread.createdAt,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Get admin threads error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAdminChatSummary = async (_req, res) => {
  try {
    const threads = await Chat.find({}, { unreadForAdmin: 1 }).lean();
    const unreadForAdmin = threads.reduce(
      (sum, thread) => sum + Number(thread.unreadForAdmin || 0),
      0,
    );

    return res.status(200).json({
      success: true,
      summary: {
        unreadForAdmin,
      },
    });
  } catch (err) {
    console.error("Get admin chat summary error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAdminThreadById = async (req, res) => {
  try {
    const thread = await Chat.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ success: false, message: "Chat thread not found" });
    }

    if (thread.unreadForAdmin > 0) {
      thread.unreadForAdmin = 0;
      await thread.save();
      emitChatThreadUpdated(serializeThread(thread));
    }

    return res.status(200).json({
      success: true,
      thread: serializeThread(thread),
    });
  } catch (err) {
    console.error("Get admin thread error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const sendAdminChatMessage = async (req, res) => {
  try {
    const text = ensureText(req.body.text);
    if (!text) {
      return res.status(400).json({ success: false, message: "Message text is required" });
    }

    const thread = await Chat.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ success: false, message: "Chat thread not found" });
    }

    thread.messages.push({ senderType: "admin", text });
    thread.lastMessage = text;
    thread.lastMessageAt = new Date();
    thread.unreadForUser = Number(thread.unreadForUser || 0) + 1;
    thread.unreadForAdmin = 0;

    await thread.save();

    const serialized = serializeThread(thread);
    emitChatThreadUpdated(serialized);

    return res.status(201).json({
      success: true,
      thread: serialized,
    });
  } catch (err) {
    console.error("Send admin chat message error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};