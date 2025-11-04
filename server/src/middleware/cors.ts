import type { Request, Response, NextFunction } from "express";
import { SERVER_CONFIG } from "../config/constants.js";

export const corsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.header("Access-Control-Allow-Origin", SERVER_CONFIG.FRONTEND_URL);
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
};
