import express from "express";
import type { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());
const server = createServer(app);

const io = new Server(server, { cors: { origin: "http://localhost:3001" } });

const gameStates = new Map<
  string,
  { cards: number[]; currentTurn: string; flippedCards: number[] }
>();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
    };
    socket.data.userId = decoded.sub;
    next();
  } catch (err) {
    next(new Error("Auth error"));
  }
});

app.get("/", (req: Request, res: Response) => {
  res.send("<h1>Hello world</h1>");
});

server.listen(3001, () => {
  console.log("server running at http://localhost:3001");
});
