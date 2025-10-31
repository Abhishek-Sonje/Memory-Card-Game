"use client";

import React, { useEffect, useRef, useState, use } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { useGameLogic } from "../hooks/useGameLogic";
import { usePlayerManagement } from "../hooks/usePlayerManagement";
import MobileDrawer from "./Lobby/MobileDrawer";
import GameBoard from "./Lobby/GameBoard";
import SidePanel from "./Lobby/SidePanel";
import Header from "./Lobby/Header";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSocket } from "../hooks/useSocket";

export default function GamePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { isConnected } = useSocket();

  const userId = session?.user?.id || "guest-id";
  const userName = session?.user?.name || "Guest";

  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refs for socket actions to avoid circular dependencies
  const emitFlipCardRef = useRef<(cardId: string) => void>(() => {});
  const emitPlayerReadyRef = useRef<(ready: boolean) => void>(() => {});
  const hasJoinedGameRef = useRef(false); // ✅ Track if already joined

  // Verify game exists and is in progress
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${roomId}`);
        if (!response.ok) {
          console.error("Game not found");
          router.push("/");
          return;
        }
        const data = await response.json();

        if (data.game.status !== "in_progress") {
          console.log("Game not in progress, redirecting to lobby");
          router.push(`/${roomId}/lobby`);
          return;
        }

        setGameData(data.game);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching game:", error);
        router.push("/");
      }
    };

    fetchGame();
  }, [roomId, router]);

  // Game Logic
  const gameLogic = useGameLogic({
    isConnected,
    emitFlipCard: (cardId: string) => emitFlipCardRef.current(cardId),
  });

  // Player Management
  const playerManager = usePlayerManagement({
    currentUserId: userId,
    currentUserName: userName,
    emitPlayerReady: (ready: boolean) => emitPlayerReadyRef.current(ready),
  });

  // Initialize Socket for GAME room (not lobby)
  const socketActions = useGameSocket({
    roomCode: roomId,
    currentUserId: userId,
    currentUserName: userName,
    onPlayerJoined: (player) => playerManager.handlePlayerJoined(player),
    onPlayerLeft: (userId) => playerManager.handlePlayerLeft(userId),
    onPlayerReady: (userId, ready) =>
      playerManager.handlePlayerReady(userId, ready),
    onGameStarted: (data) =>
      gameLogic.handleGameStarted(data, gameData?.hostId),
    onCardFlipped: (cardId) => gameLogic.handleCardFlipped(cardId),
    onCardsMatched: (cardIds, userId) =>
      gameLogic.handleCardsMatched(cardIds, userId),
    onCardsMismatch: () => gameLogic.handleCardsMismatch(),
    onTurnChanged: (userId) => gameLogic.handleTurnChanged(userId),
    onGameOver: (winner) => {
      alert(`Game Over! Winner: ${winner.name} with ${winner.score} pairs!`);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    },
    // onOpponentDisconnected: (data) => {
    //   alert("Your opponent disconnected. Waiting for reconnection...");
    // },
    // onOpponentReconnected: (data) => {
    //   alert("Your opponent reconnected!");
    // },
  });

  // Update refs when socket actions are ready
  useEffect(() => {
    emitFlipCardRef.current = socketActions.emitFlipCard;
    emitPlayerReadyRef.current = socketActions.emitPlayerReady;
  }, [socketActions]);

  // ✅ Join game room when component mounts and game data is loaded
  useEffect(() => {
    if (gameData && isConnected && !hasJoinedGameRef.current) {
      console.log("Joining game room:", roomId);
      socketActions.emitJoinGame(); // ✅ FIXED: Use emitJoinGame, not emitStartGame
      hasJoinedGameRef.current = true;
    }
  }, [gameData, isConnected, roomId]);

  // Initialize players from game data
  useEffect(() => {
    if (gameData) {
      const initialPlayers = [
        {
          id: gameData.hostId,
          name: gameData.hostId === userId ? userName : "Host",
          ready: true,
        },
      ];

      if (gameData.opponentId) {
        initialPlayers.push({
          id: gameData.opponentId,
          name: gameData.opponentId === userId ? userName : "Opponent",
          ready: true,
        });
      }

      // You might need to add these players to playerManager
      console.log("Game players:", initialPlayers);
    }
  }, [gameData, userId, userName]);

  // Copy Room Code
  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMyTurn = gameLogic.currentTurn === userId;
  const isHost = gameData?.hostId === userId;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Loading game...</div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Game not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black relative">
      {/* Striped Dark Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "repeating-linear-gradient(45deg, #000 0px, #111 2px, #000 4px, #222 6px)",
        }}
      />

      <div className="absolute inset-0 z-10 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-50 min-h-screen flex flex-col">
        {/* Header */}
        <Header
          roomCode={roomId}
          copied={copied}
          onCopy={handleCopyRoomCode}
          playersCount={2} // Always 2 in active game
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          isDrawerOpen={isDrawerOpen}
        />

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
          {/* Game Board */}
          <GameBoard
            waitingForPlayers={false}
            gameStarted={gameLogic.gameStarted}
            roomCode={roomId}
            isMyTurn={isMyTurn}
            cards={gameLogic.cards}
            flippedIds={gameLogic.flippedIds}
            onFlip={gameLogic.handleCardFlip}
            disabled={
              !gameLogic.gameStarted ||
              !isMyTurn ||
              gameLogic.flippedIds.length >= 2
            }
          />

          {/* Side Panel (Desktop) */}
          <SidePanel
            players={playerManager.players}
            currentUserId={userId}
            scores={gameLogic.scores}
            OnReadyToggle={playerManager.handleReadyToggle}
            onStartGame={() => {}} // No start game in active game
            isHost={isHost}
            allReady={true}
            gameStarted={true}
          />
        </div>

        {/* Turn Indicator */}
        {gameLogic.gameStarted && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div
              className={`px-6 py-3 rounded-full font-semibold text-lg transition-all ${
                isMyTurn
                  ? "bg-green-600 text-white animate-pulse"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              {isMyTurn ? "Your Turn!" : "Opponent's Turn"}
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold">
              ⚠️ Disconnected - Trying to reconnect...
            </div>
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        roomCode={roomId}
        copied={copied}
        onCopy={handleCopyRoomCode}
        players={playerManager.players}
        onReadyToggle={playerManager.handleReadyToggle}
        onStartGame={() => {}} // No start game in active game
        isHost={isHost}
        allReady={true}
        gameStarted={true}
        currentUserId={userId}
        scores={gameLogic.scores}
      />
    </div>
  );
}
