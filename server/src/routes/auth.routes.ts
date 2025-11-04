import express,{ Router } from "express";
import { generateToken } from "../controllers/auth.controller.js";

const router:Router = express.Router();

router.post("/token", generateToken);

export default router;
