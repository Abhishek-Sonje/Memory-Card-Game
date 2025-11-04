import { Server, Socket } from "socket.io";
import { db } from "../../lib/db.js";
import { games } from "@memory-game/shared";
import { eq } from "drizzle-orm";
import {
  lobbyStates,
  gameStates,
  userSocketMap,
  socketUserMap,
  cleanupLobbyState,
  cleanupGameState,
} from "../state/gameState.js";
import { GAME_CONSTANTS } from "../../config/constants.js";

export function registerDisconnectHandler(io: Server, socket: Socket) {
  socket.on("disconnect", () => {
    const userId = socketUserMap.get(socket.id);
    if (!userId) return;

    console.log("User disconnected:", userId, "Socket:", socket.id);

    // Clean up tracking maps
    userSocketMap.delete(userId);
    socketUserMap.delete(socket.id);

    // 1. Clean up lobby states
    for (const [roomId, lobby] of lobbyStates.entries()) {
      if (lobby.players.has(userId)) {
        console.log(`Removing ${userId} from lobby ${roomId}`);
        lobby.players.delete(userId);

        // Broadcast updated player list to remaining players
        const playersList = Array.from(lobby.players.values());
        io.to(`lobby-${roomId}`).emit("lobbyUpdate", {
          players: playersList,
        });

        // If lobby is empty, clean it up
        if (lobby.players.size === 0) {
          cleanupLobbyState(roomId);
        }

        // If the host disconnected, notify players
        if (lobby.hostId === userId && lobby.players.size > 0) {
          io.to(`lobby-${roomId}`).emit("hostDisconnected", {
            message: "Host has left the lobby",
          });
        }
      }
    }

    // 2. Handle active game disconnections with grace period
    for (const [roomId, gameState] of gameStates.entries()) {
      if (gameState.hostId === userId || gameState.opponentId === userId) {
        console.log(
          `⏳ Player ${userId} disconnected from active game ${roomId} - starting grace period`
        );

        // Notify other player
        io.to(`game-${roomId}`).emit("opponentDisconnected", {
          userId,
          message: "Your opponent disconnected. Waiting for reconnection...",
        });

        // Set disconnection timer
        const disconnectionTimer = setTimeout(async () => {
          console.log(
            `❌ Player ${userId} did not reconnect within grace period. Ending game ${roomId}`
          );

          // Determine winner (the player who didn't disconnect)
          const winnerId =
            gameState.hostId === userId
              ? gameState.opponentId
              : gameState.hostId;

          // Update game status in database
          await db
            .update(games)
            .set({
              status: "completed",
              winnerId: winnerId,
              endedAt: new Date(),
            })
            .where(eq(games.roomId, roomId));

          // Notify remaining player
          io.to(`game-${roomId}`).emit("gameOver", {
            reason: "opponent_disconnect",
            winner: { userId: winnerId },
            message: "You win! Your opponent disconnected.",
          });

          // Clean up game state
          cleanupGameState(roomId);
        }, GAME_CONSTANTS.RECONNECTION_GRACE_PERIOD);

        // Store timer so it can be cancelled if player reconnects
        gameState.disconnectionTimers.set(userId, disconnectionTimer);
      }
    }
  });
}
