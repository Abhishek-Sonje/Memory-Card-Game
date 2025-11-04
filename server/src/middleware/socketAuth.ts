import jwt from "jsonwebtoken";
import { Socket } from "socket.io";
import { JWT_CONFIG } from "../config/jwt.js";
import type { JWTPayload } from "../types/index.js";

export const socketAuthMiddleware = (socket: Socket, next: Function) => {
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;

  if (!token || !userId) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET) as JWTPayload;
    if (decoded.userId !== userId) {
      return next(new Error("Token user mismatch"));
    }
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return next(new Error("Invalid token"));
  }
};
