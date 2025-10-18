import express from "express";
import type { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { db } from "./lib/db.ts";
import { games, players } from "@memory-game/shared";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:3000", credentials: true },
});

io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error("Authentication required"));
  }
  socket.data.userId = userId;
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.send("<h1>Hello world</h1>");
});

server.listen(3001, () => {
  console.log("server running at http://localhost:3001");
});

interface GameState {
  gameId: string;
  cards: number[];
  currentTurn: string;
  flippedCards: { index: number; playerId: string }[];
  hostId: string;
  opponentId: string;
  isProcessing: boolean;
}

const gameStates = new Map<string, GameState>();

app.post("/api/games", async (req, res) => {
  try {
    const { userId, roomId } = req.body;
    if (!userId || !roomId) {
      return res.status(400).json({ error: "Missing roomId or userId" });
    }

    const newGame = {
      hostId: userId,
      roomId,
      status: "waiting" as const,
    };
    const [game] = await db.insert(games).values(newGame).returning();
    res.json(game);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create game" });
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.data.userId);

  socket.on("joinGame", async (roomId: string) => {
    try {
      const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
      });

      if (!game) {
        return socket.emit("error", "Game not found");
      }

      if (game.status !== "waiting") {
        return socket.emit("error", "Game has already started");
      }

      if (game.opponentId) {
        return socket.emit("error", "Game is full");
      }

      await db
        .update(games)
        .set({ opponentId: socket.data.userId, status: "in_progress" })
        .where(eq(games.id, game.id));

      socket.join(roomId);

      const [hostPlayer, opponentPlayer] = await db
        .insert(players)
        .values([
          { gameId: game.id, userId: game.hostId, score: 0 },
          { gameId: game.id, userId: socket.data.userId, score: 0 },
        ])
        .returning();

      const cards = generateCards();
      gameStates.set(roomId, {
        gameId: game.id,
        cards,
        currentTurn: game.hostId,
        flippedCards: [],
        hostId: game.hostId,
        opponentId: socket.data.userId,
        isProcessing: false,
      });

      io.to(roomId).emit("gameStarted", {
        gameId: game.id,
        cards: cards.map(() => null), // Don't send actual values
        players: {
          host: hostPlayer ? { id: hostPlayer.userId, score: 0 } : null,
          opponent: opponentPlayer
            ? { id: opponentPlayer.userId, score: 0 }
            : null,
        },
        currentTurn: game.hostId,
      });
    } catch (error) {
      console.error(error);
      return socket.emit("error", "Failed to join game");
    }
  });
});
