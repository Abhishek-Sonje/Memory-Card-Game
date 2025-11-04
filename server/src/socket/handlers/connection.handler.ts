import { Server, Socket } from "socket.io";
import { userSocketMap, socketUserMap } from "../state/gameState.js";

export function handleDuplicateConnection(io: Server, socket: Socket) {
  const userId = socket.data.userId;
  console.log("User connected:", userId, "Socket:", socket.id);

  // Handle duplicate connections - disconnect old socket
  const existingSocketId = userSocketMap.get(userId);
  if (existingSocketId && existingSocketId !== socket.id) {
    console.log(`Disconnecting duplicate connection for user ${userId}`);
    const existingSocket = io.sockets.sockets.get(existingSocketId);
    if (existingSocket) {
      existingSocket.emit("duplicateConnection", {
        message: "You connected from another device/tab",
      });
      existingSocket.disconnect(true);
    }
  }

  // Track this connection
  userSocketMap.set(userId, socket.id);
  socketUserMap.set(socket.id, userId);
}
