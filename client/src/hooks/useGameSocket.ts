import { useEffect, useRef } from "react";
import type { Player, GameCard, Scores } from "../types/games.type";

interface UseGameSocketProps {
  roomCode: string;
  currentUserId: string;
  currentUserName: string;
  onPlayerJoined: (player: { id: string; name: string }) => void;
  onPlayerLeft: (userId: string) => void;
  onPlayerReady: (userId: string, ready: boolean) => void;
  onGameStarted: (data: { deck?: string[]; currentTurn?: string }) => void;
  onCardFlipped: (cardId: string, userId: string) => void;
  onCardsMatched: (cardIds: string[], userId: string) => void;
  onCardsMismatch: (cardIds: string[]) => void;
  onTurnChanged: (userId: string) => void;
  onGameOver: (winner: { name: string; score: number }) => void;
}

export const useGameSocket = ({
  roomCode,
  currentUserId,
  currentUserName,
  onPlayerJoined,
  onPlayerLeft,
  onPlayerReady,
  onGameStarted,
  onCardFlipped,
  onCardsMatched,
  onCardsMismatch,
  onTurnChanged,
  onGameOver,
}: UseGameSocketProps) => {
  const socketRef = useRef<any>(null);
  const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const io = require("socket.io-client");
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: false,
    });

    const socket = socketRef.current;

    // Connect and join room
    socket.connect();
    socket.emit("joinRoom", {
      roomCode,
      userId: currentUserId,
      userName: currentUserName,
    });

    // Socket event listeners
    socket.on("playerJoined", (data: { id: string; name: string }) => {
      onPlayerJoined(data);
    });

    socket.on("playerLeft", (data: { userId: string }) => {
      onPlayerLeft(data.userId);
    });

    socket.on("playerReady", (data: { userId: string; ready: boolean }) => {
      onPlayerReady(data.userId, data.ready);
    });

    socket.on(
      "gameStarted",
      (data: { deck?: string[]; currentTurn?: string }) => {
        onGameStarted(data);
      }
    );

    socket.on("cardFlipped", (data: { cardId: string; userId: string }) => {
      onCardFlipped(data.cardId, data.userId);
    });

    socket.on("cardsMatched", (data: { cardIds: string[]; userId: string }) => {
      onCardsMatched(data.cardIds, data.userId);
    });

    socket.on("cardsMismatch", (data: { cardIds: string[] }) => {
      onCardsMismatch(data.cardIds);
    });

    socket.on("turnChanged", (data: { userId: string }) => {
      onTurnChanged(data.userId);
    });

    socket.on(
      "gameOver",
      (data: { winner: { name: string; score: number } }) => {
        onGameOver(data.winner);
      }
    );

    return () => {
      socket.emit("leaveRoom", { roomCode, userId: currentUserId });
      socket.disconnect();
    };
  }, [roomCode, currentUserId, currentUserName]);

  // Socket action methods
  const emitFlipCard = (cardId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("flipCard", {
        roomCode,
        cardId,
        userId: currentUserId,
      });
    }
  };

  const emitPlayerReady = (ready: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("playerReady", {
        roomCode,
        userId: currentUserId,
        ready,
      });
    }
  };

  const emitStartGame = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("startGame", { roomCode });
    }
  };

  const isConnected = () => socketRef.current?.connected || false;

  return {
    socket: socketRef.current,
    isConnected,
    emitFlipCard,
    emitPlayerReady,
    emitStartGame,
  };
};
