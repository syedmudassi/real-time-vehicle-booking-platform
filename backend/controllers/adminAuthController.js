import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import AdminAuth from "../models/adminAuthModel.js";
import { sendEmail } from "../utils/emailService.js";

const JWT_SECRET = "your_jwt_secret_here";
const ADMIN_DEFAULT_PASSWORD = "12345678";
const ADMIN_DEFAULT_USERNAME = "admin";

const normalizeEmail = (value) => {
  const raw = String(value || "").trim();
  return (validator.normalizeEmail(raw) || raw.toLowerCase()).toLowerCase();
};

const createAdminToken = (admin) =>
  jwt.sign(
    {
      role: "admin",
      username: admin.username,
      email: admin.email,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

const matchesAdminIdentifier = (identifier, admin) => {
  const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
  return (
    normalizedIdentifier === "admin" ||
    normalizedIdentifier === admin.username ||
    normalizedIdentifier === admin.email
  );
};

export const ensureAdminAccount = async () => {
  let admin = await AdminAuth.findOne({ username: ADMIN_DEFAULT_USERNAME });
  if (admin) return admin;

  const configuredEmail = normalizeEmail(process.env.ADMIN_EMAIL || process.env.EMAIL_USER || "");
  if (!configuredEmail || !validator.isEmail(configuredEmail)) {
    console.warn("ADMIN_EMAIL (or EMAIL_USER) is missing/invalid. Admin forgot-password email will not work.");
  }

  const passwordHash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 10);
  admin = await AdminAuth.create({
    username: ADMIN_DEFAULT_USERNAME,
    email: configuredEmail || "admin@example.com",
    passwordHash,
  });
  return admin;
};

export const loginAdmin = async ({ identifier, password }) => {
  const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
  if (!normalizedIdentifier || !password) {
    return { ok: false, status: 400, message: "All fields are required." };
  }

  const admin = await ensureAdminAccount();
  const isAdminIdentifier =
    normalizedIdentifier === admin.username ||
    normalizedIdentifier === "admin" ||
    normalizedIdentifier === admin.email;

  if (!isAdminIdentifier) {
    return { ok: false, status: 401, message: "Invalid email/username or password" };
  }

  const isMatch = await bcrypt.compare(String(password), admin.passwordHash);
  if (!isMatch) {
    return { ok: false, status: 401, message: "Invalid email/username or password" };
  }

  const token = createAdminToken(admin);
  return {
    ok: true,
    status: 200,
    token,
    admin: {
      username: admin.username,
      email: admin.email,
      role: "admin",
    },
  };
};

export const getAdminMe = async (_req, res) => {
  try {
    const admin = await ensureAdminAccount();
    return res.status(200).json({
      success: true,
      admin: {
        username: admin.username,
        email: admin.email,
        role: "admin",
      },
    });
  } catch (err) {
    console.error("Admin me error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const changeAdminPassword = async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
    }

    const admin = await ensureAdminAccount();
    const validCurrent = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!validCurrent) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    admin.resetCodeHash = null;
    admin.resetCodeExpiresAt = null;
    await admin.save();

    return res.status(200).json({ success: true, message: "Admin password changed successfully." });
  } catch (err) {
    console.error("Change admin password error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const forgotAdminPassword = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim().toLowerCase();
    const result = await issueAdminResetCode({ identifier });
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      accountType: "admin",
    });
  } catch (err) {
    console.error("Forgot admin password error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const resetAdminPassword = async (req, res) => {
  try {
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");
    const result = await applyAdminPasswordReset({ code, newPassword });
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      accountType: "admin",
    });
  } catch (err) {
    console.error("Reset admin password error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const issueAdminResetCode = async ({ identifier }) => {
  const admin = await ensureAdminAccount();
  if (identifier && !matchesAdminIdentifier(identifier, admin)) {
    return { success: false, status: 404, message: "Admin account not found." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  admin.resetCodeHash = codeHash;
  admin.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await admin.save();

  await sendEmail(
    admin.email,
    "Admin password reset code",
    `Your admin password reset code is: ${code}. It expires in 15 minutes.`,
    `<p>Your admin password reset code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 15 minutes.</p>`,
  );

  return { success: true, status: 200, message: "Verification code sent to admin email." };
};

export const applyAdminPasswordReset = async ({ code, newPassword }) => {
  const normalizedCode = String(code || "").trim();
  const password = String(newPassword || "");

  if (!normalizedCode || !password) {
    return { success: false, status: 400, message: "All fields are required." };
  }
  if (password.length < 8) {
    return { success: false, status: 400, message: "Password must be at least 8 characters." };
  }

  const admin = await ensureAdminAccount();
  if (!admin.resetCodeHash || !admin.resetCodeExpiresAt || admin.resetCodeExpiresAt < new Date()) {
    return { success: false, status: 400, message: "Reset code is invalid or expired." };
  }

  const codeHash = crypto.createHash("sha256").update(normalizedCode).digest("hex");
  if (codeHash !== admin.resetCodeHash) {
    return { success: false, status: 400, message: "Reset code is invalid or expired." };
  }

  admin.passwordHash = await bcrypt.hash(password, 10);
  admin.resetCodeHash = null;
  admin.resetCodeExpiresAt = null;
  await admin.save();

  return { success: true, status: 200, message: "Admin password reset successfully." };
};

export const isAdminIdentifier = async (identifier) => {
  const admin = await ensureAdminAccount();
  return matchesAdminIdentifier(identifier, admin);
};
