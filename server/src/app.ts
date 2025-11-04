import express from "express";
import type { Request, Response, Application } from "express";
import { corsMiddleware } from "./middleware/cors.js";
import routes from "./routes/index.js";

export const app: Application = express();

// Apply middleware
app.use(corsMiddleware);
app.use(express.json());

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send("<h1>Memory Game Server</h1>");
});

app.use("/api", routes);

export default app;
