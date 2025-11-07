import express, { Router } from "express";
import {
  createGame,
  getGameByRoomId,
  getLeaderboard,
  updateGame,
} from "../controllers/game.controller.js";

const router: Router = express.Router();

router.post("/games", createGame);
router.get("/:roomId/game", getGameByRoomId);
router.patch("/games/:roomId", updateGame);
router.get("/leaderboard", getLeaderboard);

export default router;
