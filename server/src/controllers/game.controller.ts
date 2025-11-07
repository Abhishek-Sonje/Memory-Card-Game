import type { Request, Response } from "express";
import { db } from "../lib/db.js";
import { games, leaderboard, users } from "@memory-game/shared";
import { and, eq, or } from "drizzle-orm";
import { generateRoomId } from "../utils/helpers.js";

export const createGame = async (req: Request, res: Response) => {
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

    const roomId = generateRoomId();
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
};

export const getGameByRoomId = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const game = await db.query.games.findFirst({
      where: eq(games.roomId, roomId!),
    });
    console.log("game founded", game);

    if (!game) {
      console.log("game not found");
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({ game });
  } catch (error) {
    console.error("Error in /api/games/:roomId:", error);
    res.status(500).json({ error: "Failed to fetch game" });
  }
};

export const updateGame = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { status, opponentId } = req.body;

    const game = await db.query.games.findFirst({
      where: eq(games.roomId, roomId!),
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
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const leaderboardData = await db
      .select({
        id: leaderboard.id,
        userId: leaderboard.userId,
        userName: users.name,
        totalGamesPlayed: leaderboard.totalGamesPlayed,
        totalWins: leaderboard.totalWins,
        totalScore: leaderboard.totalScore,
      })
      .from(leaderboard)
      .innerJoin(users, eq(leaderboard.userId, users.id));;
    res.json({ leaderboard: leaderboardData });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
};
