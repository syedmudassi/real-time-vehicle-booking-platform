import mongoose from "mongoose";
import crypto from "crypto";
import User from "../models/userModel.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/emailService.js";
import { sendWhatsAppMessage } from "../utils/whatsappService.js";
import {
  applyAdminPasswordReset,
  isAdminIdentifier,
  issueAdminResetCode,
  loginAdmin,
} from "./adminAuthController.js";

//TOKEN
const TOKEN_EXPIRES_IN = "24h";
const JWT_SECRET = "your_jwt_secret_here";

const isValidNameValue = (value) => {
  const trimmed = String(value || "").trim();
  return /^[A-Za-z]+(?:[\s][A-Za-z]+)*$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 50;
};

const isValidAlphaSpace = (value) => {
  const trimmed = String(value || "").trim();
  return /^[A-Za-z]+(?:[\s][A-Za-z]+)*$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 50;
};

const isValidPakistaniPhone = (value) => {
  const normalized = String(value || "").replace(/[^0-9+]/g, "");
  const digits = normalized.replace(/^\+/, "");
  return /^92?3\d{9}$/.test(digits) || /^03\d{9}$/.test(digits);
};

const createToken = (userId) => {
  const secret = JWT_SECRET;
  if (!secret) throw new Error("JWT_SCRET is not defined on the server");
  return jwt.sign({ id: userId }, secret, { expiresIn: TOKEN_EXPIRES_IN });
};

//REGISTER FUNCTION

export async function register(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const emailRow = String(req.body.email || "").trim();
    const email = validator.normalizeEmail(emailRow) || emailRow.toLowerCase();
    const password = String(req.body.password || "");
    const phone = String(req.body.phone || "").trim();
    const city = String(req.body.city || "").trim();
    const state = String(req.body.state || "").trim();

    if (!name || !email || !password || !phone || !city || !state) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (!isValidNameValue(name)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid name. Use letters and spaces only, 2-50 characters. Example: John or Mudassir.",
      });
    }

    if (!isValidPakistaniPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone must be a valid Pakistani mobile number.",
      });
    }

    if (!isValidAlphaSpace(city) || !isValidAlphaSpace(state)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid city or state. Use letters and spaces only, 2-50 characters. Example: Lahore or Karachi.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be atleast 8 characters.",
      });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      if (existingUser.emailVerified === false) {
        return res.status(409).json({
          success: false,
          message: "Email not verified",
          unverified: true,
        });
      }

      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const newId = new mongoose.Types.ObjectId();
    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const user = new User({
      _id: newId,
      name,
      email,
      password: hashedPassword,
      phone,
      city,
      state,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: verificationTokenExpiry,
    });
    await user.save();

    // Send verification email so we know the user can receive messages.
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
    const verifyLink = `${frontendUrl.replace(/\/$/, "")}/verify-email?token=${verificationToken}`;

    sendEmail(
      email,
      "Verify your PremiumDrive account",
      `Please verify your email by visiting: ${verifyLink}`,
      `<p>Hi ${name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verifyLink}">Verify my email</a></p><p>This link expires in 24 hours.</p>`
    );

    const token = createToken(newId.toString());

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please check your email to verify your account.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        state: user.state || "",
        emailVerified: user.emailVerified,
      },
    });
  } catch (err) {
    console.error("Register error", err);
    if (err.code === 11000)
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

export async function verifyEmail(req, res) {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Missing verification token.",
      });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token.",
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;
    await user.save();

    // Notify user that their account is now verified and ready to use
    sendEmail(
      user.email,
      "Your PremiumDrive account is verified",
      "Your account has been successfully verified and is now ready to use.",
      `<p>Hi ${user.name},</p><p>Your PremiumDrive account has been successfully verified and is ready to use.</p><p>You can now log in and start booking cars.</p>`,
    );

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (err) {
    console.error("Verify email error", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

export async function resendVerificationEmail(req, res) {
  try {
    const emailRow = String(req.body.email || "").trim();
    const email = validator.normalizeEmail(emailRow) || emailRow.toLowerCase();

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = verificationTokenExpiry;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
    const verifyLink = `${frontendUrl.replace(/\/$/, "")}/verify-email?token=${verificationToken}`;

    sendEmail(
      email,
      "Verify your PremiumDrive account",
      `Please verify your email by visiting: ${verifyLink}`,
      `<p>Hi ${user.name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verifyLink}">Verify my email</a></p><p>This link expires in 24 hours.</p>`
    );

    return res.status(200).json({
      success: true,
      message: "Verification email sent",
    });
  } catch (err) {
    console.error("Resend verification error", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

export async function checkEmail(req, res) {
  try {
    const emailRow = String(req.query.email || "").trim();
    const email = validator.normalizeEmail(emailRow) || emailRow.toLowerCase();

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    const user = await User.findOne({ email }).lean();

    return res.status(200).json({
      success: true,
      exists: Boolean(user),
      verified: Boolean(user?.emailVerified),
    });
  } catch (err) {
    console.error("Check email error", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

export async function forgotPassword(req, res) {
  try {
    const identifierRaw = String(req.body.identifier || req.body.email || "").trim();
    if (!identifierRaw) {
      return res.status(400).json({ success: false, message: "Email or username is required." });
    }

    const identifier = identifierRaw.toLowerCase();
    if (await isAdminIdentifier(identifier)) {
      const adminResult = await issueAdminResetCode({ identifier });
      return res.status(adminResult.status).json({
        success: adminResult.success,
        message: adminResult.message,
        accountType: "admin",
      });
    }

    const email = validator.normalizeEmail(identifierRaw) || identifier;
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    user.resetCodeHash = codeHash;
    user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendEmail(
      user.email,
      "Password reset code",
      `Your password reset code is: ${code}. It expires in 15 minutes.`,
      `<p>Your password reset code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 15 minutes.</p>`,
    );

    const whatsappBody = [
      "PremiumDrive Password Reset",
      `Hi ${user.name},`,
      `Your OTP is: ${code}`,
      "This OTP expires in 15 minutes.",
    ].join("\n");
    await sendWhatsAppMessage(user.phone, whatsappBody);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email and WhatsApp (if available).",
      accountType: "user",
    });
  } catch (err) {
    console.error("Forgot password error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function resetPassword(req, res) {
  try {
    const accountType = String(req.body.accountType || "user").toLowerCase();
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (accountType === "admin") {
      const adminResult = await applyAdminPasswordReset({ code, newPassword });
      return res.status(adminResult.status).json({
        success: adminResult.success,
        message: adminResult.message,
        accountType: "admin",
      });
    }

    const identifierRaw = String(req.body.identifier || req.body.email || "").trim();
    if (!identifierRaw || !code || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const email = validator.normalizeEmail(identifierRaw) || identifierRaw.toLowerCase();
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Reset code is invalid or expired." });
    }

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    if (codeHash !== user.resetCodeHash) {
      return res.status(400).json({ success: false, message: "Reset code is invalid or expired." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCodeHash = null;
    user.resetCodeExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
      accountType: "user",
    });
  } catch (err) {
    console.error("Reset password error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function verifyStatus(req, res) {
  try {
    const emailRow = String(req.query.email || "").trim();
    const email = validator.normalizeEmail(emailRow) || emailRow.toLowerCase();

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    const user = await User.findOne({ email }).lean();
    return res.status(200).json({
      success: true,
      verified: Boolean(user?.emailVerified),
    });
  } catch (err) {
    console.error("Verify status error", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

//LOGIN FUNCTION

export async function getProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        city: user.city || "",
        state: user.state || user.address || "",
        emailVerified: Boolean(user.emailVerified),
      },
    });
  } catch (err) {
    console.error("Get profile error", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

export async function updateProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const name = String(req.body.name || "").trim();
    const emailRow = String(req.body.email || "").trim();
    const email = validator.normalizeEmail(emailRow) || emailRow.toLowerCase();
    const currentPassword = String(req.body.currentPassword || "").trim();
    const password = String(req.body.password || "").trim();
    const confirmPassword = String(req.body.confirmPassword || "").trim();
    const phone = String(req.body.phone || "").trim();
    const city = String(req.body.city || "").trim();
    const state = String(req.body.state || "").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!isValidNameValue(name)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid name. Use letters and spaces only, 2-50 characters. Example: John or Mudassir.",
      });
    }

    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email.",
      });
    }

    if (phone && !isValidPakistaniPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone must be a valid Pakistani mobile number.",
      });
    }

    if (city && !isValidAlphaSpace(city)) {
      return res.status(400).json({
        success: false,
        message: "City must contain letters and spaces only.",
      });
    }

    if (state && !isValidAlphaSpace(state)) {
      return res.status(400).json({
        success: false,
        message: "State must contain letters and spaces only.",
      });
    }

    if (password && password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (password && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password confirmation does not match.",
      });
    }

    if (password && !currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is required to change password.",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.name = name;
    user.phone = phone;
    user.city = city;
    user.state = state;

    let emailChanged = false;
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Email is already in use.",
        });
      }
      user.email = email;
      user.emailVerified = false;
      emailChanged = true;

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24);
      user.emailVerificationToken = verificationToken;
      user.emailVerificationTokenExpires = verificationTokenExpiry;

      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
      const verifyLink = `${frontendUrl.replace(/\/$/, "")}/verify-email?token=${verificationToken}`;

      sendEmail(
        email,
        "Verify your PremiumDrive account",
        `Please verify your email by visiting: ${verifyLink}`,
        `<p>Hi ${name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verifyLink}">Verify my email</a></p><p>This link expires in 24 hours.</p>`
      );
    }

    if (password) {
      const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect.",
        });
      }

      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        state: user.state || "",
        emailVerified: user.emailVerified,
      },
    });
  } catch (err) {
    console.error("Update profile error", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

export async function login(req, res) {
  try {
    const identifierRaw = String(req.body.email || req.body.identifier || "").trim();
    const password = String(req.body.password || "");

    if (!identifierRaw || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const identifier = identifierRaw.toLowerCase();
    const adminLoginAttempt = await loginAdmin({ identifier, password });
    if (adminLoginAttempt.ok) {
      return res.status(adminLoginAttempt.status).json({
        success: true,
        message: "Admin login successful",
        token: adminLoginAttempt.token,
        role: "admin",
        user: adminLoginAttempt.admin,
      });
    }

    const email = validator.normalizeEmail(identifierRaw) || identifierRaw.toLowerCase();
    if (!validator.isEmail(email)) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({
        success: false,
      message: 'Invalid email/username or password'
    })

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) return res.status(401).json({
        success: false,
      message: 'Invalid email/username or password'
    })

    const token = jwt.sign({ id: user._id}, JWT_SECRET, {expiresIn: '24h'});
    return res.status(200).json({
        success: true,
        message: 'Login successfully',
        token,
      role: "user",
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
        phone: user.phone,
        city: user.city,
          state: user.state || user.address || "",
        emailVerified: user.emailVerified,
        }
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({
        success: false,
        message: 'Server Error'
    })
  }
}
