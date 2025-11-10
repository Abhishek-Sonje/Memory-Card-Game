"use client";

import React, { useEffect, useRef, useState, use } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { useGameLogic } from "../hooks/useGameLogic";
import { usePlayerManagement } from "../hooks/usePlayerManagement";
import MobileDrawer from "./Game/MobileDrawer";
import GameBoard from "./Game/GameBoard";
import SidePanel from "./Game/SidePanel";
import Header from "./Game/Header";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSocket } from "../hooks/useSocket";
import Loader from "./UI/Loader";

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

  // Refs for socket actions
  const emitFlipCardRef = useRef<(cardId: string) => void>(() => {});
  const hasJoinedGameRef = useRef(false);
  const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002";
  // Verify game exists and is in progress
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/${roomId}/game`);
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

  // Game Logic - simplified without player ready emissions
  const gameLogic = useGameLogic({
    isConnected,
    emitFlipCard: (cardId: string) => emitFlipCardRef.current(cardId),
    currentUserId: userId,
    useImages:true,
  });

  // Player Management - simplified for in-game state
  const playerManager = usePlayerManagement({
    currentUserId: userId,
    currentUserName: userName,
    emitPlayerReady: () => {}, // No ready state in active game
  });

  // Initialize Socket for GAME room
  const socketActions = useGameSocket({
    roomCode: roomId,
    currentUserId: userId,
    currentUserName: userName,
    onPlayerJoined: (player) => playerManager.handlePlayerJoined(player),
    onPlayerLeft: (userId) => playerManager.handlePlayerLeft(userId),
    onPlayerReady: () => {}, // Not used in active game
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
    setWaiting: (waiting: boolean) => {
      // Could set a loading state here if needed
      console.log("Waiting for opponent:", waiting);
      return (
        <div>
          <Loader message="Waiting for opponent..." />
        </div>
      )
    }
    
  });

  // Update refs when socket actions are ready
  useEffect(() => {
    emitFlipCardRef.current = socketActions.emitFlipCard;
  }, [socketActions]);

  // Join game room when ready
  useEffect(() => {
    if (gameData && isConnected && !hasJoinedGameRef.current) {
      console.log("Joining game room:", roomId);
      socketActions.emitJoinGame();
      hasJoinedGameRef.current = true;
    }
  }, [gameData, isConnected, roomId, socketActions]);

  // Initialize players from game data
  useEffect(() => {
    if (gameData) {
      const initialPlayers = [
        {
          id: gameData.hostId,
          name: gameData.hostId === userId ? userName : "Host",
          ready: true, // Always ready in active game
        },
      ];

      if (gameData.opponentId) {
        initialPlayers.push({
          id: gameData.opponentId,
          name: gameData.opponentId === userId ? userName : "Opponent",
          ready: true, // Always ready in active game
        });
      }

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

  if (gameLogic.useImages && gameLogic.imagesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-2xl mb-4">Loading images...</div>
        <div className="w-64 bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="bg-emerald-500 h-4 rounded-full transition-all duration-300"
            style={{ width: `${gameLogic.imageProgress}%` }}
          />
        </div>
        <div className="text-gray-400 text-sm mt-2">{gameLogic.imageProgress}%</div>
      </div>
    );
  }

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
          playersCount={2}
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
            useImages={gameLogic.useImages}
            flippedIds={gameLogic.flippedIds}
            onFlip={gameLogic.handleCardFlip}
            disabled={
              !gameLogic.gameStarted ||
              !isMyTurn ||
              gameLogic.flippedIds.length >= 2
            }
          />

          {/* Side Panel (Desktop) - No ready/start game controls */}
          <SidePanel
            players={playerManager.players}
            currentUserId={userId}
            scores={gameLogic.scores}
            OnReadyToggle={() => {}} // Disabled in active game
            onStartGame={() => {}} // Disabled in active game
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

      {/* Mobile Drawer - No ready/start game controls */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        roomCode={roomId}
        copied={copied}
        onCopy={handleCopyRoomCode}
        players={playerManager.players}
        onReadyToggle={() => {}} // Disabled in active game
        onStartGame={() => {}} // Disabled in active game
        isHost={isHost}
        allReady={true}
        gameStarted={true}
        currentUserId={userId}
        scores={gameLogic.scores}
      />
    </div>
  );
}
