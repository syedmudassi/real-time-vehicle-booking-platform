import express from "express";
import {
  updateLocation,
  getLatestLocation,
  getLocationHistory,
} from "../controllers/gpsController.js";

const router = express.Router();

router.post("/update", updateLocation);
router.get("/latest/:vehicleId", getLatestLocation);
router.get("/history/:vehicleId", getLocationHistory);

export default router;
