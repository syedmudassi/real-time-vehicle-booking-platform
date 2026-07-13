import express from "express";
import {
  getReport,
  downloadReportPDF,
  downloadReportCSV,
} from "../controllers/reportController.js";
import adminAuth from "../middlewares/adminAuth.js";

const router = express.Router();

// Middleware to add CORS headers and handle preflight
const handleCors = (req, res, next) => {
  const origin = req.headers.origin;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
};

// Apply CORS middleware BEFORE auth for all routes
router.use(handleCors);

// Get report data
router.get("/", adminAuth, getReport);

// Download report as PDF
router.get("/download/pdf", adminAuth, downloadReportPDF);

// Download report as CSV
router.get("/download/csv", adminAuth, downloadReportCSV);

export default router;
