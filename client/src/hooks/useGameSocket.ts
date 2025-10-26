import { useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
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
  // Reuse the authenticated socket connection
  const { socket, isConnected, isAuthenticated } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !isAuthenticated) return;

    // Join room
    socket.emit("joinRoom", {
      roomCode,
      userId: currentUserId,
      userName: currentUserName,
    });

    // Set up event listeners
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

    // Cleanup function
    return () => {
      socket.emit("leaveRoom", { roomCode, userId: currentUserId });
      socket.off("playerJoined");
      socket.off("playerLeft");
      socket.off("playerReady");
      socket.off("gameStarted");
      socket.off("cardFlipped");
      socket.off("cardsMatched");
      socket.off("cardsMismatch");
      socket.off("turnChanged");
      socket.off("gameOver");
    };
  }, [
    socket,
    isConnected,
    isAuthenticated,
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
  ]);

  // Action methods
  const emitFlipCard = useCallback(
    (cardId: string) => {
      if (socket?.connected) {
        socket.emit("flipCard", {
          roomCode,
          cardId,
          userId: currentUserId,
        });
      }
    },
    [socket, roomCode, currentUserId]
  );

  const emitPlayerReady = useCallback(
    (ready: boolean) => {
      if (socket?.connected) {
        socket.emit("playerReady", {
          roomCode,
          userId: currentUserId,
          ready,
        });
      }
    },
    [socket, roomCode, currentUserId]
  );

  const emitStartGame = useCallback(() => {
    if (socket?.connected) {
      socket.emit("startGame", { roomCode });
    }
  }, [socket, roomCode]);

  return {
    isConnected,
    emitFlipCard,
    emitPlayerReady,
    emitStartGame,
  };
};
