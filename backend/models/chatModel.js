import mongoose from "mongoose";

const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    senderType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const chatSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    userName: {
      type: String,
      default: "",
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
    },
    userPhone: {
      type: String,
      default: "",
      trim: true,
    },
    unreadForAdmin: {
      type: Number,
      default: 0,
    },
    unreadForUser: {
      type: Number,
      default: 0,
    },
    lastMessage: {
      type: String,
      default: "",
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.models.Chat || mongoose.model("Chat", chatSchema);