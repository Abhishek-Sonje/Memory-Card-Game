import { Server, Socket } from "socket.io";
import { db } from "../../lib/db.js";
import { games } from "@memory-game/shared";
import { eq } from "drizzle-orm";
import { lobbyStates, cleanupLobbyState } from "../state/gameState.js";

export function registerLobbyHandlers(io: Server, socket: Socket) {
  // Player joins lobby
  socket.on(
    "joinLobby",
    async ({
      roomId,
      userId,
      userName,
    }: {
      roomId: string;
      userId: string;
      userName: string;
    }) => {
      try {
        console.log(`JOIN LOBBY:`, { roomId, userId, userName });

        if (!roomId || !userId || !userName) {
          console.error("❌ Invalid join lobby data:", {
            roomId,
            userId,
            userName,
          });
          socket.emit(
            "error",
            "Missing required fields: roomId, userId, or userName"
          );
          return;
        }

        // Find game
        let game = await db.query.games.findFirst({
          where: eq(games.roomId, roomId),
        });

        if (!game) {
          const result = await db
            .select()
            .from(games)
            .where(eq(games.roomId, roomId))
            .limit(1);
          game = result[0];
        }

        if (!game) {
          console.error("Game not found for roomId:", roomId);
          return socket.emit("error", "Game not found");
        }

        // ✅ PREVENT JOINING LOBBY IF GAME IS ACTIVE
        if (game.status === "in_progress") {
          console.error("Game already in progress. Status:", game.status);
          socket.emit("gameInProgress", {
            message: "This game is already in progress",
            roomId,
            gameId: game.id,
          });
          return;
        }

        if (game.status === "completed") {
          console.error("Game already completed");
          return socket.emit("error", "This game has already ended");
        }

        // Join socket room
        socket.join(`lobby-${roomId}`);
        console.log(`Socket joined room lobby-${roomId}`);

        // Initialize or get lobby state
        let lobby = lobbyStates.get(roomId);
        if (!lobby) {
          lobby = {
            roomId,
            hostId: game.hostId,
            players: new Map(),
          };
          lobbyStates.set(roomId, lobby);
          console.log("Created new lobby state");
        }

        // Check if lobby is full (max 2 players)
        if (lobby.players.size >= 2 && !lobby.players.has(userId)) {
          console.error("Lobby is full");
          return socket.emit("error", "Lobby is full (max 2 players)");
        }

        // Add player to lobby
        lobby.players.set(userId, {
          id: userId,
          name: userName,
          ready: false,
          socketId: socket.id,
        });

        // If this is opponent joining, update database
        if (game.hostId !== userId && !game.opponentId) {
          await db
            .update(games)
            .set({ opponentId: userId })
            .where(eq(games.id, game.id));
          console.log("✅ Updated database with opponentId:", userId);
        }

        // Broadcast updated player list to lobby
        const playersList = Array.from(lobby.players.values());
        io.to(`lobby-${roomId}`).emit("lobbyUpdate", {
          players: playersList,
        });

        console.log("✅ Emitted lobbyUpdate with players:", playersList);
      } catch (error) {
        console.error("Error joining lobby:", error);
        socket.emit("error", "Failed to join lobby");
      }
    }
  );

  // Player leaves lobby
  socket.on(
    "leaveLobby",
    async ({ roomId, userId }: { roomId: string; userId: string }) => {
      try {
        console.log(`User ${userId} leaving lobby ${roomId}`);

        socket.leave(`lobby-${roomId}`);

        const lobby = lobbyStates.get(roomId);
        if (lobby) {
          lobby.players.delete(userId);

          // Update database if opponent left
          const game = await db.query.games.findFirst({
            where: eq(games.roomId, roomId),
          });

          if (game && game.opponentId === userId) {
            await db
              .update(games)
              .set({ opponentId: null })
              .where(eq(games.id, game.id));
            console.log("✅ Cleared opponentId from database");
          }

          // Broadcast updated player list
          const playersList = Array.from(lobby.players.values());
          io.to(`lobby-${roomId}`).emit("lobbyUpdate", {
            players: playersList,
          });

          // If lobby is empty, clean up
          if (lobby.players.size === 0) {
            cleanupLobbyState(roomId);
            console.log("🧹 Cleaned up empty lobby");
          }
        }
      } catch (error) {
        console.error("Error leaving lobby:", error);
      }
    }
  );

  // Player ready toggle
  socket.on(
    "playerReady",
    async ({
      roomId,
      userId,
      ready,
    }: {
      roomId: string;
      userId: string;
      ready: boolean;
    }) => {
      try {
        console.log(`Player ${userId} ready status: ${ready}`);

        const lobby = lobbyStates.get(roomId);
        if (!lobby) {
          return socket.emit("error", "Lobby not found");
        }

        const player = lobby.players.get(userId);
        if (player) {
          player.ready = ready;

          // Broadcast updated player list
          const playersList = Array.from(lobby.players.values());
          io.to(`lobby-${roomId}`).emit("lobbyUpdate", {
            players: playersList,
          });

          console.log(`✅ Player ${userId} ready: ${ready}`);
        }
      } catch (error) {
        console.error("Error updating ready status:", error);
        socket.emit("error", "Failed to update ready status");
      }
    }
  );

  // Start game (host only)
  socket.on("startGame", async ({ roomId }: { roomId: string }) => {
    try {
      console.log(`🎮 Starting game for room ${roomId}`);

      // Get lobby state first
      const lobby = lobbyStates.get(roomId);
      if (!lobby) {
        console.error("❌ Lobby not found");
        return socket.emit("error", "Lobby not found");
      }

      // ✅ CHECK LOBBY STATE (IN-MEMORY) FOR PLAYER COUNT
      const playerCount = lobby.players.size;
      console.log(`Players in lobby: ${playerCount}`);

      if (playerCount < 2) {
        console.error("❌ Need 2 players to start");
        return socket.emit("error", "Cannot start game - need 2 players");
      }

      // Get game from database
      const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
      });

      if (!game) {
        console.error("❌ Game not found in database");
        return socket.emit("error", "Game not found");
      }

      // Verify host is starting the game
      const hostPlayer = lobby.players.get(game.hostId);
      if (!hostPlayer || hostPlayer.socketId !== socket.id) {
        console.error("❌ Only host can start the game");
        return socket.emit("error", "Only the host can start the game");
      }

      // Check if all players are ready (host doesn't need to be ready)
      const allReady = Array.from(lobby.players.values()).every(
        (p) => p.ready || p.id === game.hostId
      );

      if (!allReady) {
        console.error("❌ Not all players are ready");
        return socket.emit("error", "All players must be ready");
      }

      // Get opponent ID from lobby state
      const opponentId = Array.from(lobby.players.keys()).find(
        (id) => id !== game.hostId
      );

      if (!opponentId) {
        console.error("❌ No opponent found in lobby");
        return socket.emit("error", "Cannot start game - opponent not found");
      }

      console.log(`👥 Players: Host=${game.hostId}, Opponent=${opponentId}`);

      // ✅ UPDATE GAME STATUS TO 'in_progress' IN DATABASE
      await db
        .update(games)
        .set({
          status: "in_progress",
          opponentId: opponentId, // CRITICAL: Set opponent before starting
          startedAt: new Date(),
        })
        .where(eq(games.id, game.id));

      console.log(
        `✅ Game ${roomId} status updated to 'in_progress' with opponentId: ${opponentId}`
      );

      // Notify lobby that game is starting
      io.to(`lobby-${roomId}`).emit("gameStarting", {
        status: "starting",
        roomId,
      });

      console.log(`✅ Emitted gameStarting to lobby-${roomId}`);

      // Clean up lobby state after a short delay (to ensure clients receive the event)
      setTimeout(() => {
        cleanupLobbyState(roomId);
        console.log(`🧹 Cleaned up lobby state for ${roomId}`);
      }, 1000);

      console.log(`✅ Game ${roomId} started successfully`);
    } catch (error) {
      console.error("❌ Error starting game:", error);
      socket.emit("error", "Failed to start game");
    }
  });

  // Cancel game (host only)
  socket.on("cancelGame", async ({ roomId }: { roomId: string }) => {
    try {
      console.log(`🚫 Cancelling game for room ${roomId}`);

      const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
      });

      if (!game) {
        console.error("❌ Game not found");
        return socket.emit("error", "Game not found");
      }

      // Verify host is cancelling the game
      const lobby = lobbyStates.get(roomId);
      if (lobby) {
        const hostPlayer = lobby.players.get(game.hostId);
        if (hostPlayer && hostPlayer.socketId !== socket.id) {
          console.error("❌ Only host can cancel the game");
          return socket.emit("error", "Only the host can cancel the game");
        }
      }

      // ✅ DELETE GAME FROM DATABASE
      await db.delete(games).where(eq(games.id, game.id));

      console.log(`✅ Game ${roomId} deleted from database`);

      // Notify lobby that game is cancelled
      io.to(`lobby-${roomId}`).emit("gameCancelled", {
        status: "cancelled",
        roomId,
      });

      console.log(`✅ Emitted gameCancelled to lobby-${roomId}`);

      // Clean up lobby state
      cleanupLobbyState(roomId);

      console.log(`✅ Game ${roomId} cancelled successfully`);
    } catch (error) {
      console.error("❌ Error cancelling game:", error);
      socket.emit("error", "Failed to cancel game");
    }
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    try {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      // Find which lobby this socket was in
      for (const [roomId, lobby] of lobbyStates.entries()) {
        const disconnectedPlayer = Array.from(lobby.players.values()).find(
          (p) => p.socketId === socket.id
        );

        if (disconnectedPlayer) {
          console.log(
            `Player ${disconnectedPlayer.id} disconnected from lobby ${roomId}`
          );

          lobby.players.delete(disconnectedPlayer.id);

          // Update database if opponent left
          const game = await db.query.games.findFirst({
            where: eq(games.roomId, roomId),
          });

          if (game && game.opponentId === disconnectedPlayer.id) {
            await db
              .update(games)
              .set({ opponentId: null })
              .where(eq(games.id, game.id));
            console.log("✅ Cleared opponentId from database");
          }

          // Broadcast updated player list
          const playersList = Array.from(lobby.players.values());
          io.to(`lobby-${roomId}`).emit("lobbyUpdate", {
            players: playersList,
          });

          // If lobby is empty, clean up
          if (lobby.players.size === 0) {
            cleanupLobbyState(roomId);
            console.log("🧹 Cleaned up empty lobby after disconnect");
          }

          break;
        }
      }
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  });
}
