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
        console.log("📥 RAW JOIN LOBBY DATA:", {
          received: { roomId, userId, userName },
          types: {
            roomId: typeof roomId,
            userId: typeof userId,
            userName: typeof userName,
          },
          socketId: socket.id,
        });

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

        let game = await db.query.games.findFirst({
          where: eq(games.roomId, roomId),
        });

        if (!game) {
          console.log("findFirst failed, trying select()");
          const result = await db
            .select()
            .from(games)
            .where(eq(games.roomId, roomId))
            .limit(1);
          game = result[0];
        }

        console.log("Game found?", !!game, game);

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
          console.log("Updated database with opponentId");
        }

        // Broadcast updated player list to lobby
        const playersList = Array.from(lobby.players.values());
        io.to(`lobby-${roomId}`).emit("lobbyUpdate", {
          players: playersList,
        });

        console.log("Emitted lobbyUpdate with players:", playersList);
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

          // Broadcast updated player list
          const playersList = Array.from(lobby.players.values());
          io.to(`lobby-${roomId}`).emit("lobbyUpdate", {
            players: playersList,
          });

          // If lobby is empty, clean up
          if (lobby.players.size === 0) {
            cleanupLobbyState(roomId);
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
      console.log(`Starting game for room ${roomId}`);

      const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
      });

      if (!game || !game.opponentId) {
        return socket.emit("error", "Cannot start game - need 2 players");
      }

      const lobby = lobbyStates.get(roomId);
      if (!lobby) {
        return socket.emit("error", "Lobby not found");
      }

      // Check if all players are ready
      const allReady = Array.from(lobby.players.values()).every(
        (p) => p.ready || p.id === game.hostId
      );

      if (!allReady) {
        return socket.emit("error", "All players must be ready");
      }

      // ✅ UPDATE GAME STATUS TO 'in_progress' IN DATABASE
      await db
        .update(games)
        .set({
          status: "in_progress",
          startedAt: new Date(),
        })
        .where(eq(games.id, game.id));

      console.log(`✅ Game ${roomId} status updated to 'in_progress'`);

      // Notify lobby that game is starting
      io.to(`lobby-${roomId}`).emit("gameStarting", {
        status: "starting",
        roomId,
      });

      // Clean up lobby state
      cleanupLobbyState(roomId);

      console.log(`Game ${roomId} started successfully`);
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("error", "Failed to start game");
    }
  });
}
