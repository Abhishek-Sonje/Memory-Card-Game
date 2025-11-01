import express from "express";
import type { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { db } from "./lib/db.ts";
import { games, leaderboard, moves, players } from "@memory-game/shared";
import { and, eq, or, sql } from "drizzle-orm";

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
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

// ============================================
// INTERFACES & STATE MANAGEMENT
// ============================================

interface Player {
  id: string;
  name: string;
  ready: boolean;
}

interface LobbyState {
  roomId: string;
  hostId: string;
  players: Map<string, Player>;
}

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

const lobbyStates = new Map<string, LobbyState>();
const gameStates = new Map<string, GameState>();

// ============================================
// REST API ENDPOINTS
// ============================================

// Create a new game
app.post("/api/games", async (req, res) => {
  try {
    console.log("Creating game with body:", req.body);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Check if user is already in a game
    const existingGame = await db.query.games.findFirst({
      where: and(
        or(eq(games.hostId, userId), eq(games.opponentId, userId)),
        or(eq(games.status, "waiting"), eq(games.status, "in_progress"))
      ),
    });

    if (existingGame) {
      return res.status(400).json({ error: "User is already in a game" });
    }

    const roomId = `ROOM-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
    console.log("Generated roomId:", roomId);

    const newGame = {
      hostId: userId,
      roomId,
      status: "waiting" as const,
    };

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

// Get game by roomId
app.get("/api/:roomId/game", async (req, res) => {
  try {
    const { roomId } = req.params;

    const game = await db.query.games.findFirst({
      where: eq(games.roomId, roomId),
    });
    console.log("game founded",game);

    if (!game) {
      console.log("game not foundddddddd")
      return res.status(404).json({ error: "Game not founddddddddddddd" });
    }

    res.json({ game });
  } catch (error) {
    console.error("Error in /api/games/:roomId:", error);
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

// Update game status
app.patch("/api/games/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status, opponentId } = req.body;

    const game = await db.query.games.findFirst({
      where: eq(games.roomId, roomId),
    });

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (opponentId) updateData.opponentId = opponentId;

    const [updatedGame] = await db
      .update(games)
      .set(updateData)
      .where(eq(games.id, game.id))
      .returning();

    res.json({ game: updatedGame });
  } catch (error) {
    console.error("Error updating game:", error);
    res.status(500).json({ error: "Failed to update game" });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

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

function cleanupLobbyState(roomId: string) {
  lobbyStates.delete(roomId);
  console.log(`Cleaned up lobby state for room: ${roomId}`);
}

function cleanupGameState(roomId: string) {
  gameStates.delete(roomId);
  console.log(`Cleaned up game state for room: ${roomId}`);
}

// ============================================
// SOCKET.IO EVENT HANDLERS
// ============================================

io.on("connection", (socket) => {
  console.log("User connected:", socket.data.userId);

  // ==========================================
  // LOBBY EVENTS
  // ==========================================

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
        console.log(`User ${userName} joining lobby ${roomId}`);

        const game = await db.query.games.findFirst({
          where: eq(games.roomId, roomId),
        });

        if (!game) {
          return socket.emit("error", "Game not found");
        }

        if (game.status !== "waiting") {
          return socket.emit("error", "Game already started");
        }

        socket.join(`lobby-${roomId}`);

        // Initialize or get lobby state
        let lobby = lobbyStates.get(roomId);
        if (!lobby) {
          lobby = {
            roomId,
            hostId: game.hostId,
            players: new Map(),
          };
          lobbyStates.set(roomId, lobby);
        }

        // Add player to lobby
        lobby.players.set(userId, {
          id: userId,
          name: userName,
          ready: false,
        });

        // If this is opponent joining, update database
        if (game.hostId !== userId && !game.opponentId) {
          await db
            .update(games)
            .set({ opponentId: userId })
            .where(eq(games.id, game.id));
        }

        // Broadcast updated player list to lobby
        const playersList = Array.from(lobby.players.values());
        io.to(`lobby-${roomId}`).emit("lobbyUpdate", {
          players: playersList,
        });

        console.log(`Lobby ${roomId} now has ${playersList.length} players`);
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

      // Notify lobby that game is starting
      io.to(`lobby-${roomId}`).emit("gameStarting", { status: "starting" });

      // Clean up lobby state
      cleanupLobbyState(roomId);

      console.log(`Game ${roomId} started successfully`);
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("error", "Failed to start game");
    }
  });

  // ==========================================
  // GAME EVENTS
  // ==========================================

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

        socket.join(`game-${roomCode}`);

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
          };

          gameStates.set(roomCode, gameState);

          // Broadcast game started to all players in game room
          io.to(`game-${roomCode}`).emit("gameStarted", {
            deck: cards.map((_, index) => `card-${index}`),
            currentTurn: game.hostId,
          });
        } else {
          // Send current game state to joining player
          socket.emit("gameStarted", {
            deck: gameState.cards.map((_, index) => `card-${index}`),
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

  // Handle disconnect
  // Handle disconnect
  socket.on("disconnect", () => {
    const userId = socket.data.userId;
    console.log("User disconnected:", userId);

    // Find which rooms the user was in and clean up

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

        // If the host disconnected, you might want to end the game
        if (lobby.hostId === userId && lobby.players.size > 0) {
          io.to(`lobby-${roomId}`).emit("hostDisconnected", {
            message: "Host has left the lobby",
          });
          // Optionally: delete the game from database
        }
      }
    }

    // 2. Clean up active game states
    for (const [roomId, gameState] of gameStates.entries()) {
      if (gameState.hostId === userId || gameState.opponentId === userId) {
        console.log(`Player ${userId} disconnected from active game ${roomId}`);

        // Notify other player
        io.to(`game-${roomId}`).emit("opponentDisconnected", {
          userId,
          message: "Your opponent has disconnected",
        });

        // Update game status in database (optional - mark as abandoned)
        db.update(games)
          .set({
            status: "completed",
            endedAt: new Date(),
            // You could add a "disconnected" field or handle winner logic
          })
          .where(eq(games.roomId, roomId))
          .catch((err) =>
            console.error("Error updating game on disconnect:", err)
          );

        // Clean up game state
        cleanupGameState(roomId);
      }
    }
  });
});
