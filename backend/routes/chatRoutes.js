import express from "express";
import authMiddleware from "../middlewares/auth.js";
import {
  getAdminChatSummary,
  getAdminThreadById,
  getAdminThreads,
  getMyChatSummary,
  getMyChatThread,
  sendAdminChatMessage,
  sendMyChatMessage,
} from "../controllers/chatController.js";

const chatRouter = express.Router();

chatRouter.get("/my", authMiddleware, getMyChatThread);
chatRouter.get("/my/summary", authMiddleware, getMyChatSummary);
chatRouter.post("/my/messages", authMiddleware, sendMyChatMessage);

chatRouter.get("/admin/threads", getAdminThreads);
chatRouter.get("/admin/summary", getAdminChatSummary);
chatRouter.get("/admin/threads/:id", getAdminThreadById);
chatRouter.post("/admin/threads/:id/messages", sendAdminChatMessage);

export default chatRouter;