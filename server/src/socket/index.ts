import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import { socketAuthMiddleware } from "../middleware/socketAuth.js";
import { handleDuplicateConnection } from "./handlers/connection.handler.js";
import { registerLobbyHandlers } from "./handlers/lobby.handler.js";
import { registerGameHandlers } from "./handlers/game.handler.js";
import { registerDisconnectHandler } from "./handlers/disconnect.handler.js";
import { SERVER_CONFIG } from "../config/constants.js";

export function initializeSocketIO(server: HTTPServer): Server {
  const io = new Server(server, {
    cors: {
      origin: [SERVER_CONFIG.FRONTEND_URL, SERVER_CONFIG.FRONTEND_URL_ALT],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on("connection", (socket) => {
    // Handle duplicate connections
    handleDuplicateConnection(io, socket);

    // Register event handlers
    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerDisconnectHandler(io, socket);
  });

  return io;
}
