import express, { Router } from "express";
import {
  createGame,
  getGameByRoomId,
  updateGame,
} from "../controllers/game.controller.js";

const router: Router = express.Router();

router.post("/games", createGame);
router.get("/:roomId/game", getGameByRoomId);
router.patch("/games/:roomId", updateGame);

export default router;
