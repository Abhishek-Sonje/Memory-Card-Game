import express, { Router } from "express";
import authRoutes from "./auth.routes.js";
import gameRoutes from "./game.routes.js";

const router: Router = express.Router();

router.use("/auth", authRoutes);
router.use("/", gameRoutes);

export default router;
