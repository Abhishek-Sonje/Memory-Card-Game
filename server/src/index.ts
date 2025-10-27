import express from "express";
import type { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { db } from "./lib/db.ts";
import { games, leaderboard, moves, players } from "@memory-game/shared";
import { and, eq, sql } from "drizzle-orm";

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  },
});

// Constants
const CARD_PAIRS = 8;
const TOTAL_CARDS = CARD_PAIRS * 2;
const NO_MATCH_DELAY = 2000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware for Socket.IO authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;

  if (!token || !userId) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    if (decoded.userId !== userId) {
      return next(new Error("Token user mismatch"));
    }
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return next(new Error("Invalid token"));
  }
});

app.get("/", (req: Request, res: Response) => {
  res.send("<h1>Memory Game Server</h1>");
});

// Authentication endpoint to generate JWT tokens
app.post("/api/auth/token", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });

    res.json({ token, userId });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

server.listen(3002, () => {
  console.log("server running at http://localhost:3002");
});

interface GameState {
  gameId: string;
  cards: number[];
  currentTurn: string;
  flippedCards: { index: number; playerId: string }[];
  matchedCards: Set<number>;
  hostId: string;
  opponentId: string;
  hostPlayerId: string;
  opponentPlayerId: string;
  isProcessing: boolean;
}

const gameStates = new Map<string, GameState>();

app.post("/api/games", async (req, res) => {
  try {
    console.log("Creating game with body:", req.body);
    const { userId, roomId } = req.body;
    if (!userId || !roomId) {
      return res.status(400).json({ error: "Missing roomId or userId" });
    }

    // Check if game already exists
    const existingGame = await db.query.games.findFirst({
      where: eq(games.roomId, roomId),
    });

    if (existingGame) {
      console.log("Game already exists:", existingGame);
      return res.json(existingGame);
    }

    const newGame = {
      hostId: userId,
      roomId,
      status: "waiting" as const,
    };

    console.log("Inserting new game:", newGame);

    const [game] = await db.insert(games).values(newGame).returning();

    console.log("Game created successfully:", game);

    res.json(game);
  } catch (error) {
    console.error("Error in /api/games:", error);
   
     return res.status(500).json({
       error: "Failed to create game",
       details: error instanceof Error ? error.message : "Unknown error",
     });
  }
});

function generateCards(): number[] {
  const pairs = Array.from({ length: CARD_PAIRS }, (_, i) => i);
  const deck = [...pairs, ...pairs];

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i]!, deck[j]!] = [deck[j]!, deck[i]!];
  }

  return deck;
}

function cleanupGameState(roomId: string) {
  gameStates.delete(roomId);
  console.log(`Cleaned up game state for room: ${roomId}`);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.data.userId);

  // Host creates and joins game
  // Add these event handlers to your io.on("connection", ...) block

  // 1. Add joinRoom handler (client expects this)
  socket.on(
    "joinRoom",
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
        const game = await db.query.games.findFirst({
          where: eq(games.roomId, roomCode),
        });

        if (!game) {
          return socket.emit("error", "Game not found");
        }

        socket.join(roomCode);

        // Notify others that player joined
        socket.to(roomCode).emit("playerJoined", {
          id: userId,
          name: userName,
        });

        // If this is the opponent joining
        if (game.hostId !== userId && !game.opponentId) {
          await db
            .update(games)
            .set({ opponentId: userId })
            .where(eq(games.id, game.id));
        }
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("error", "Failed to join room");
      }
    }
  );

  // 2. Add leaveRoom handler
  socket.on(
    "leaveRoom",
    async ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      socket.leave(roomCode);
      socket.to(roomCode).emit("playerLeft", { userId });
    }
  );

  // 3. Add playerReady handler
  socket.on(
    "playerReady",
    async ({
      roomCode,
      userId,
      ready,
    }: {
      roomCode: string;
      userId: string;
      ready: boolean;
    }) => {
      io.to(roomCode).emit("playerReady", { userId, ready });
    }
  );

  // 4. Add startGame handler (this replaces your joinGame logic)
  socket.on("startGame", async ({ roomCode }: { roomCode: string }) => {
    try {
      const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomCode),
      });

      if (!game || !game.opponentId) {
        return socket.emit("error", "Cannot start game");
      }

      // Update game status
      await db
        .update(games)
        .set({ status: "in_progress" })
        .where(eq(games.id, game.id));

      // Create players
      const insertedPlayers = await db
        .insert(players)
        .values([
          { gameId: game.id, userId: game.hostId, score: 0 },
          { gameId: game.id, userId: game.opponentId, score: 0 },
        ])
        .returning();

      const hostPlayer = insertedPlayers.find((p) => p.userId === game.hostId);
      const opponentPlayer = insertedPlayers.find(
        (p) => p.userId === game.opponentId
      );

      if (!hostPlayer || !opponentPlayer) {
        return socket.emit("error", "Failed to create players");
      }

      const cards = generateCards();
      gameStates.set(roomCode, {
        gameId: game.id,
        cards,
        currentTurn: game.hostId,
        flippedCards: [],
        matchedCards: new Set(),
        hostId: game.hostId,
        opponentId: game.opponentId,
        hostPlayerId: hostPlayer.id,
        opponentPlayerId: opponentPlayer.id,
        isProcessing: false,
      });

      // Send deck as card IDs (strings) and currentTurn
      io.to(roomCode).emit("gameStarted", {
        deck: cards.map((_, index) => `card-${index}`),
        currentTurn: game.hostId,
      });
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("error", "Failed to start game");
    }
  });

  // 5. Update flipCard to use cardId instead of cardIndex
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
      // Extract index from cardId (format: "card-0", "card-1", etc.)
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

      if (cardIndex < 0 || cardIndex >= TOTAL_CARDS) {
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

        // Emit with cardId format
        io.to(roomCode).emit("cardFlipped", {
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

            // Emit cardsMatched with cardIds
            io.to(roomCode).emit("cardsMatched", {
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
            if (gameState.matchedCards.size === TOTAL_CARDS) {
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

              io.to(roomCode).emit("gameOver", {
                winner: {
                  name: winner!.userId,
                  score: winner!.score,
                },
              });

              cleanupGameState(roomCode);
            }
          } else {
            // No match - emit cardsMismatch
            io.to(roomCode).emit("cardsMismatch", {
              cardIds: [`card-${flip1.index}`, `card-${flip2.index}`],
            });

            setTimeout(() => {
              gameState.flippedCards = [];
              gameState.currentTurn =
                gameState.currentTurn === gameState.hostId
                  ? gameState.opponentId
                  : gameState.hostId;

              io.to(roomCode).emit("turnChanged", {
                userId: gameState.currentTurn,
              });

              gameState.isProcessing = false;
            }, NO_MATCH_DELAY);
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
});
