import { Server } from "socket.io";
import jwt from "jsonwebtoken";
// GPS system disabled
// import VehicleTracker from "../models/vehicleTrackerModel.js";
// import Car from "../models/carModel.js";
// import {
//   setGpsIoInstance,
//   emitActiveFleetSnapshot,
// } from "../socket/gpsEvents.js";

const JWT_SECRET = "your_jwt_secret_here";

// const ACTIVE_THRESHOLD_MINUTES = Number(
//   process.env.GPS_ACTIVE_THRESHOLD_MINUTES || 10
// );

let ioInstance = null;

const getThreadSummary = (thread) => ({
  id: thread.id,
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
});

export const initSocketServer = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  ioInstance.use((socket, next) => {
    const auth = socket.handshake.auth || {};
    const role = String(auth.role || "").toLowerCase();

    if (role === "admin") {
      const token = String(auth.token || "").trim();
      if (!token) {
        if (process.env.NODE_ENV !== "production") {
          socket.data.role = "admin";
          socket.data.adminUsername = "admin";
          return next();
        }
        return next(new Error("Unauthorized"));
      }

      try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload?.role !== "admin") return next(new Error("Unauthorized"));
        socket.data.role = "admin";
        socket.data.adminUsername = String(payload.username || "admin");
        return next();
      } catch {
        return next(new Error("Unauthorized"));
      }
    }

    if (role === "user") {
      const token = String(auth.token || "").trim();
      if (!token) return next(new Error("Unauthorized"));

      try {
        const payload = jwt.verify(token, JWT_SECRET);
        socket.data.role = "user";
        socket.data.userId = String(payload.id || "");
        if (!socket.data.userId) return next(new Error("Unauthorized"));
        return next();
      } catch {
        return next(new Error("Unauthorized"));
      }
    }

    return next(new Error("Unauthorized"));
  });

  // GPS system disabled
  // setGpsIoInstance(ioInstance);

  ioInstance.on("connection", async (socket) => {
    if (socket.data.role === "admin") {
      socket.join("admins");

      // GPS fleet snapshot disabled
      // try {
      //   const cutoff = new Date(
      //     Date.now() - ACTIVE_THRESHOLD_MINUTES * 60 * 1000
      //   );
      //   const trackers = await VehicleTracker.find({
      //     lastUpdated: { $gte: cutoff },
      //     isActive: true,
      //   })
      //     .sort({ lastUpdated: -1 })
      //     .lean();
      //
      //   const ids = trackers.map((t) => t.vehicleId);
      //   const cars = await Car.find({ gpsVehicleId: { $in: ids } }).lean();
      //   const carMap = Object.fromEntries(cars.map((c) => [c.gpsVehicleId, c]));
      //
      //   const vehicles = trackers.map((t) => {
      //     const car = carMap[t.vehicleId];
      //     const vehicleName = car
      //       ? `${car.make || ""} ${car.model || ""}`.trim()
      //       : "";
      //     return { ...t, vehicleName };
      //   });
      //
      //   emitActiveFleetSnapshot(socket.id, vehicles);
      // } catch (err) {
      //   console.error("Failed to send GPS fleet snapshot:", err);
      // }
    }

    if (socket.data.role === "user" && socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    // GPS live subscription disabled
    // socket.on("gps:subscribe-vehicle", (vehicleId) => {
    //   const id = String(vehicleId || "").trim();
    //   if (!id) return;
    //   socket.join(`gps:vehicle:${id}`);
    // });
    //
    // socket.on("gps:unsubscribe-vehicle", (vehicleId) => {
    //   const id = String(vehicleId || "").trim();
    //   if (!id) return;
    //   socket.leave(`gps:vehicle:${id}`);
    // });
  });

  return ioInstance;
};

export const emitChatThreadUpdated = (thread) => {
  if (!ioInstance || !thread) return;

  const summary = getThreadSummary(thread);
  ioInstance.to("admins").emit("chat:thread-updated", {
    summary,
    thread,
  });

  if (thread.userId) {
    ioInstance.to(`user:${thread.userId}`).emit("chat:thread-updated", {
      thread,
      summary,
    });
  }
};
