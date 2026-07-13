import jwt from "jsonwebtoken";

const JWT_SECRET = "your_jwt_secret_here";

export default function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, admin token missing",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.admin = {
      username: String(payload.username || "admin"),
      email: String(payload.email || ""),
    };
    return next();
  } catch (err) {
    console.error("Admin JWT verification failed:", err);
    return res.status(401).json({
      success: false,
      message: "Token invalid or expired",
    });
  }
}
