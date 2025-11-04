import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "../config/jwt.js";

export const generateToken = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const token = jwt.sign({ userId }, JWT_CONFIG.SECRET, {
      expiresIn: JWT_CONFIG.EXPIRES_IN,
    });
    res.json({ token, userId });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
};
