import mongoose from "mongoose";

const adminAuthSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      default: "admin",
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    resetCodeHash: {
      type: String,
      default: null,
    },
    resetCodeExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const AdminAuth = mongoose.models.AdminAuth || mongoose.model("AdminAuth", adminAuthSchema);

export default AdminAuth;
