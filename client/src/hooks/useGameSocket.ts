import { useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";

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
  setWaiting?: (waiting: boolean) => void;
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
  setWaiting,

}: UseGameSocketProps) => {
  const { socket, isConnected, isAuthenticated } = useSocket();

  // Set up event listeners (but DON'T emit joinRoom here)
  useEffect(() => {
    if (!socket || !isConnected || !isAuthenticated) {
      console.log("⏳ Waiting for socket connection...", {
        hasSocket: !!socket,
        isConnected,
        isAuthenticated,
      });
      return;
    }

    console.log("📥 Setting up game event listeners for room:", roomCode);

    // Set up event listeners
    socket.on("playerJoined", (data: { id: string; name: string }) => {
      console.log("👤 Player joined:", data);
      onPlayerJoined(data);
    });

     socket.on("waitingForOpponent", (data) => {
       console.log("⏳ Waiting for opponent...", data.message);
       // Could show a loading state or retry after a delay
       setWaiting && setWaiting(true);
       setTimeout(() => {
         socket.emit("joinGame", { roomCode, userId: currentUserId, userName: currentUserName });
       }, 1000); // Retry after 1 second
     });

    socket.on("playerLeft", (data: { userId: string }) => {
      console.log("👋 Player left:", data.userId);
      onPlayerLeft(data.userId);
    });

    socket.on("playerReady", (data: { userId: string; ready: boolean }) => {
      console.log("✓ Player ready:", data);
      onPlayerReady(data.userId, data.ready);
    });

   

    socket.on(
      "gameStarted",
      (data: { deck?: string[]; currentTurn?: string }) => {
        console.log("🎮 Game started:", data);
        onGameStarted(data);
      }
    );

    socket.on("cardFlipped", (data: { cardId: string; userId: string }) => {
      console.log("🃏 Card flipped:", data);
      onCardFlipped(data.cardId, data.userId);
    });

    socket.on("cardsMatched", (data: { cardIds: string[]; userId: string }) => {
      console.log("✅ Cards matched:", data);
      onCardsMatched(data.cardIds, data.userId);
    });

    socket.on("cardsMismatch", (data: { cardIds: string[] }) => {
      console.log("❌ Cards mismatch:", data);
      onCardsMismatch(data.cardIds);
    });

    socket.on("turnChanged", (data: { userId: string }) => {
      console.log("🔄 Turn changed:", data);
      onTurnChanged(data.userId);
    });

    socket.on(
      "gameOver",
      (data: { winner: { name: string; score: number } }) => {
        console.log("🏆 Game over:", data);
        onGameOver(data.winner);
      }
    );

    // Game-specific events from your updated server
    socket.on("syncGameState", (data) => {
      console.log("🔄 Syncing game state:", data);
      // Handle matched cards sync
      if (data.matchedCards && data.matchedCards.length > 0) {
        const cardIds = data.matchedCards.map((idx: number) => `card-${idx}`);
        onCardsMatched(cardIds, "");
      }
      if (data.currentTurn) {
        onTurnChanged(data.currentTurn);
      }
    });

    socket.on("opponentReconnected", ({ userId }) => {
      console.log("✅ Opponent reconnected:", userId);
    });

    socket.on("opponentDisconnected", ({ userId, message }) => {
      console.log("⚠️ Opponent disconnected:", message);
    });

    socket.on("gameInProgress", ({ message, roomId, gameId }) => {
      console.log("⚠️ Game in progress:", message);
    });

    // Handle errors from server
    socket.on("error", (message: string) => {
      console.error("❌ Socket error:", message);
    });

    // Cleanup function - ONLY remove listeners, don't leave room
    return () => {
      console.log("🧹 Cleaning up game event listeners");
      socket.off("playerJoined");
      socket.off("playerLeft");
      socket.off("playerReady");
      socket.off("gameStarted");
      socket.off("cardFlipped");
      socket.off("cardsMatched");
      socket.off("cardsMismatch");
      socket.off("turnChanged");
      socket.off("gameOver");
      socket.off("syncGameState");
      socket.off("opponentReconnected");
      socket.off("opponentDisconnected");
      socket.off("gameInProgress");
      socket.off("error");

      // ⚠️ DON'T emit leaveRoom here - let the user explicitly leave
    };
  }, [
    socket,
    isConnected,
    isAuthenticated,
    roomCode,
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
  const emitJoinGame = useCallback(() => {
    if (!socket || !isConnected) {
      console.warn("⚠️ Cannot join game - socket not connected");
      return;
    }
    console.log("📤 Emitting joinGame:", {
      roomCode,
      currentUserId,
      currentUserName,
    });
    socket.emit("joinGame", {
      roomCode,
      userId: currentUserId,
      userName: currentUserName,
    });
  }, [socket, isConnected, roomCode, currentUserId, currentUserName]);

  const emitFlipCard = useCallback(
    (cardId: string) => {
      if (!socket?.connected) {
        console.warn("⚠️ Cannot flip card - socket not connected");
        return;
      }
      console.log("📤 Emitting flipCard:", { roomCode, cardId, currentUserId });
      socket.emit("flipCard", {
        roomCode,
        cardId,
        userId: currentUserId,
      });
    },
    [socket, roomCode, currentUserId]
  );

  const emitPlayerReady = useCallback(
    (ready: boolean) => {
      if (!socket?.connected) {
        console.warn("⚠️ Cannot set ready - socket not connected");
        return;
      }
      console.log("📤 Emitting playerReady:", {
        roomCode,
        currentUserId,
        ready,
      });
      socket.emit("playerReady", {
        roomCode,
        userId: currentUserId,
        ready,
      });
    },
    [socket, roomCode, currentUserId]
  );

  const emitStartGame = useCallback(() => {
    if (!socket?.connected) {
      console.warn("⚠️ Cannot start game - socket not connected");
      return;
    }
    console.log("📤 Emitting startGame:", { roomCode });
    socket.emit("startGame", { roomCode });
  }, [socket, roomCode]);

  return {
    isConnected,
    emitFlipCard,
    emitPlayerReady,
    emitStartGame,
    emitJoinGame,
  };
};
