import { io } from "socket.io-client";
import { API_ORIGIN, getAdminToken } from "../api";

/**
 * Creates a Socket.IO client for live GPS updates (admin role).
 */
export const createGpsSocket = () => {
  return io(API_ORIGIN, {
    transports: ["websocket"],
    auth: {
      role: "admin",
      token: getAdminToken(),
    },
  });
};
