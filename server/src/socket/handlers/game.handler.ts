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
      roomCode,
      userId,
      userName,
    }: {
      roomCode: string;
      userId: string;
      userName: string;
    }) => {
      try {
        console.log(`User ${userName} joining game ${roomCode}`);

        const game = await db.query.games.findFirst({
          where: eq(games.roomId, roomCode),
        });

        if (!game) {
          return socket.emit("error", "Game not found");
        }

        if (game.status !== "in_progress") {
          return socket.emit("error", "Game not in progress");
        }

        // Verify user is part of this game
        if (userId !== game.hostId && userId !== game.opponentId) {
          return socket.emit("error", "You are not part of this game");
        }

        socket.join(`game-${roomCode}`);
        console.log(`✅ User ${userId} joined game room: game-${roomCode}`);

        // Initialize game state if not exists
        let gameState = gameStates.get(roomCode);
        if (!gameState) {
          // Fetch or create players
          let gamePlayers = await db.query.players.findMany({
            where: eq(players.gameId, game.id),
          });

          if (gamePlayers.length === 0) {
            // Create players if they don't exist
            gamePlayers = await db
              .insert(players)
              .values([
                { gameId: game.id, userId: game.hostId, score: 0 },
                { gameId: game.id, userId: game.opponentId!, score: 0 },
              ])
              .returning();
          }

          const hostPlayer = gamePlayers.find((p) => p.userId === game.hostId);
          const opponentPlayer = gamePlayers.find(
            (p) => p.userId === game.opponentId
          );

          if (!hostPlayer || !opponentPlayer) {
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

          gameStates.set(roomCode, gameState);

          console.log(`✅ Initialized game state for room ${roomCode}`);

          // Broadcast game started to all players in game room
          io.to(`game-${roomCode}`).emit("gameStarted", {
            deck: cards.map((_, index) => `card-${index}`),
            currentTurn: game.hostId,
          });
        } else {
          // ✅ HANDLE RECONNECTION - Clear disconnection timer
          const timer = gameState.disconnectionTimers.get(userId);
          if (timer) {
            clearTimeout(timer);
            gameState.disconnectionTimers.delete(userId);
            console.log(
              `✅ User ${userId} reconnected, cleared disconnect timer`
            );

            // Notify other player
            io.to(`game-${roomCode}`).emit("opponentReconnected", { userId });
          }

          // Send current game state to joining/reconnecting player
          socket.emit("gameStarted", {
            deck: gameState.cards.map((_, index) => `card-${index}`),
            currentTurn: gameState.currentTurn,
          });

          // Send matched cards
          socket.emit("syncGameState", {
            matchedCards: Array.from(gameState.matchedCards),
            currentTurn: gameState.currentTurn,
          });
        }

        console.log(`Player ${userName} joined game ${roomCode}`);
      } catch (error) {
        console.error("Error joining game:", error);
        socket.emit("error", "Failed to join game");
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
