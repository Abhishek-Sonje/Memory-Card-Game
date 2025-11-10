import { Server, Socket } from "socket.io";
import { db } from "../../lib/db.js";
import { games, players, moves, leaderboard } from "@memory-game/shared";
import { eq, sql } from "drizzle-orm";
import { gameStates, cleanupGameState } from "../state/gameState.js";
import { generateCards } from "../../utils/helpers.js";
import { GAME_CONSTANTS } from "../../config/constants.js";

export function registerGameHandlers(io: Server, socket: Socket) {
  // Join game room (after lobby)
socket.on(
  "joinGame",
  async ({
    roomId,
    roomCode,
    userId,
    userName,
  }: {
    roomId?: string;
    roomCode?: string;
    userId: string;
    userName: string;
  }) => {
    try {
      // ✅ Accept both roomId and roomCode for compatibility
      const room = roomId || roomCode;

      if (!room) {
        return socket.emit("error", "Room ID is required");
      }

      console.log(`🎮 User ${userName} (${userId}) joining game ${room}`);

      const game = await db.query.games.findFirst({
        where: eq(games.roomId, room),
      });

      if (!game) {
        console.error(`❌ Game not found for room: ${room}`);
        return socket.emit("error", "Game not found");
      }

      console.log(`📊 Game found:`, {
        gameId: game.id,
        hostId: game.hostId,
        opponentId: game.opponentId,
        status: game.status,
        requestingUserId: userId,
      });

      if (game.status !== "in_progress") {
        console.error(`❌ Game status is ${game.status}, not in_progress`);
        return socket.emit("error", "Game not in progress");
      }

      // ✅ CRITICAL FIX: If opponentId is null but user isn't host, update it
      if (!game.opponentId && game.hostId !== userId) {
        console.log(`⚠️ OpponentId is null, updating with ${userId}`);
        await db
          .update(games)
          .set({ opponentId: userId })
          .where(eq(games.id, game.id));

        // Refresh game data
        game.opponentId = userId;
        console.log(`✅ Updated opponentId to ${userId}`);
      }

      const isHost = game.hostId === userId;
      const isOpponent = game.opponentId === userId;

      // Verify user is part of this game
      if (!isHost && !isOpponent) {
        console.error(
          `❌ User ${userId} not authorized. Host: ${game.hostId}, Opponent: ${game.opponentId}`
        );
        return socket.emit("error", "You are not part of this game");
      }

      socket.join(`game-${room}`);
      console.log(`✅ User ${userId} joined game room: game-${room}`);

      // Initialize game state if not exists
      let gameState = gameStates.get(room);
      if (!gameState) {
        console.log(
          `🎲 Checking if we can initialize game state for room ${room}`
        );

        // ✅ CRITICAL: Refresh game data to ensure we have latest opponentId
        const latestGame = await db.query.games.findFirst({
          where: eq(games.id, game.id),
        });

        if (!latestGame?.opponentId || latestGame.opponentId.trim() === "") {
          console.log(
            `⏳ OpponentId not set yet, sending current state to ${userId}`
          );
          // Don't initialize game state yet - wait for opponent to be set
          // Just acknowledge the join
          socket.emit("waitingForOpponent", {
            message: "Waiting for opponent to join...",
          });
          return;
        }

        console.log(
          `✅ Both players confirmed - Host: ${latestGame.hostId}, Opponent: ${latestGame.opponentId}`
        );

        // Fetch or create players
        let gamePlayers = await db.query.players.findMany({
          where: eq(players.gameId, game.id),
        });

        if (gamePlayers.length === 0) {
          console.log(`👥 Creating players for game ${game.id}`);
          console.log(
            `📝 Inserting players - Host: ${latestGame.hostId}, Opponent: ${latestGame.opponentId}`
          );

          // Create players if they don't exist
          gamePlayers = await db
            .insert(players)
            .values([
              { gameId: game.id, userId: latestGame.hostId, score: 0 },
              { gameId: game.id, userId: latestGame.opponentId, score: 0 },
            ])
            .returning();

          console.log(`✅ Players created successfully`);
        }

        const hostPlayer = gamePlayers.find((p) => p.userId === game.hostId);
        const opponentPlayer = gamePlayers.find(
          (p) => p.userId === game.opponentId
        );

        if (!hostPlayer || !opponentPlayer) {
          console.error(
            `❌ Failed to find players. Host: ${!!hostPlayer}, Opponent: ${!!opponentPlayer}`
          );
          return socket.emit("error", "Failed to initialize players");
        }

        const cards = generateCards();
        gameState = {
          gameId: game.id,
          cards,
          currentTurn: game.hostId,
          flippedCards: [],
          matchedCards: new Set(),
          hostId: game.hostId,
          opponentId: game.opponentId!,
          hostPlayerId: hostPlayer.id,
          opponentPlayerId: opponentPlayer.id,
          isProcessing: false,
          disconnectionTimers: new Map(),
        };

        gameStates.set(room, gameState);

        console.log(`✅ Initialized game state for room ${room}`);

        // Broadcast game started to all players in game room
        io.to(`game-${room}`).emit("gameStarted", {
          deck: cards,
          currentTurn: game.hostId,
        });
      } else {
        console.log(`♻️ Game state already exists for room ${room}`);

        // ✅ HANDLE RECONNECTION - Clear disconnection timer
        const timer = gameState.disconnectionTimers.get(userId);
        if (timer) {
          clearTimeout(timer);
          gameState.disconnectionTimers.delete(userId);
          console.log(
            `✅ User ${userId} reconnected, cleared disconnect timer`
          );

          // Notify other player
          io.to(`game-${room}`).emit("opponentReconnected", { userId });
        }

        // Send current game state to joining/reconnecting player
        console.log(`📤 Sending current game state to ${userId}`);
        socket.emit("gameStarted", {
          deck: gameState.cards,
          currentTurn: gameState.currentTurn,
        });

        // Send matched cards
        socket.emit("syncGameState", {
          matchedCards: Array.from(gameState.matchedCards).map((idx) => ({
            cardId: `card-${idx}`,
            cardValue: gameState!.cards[idx],
          })),
          currentTurn: gameState.currentTurn,
        });
      }

      console.log(`✅ Player ${userName} successfully joined game ${room}`);
    } catch (error) {
      console.error("❌ Error joining game:", error);
      console.error("❌ Full error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        room: roomId || roomCode,
      });
      socket.emit(
        "error",
        `Failed to join game: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);

  // Flip card
  socket.on(
    "flipCard",
    async ({
      roomCode,
      cardId,
      userId,
    }: {
      roomCode: string;
      cardId: string;
      userId: string;
    }) => {
      const cardIndex = parseInt(cardId.split("-")[1] || "-1");
      const gameState = gameStates.get(roomCode);

      if (!gameState) {
        return socket.emit("error", "Game not found");
      }

      if (gameState.isProcessing) {
        return socket.emit("error", "Please wait for current move to complete");
      }

      if (userId !== gameState.currentTurn) {
        return socket.emit("error", "Not your turn");
      }

      if (cardIndex < 0 || cardIndex >= GAME_CONSTANTS.TOTAL_CARDS) {
        return socket.emit("error", "Invalid card index");
      }

      if (gameState.matchedCards.has(cardIndex)) {
        return socket.emit("error", "Card already matched");
      }

      if (gameState.flippedCards.some((f) => f.index === cardIndex)) {
        return socket.emit("error", "Card already flipped this turn");
      }

      try {
        gameState.isProcessing = true;

        const playerId =
          userId === gameState.hostId
            ? gameState.hostPlayerId
            : gameState.opponentPlayerId;

        const existingMoves = await db.query.moves.findMany({
          where: eq(moves.gameId, gameState.gameId),
        });
        const turnNumber = existingMoves.length + 1;

        await db.insert(moves).values({
          gameId: gameState.gameId,
          playerId,
          cardSelected: cardIndex,
          turnNumber,
        });

        gameState.flippedCards.push({
          index: cardIndex,
          playerId: userId,
        });

        io.to(`game-${roomCode}`).emit("cardFlipped", {
          cardId,
          cardValue: gameState.cards[cardIndex],  
          userId,
        });

        if (gameState.flippedCards.length === 2) {
          const [flip1, flip2] = gameState.flippedCards;

          if (!flip1 || !flip2) {
            throw new Error("Invalid flipped cards state");
          }

          const card1Value = gameState.cards[flip1.index];
          const card2Value = gameState.cards[flip2.index];
          const isMatch = card1Value === card2Value;

          if (isMatch) {
            gameState.matchedCards.add(flip1.index);
            gameState.matchedCards.add(flip2.index);

            const [updatedPlayer] = await db
              .update(players)
              .set({ score: sql`${players.score} + 1` })
              .where(eq(players.id, playerId))
              .returning();

            if (!updatedPlayer) {
              throw new Error("Failed to update player score");
            }

            io.to(`game-${roomCode}`).emit("cardsMatched", {
              cardIds: [`card-${flip1.index}`, `card-${flip2.index}`],
              userId,
            });

            await db
              .insert(leaderboard)
              .values({
                userId,
                totalScore: 1,
                totalGamesPlayed: 0,
                totalWins: 0,
                lastPlayedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: leaderboard.userId,
                set: {
                  totalScore: sql`${leaderboard.totalScore} + 1`,
                  lastPlayedAt: new Date(),
                },
              });

            gameState.flippedCards = [];
            gameState.isProcessing = false;

            // Check for game end
            if (gameState.matchedCards.size === GAME_CONSTANTS.TOTAL_CARDS) {
              const allPlayers = await db.query.players.findMany({
                where: eq(players.gameId, gameState.gameId),
              });

              if (allPlayers.length !== 2) {
                throw new Error("Invalid player count");
              }

              const [player1, player2] = allPlayers;
              const winner =
                player1!.score > player2!.score ? player1 : player2;

              await db
                .update(games)
                .set({
                  status: "completed",
                  winnerId: winner!.userId,
                  endedAt: new Date(),
                })
                .where(eq(games.id, gameState.gameId));

              // Update leaderboard for winner
              await db
                .insert(leaderboard)
                .values({
                  userId: winner!.userId,
                  totalScore: 0,
                  totalGamesPlayed: 1,
                  totalWins: 1,
                  lastPlayedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: leaderboard.userId,
                  set: {
                    totalWins: sql`${leaderboard.totalWins} + 1`,
                    totalGamesPlayed: sql`${leaderboard.totalGamesPlayed} + 1`,
                    lastPlayedAt: new Date(),
                  },
                });

              // Update leaderboard for loser
              const loser =
                player1!.userId === winner!.userId ? player2 : player1;
              await db
                .insert(leaderboard)
                .values({
                  userId: loser!.userId,
                  totalScore: 0,
                  totalGamesPlayed: 1,
                  totalWins: 0,
                  lastPlayedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: leaderboard.userId,
                  set: {
                    totalGamesPlayed: sql`${leaderboard.totalGamesPlayed} + 1`,
                    lastPlayedAt: new Date(),
                  },
                });

              io.to(`game-${roomCode}`).emit("gameOver", {
                winner: {
                  name: winner!.userId,
                  score: winner!.score,
                },
              });

              cleanupGameState(roomCode);
            }
          } else {
            io.to(`game-${roomCode}`).emit("cardsMismatch", {
              cardIds: [`card-${flip1.index}`, `card-${flip2.index}`],
            });

            setTimeout(() => {
              gameState.flippedCards = [];
              gameState.currentTurn =
                gameState.currentTurn === gameState.hostId
                  ? gameState.opponentId
                  : gameState.hostId;

              io.to(`game-${roomCode}`).emit("turnChanged", {
                userId: gameState.currentTurn,
              });

              gameState.isProcessing = false;
            }, GAME_CONSTANTS.NO_MATCH_DELAY);
          }
        } else {
          gameState.isProcessing = false;
        }
      } catch (error) {
        console.error("Error flipping card:", error);
        gameState.isProcessing = false;
        gameState.flippedCards = [];
        socket.emit("error", "Failed to flip card");
      }
    }
  );
}
