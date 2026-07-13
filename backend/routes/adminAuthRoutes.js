import express from "express";
import adminAuth from "../middlewares/adminAuth.js";
import {
  changeAdminPassword,
  forgotAdminPassword,
  getAdminMe,
  resetAdminPassword,
} from "../controllers/adminAuthController.js";

const adminAuthRouter = express.Router();

adminAuthRouter.get("/me", adminAuth, getAdminMe);
adminAuthRouter.post("/forgot-password", forgotAdminPassword);
adminAuthRouter.post("/reset-password", resetAdminPassword);
adminAuthRouter.post("/change-password", adminAuth, changeAdminPassword);

export default adminAuthRouter;
