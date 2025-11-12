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
  const { status } = useSocket();

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
    isConnected: status === "connected",
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
    if (gameData && status === "connected" && !hasJoinedGameRef.current) {
      console.log("Joining game room:", roomId);
      socketActions.emitJoinGame();
      hasJoinedGameRef.current = true;
    }
  }, [gameData, status, roomId, socketActions]);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e0e0e]">
        <div className="text-[#23f9b2] text-2xl mb-4 animate-pulse">
          Loading images...
        </div>
        <div className="w-64 bg-[#1a1a1a] rounded-full h-4 overflow-hidden border border-[#23f9b2]/30">
          <div
            className="bg-gradient-to-r from-[#00ff87] to-[#23f9b2] h-4 rounded-full transition-all duration-300 shadow-[0_0_20px_-5px_rgba(35,249,178,0.4)]"
            style={{ width: `${gameLogic.imageProgress}%` }}
          />
        </div>
        <div className="text-[#60efff]/80 text-sm mt-2">
          {gameLogic.imageProgress}%
        </div>
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
    // <div className="min-h-screen w-full bg-black relative">
    <div className="min-h-screen w-full bg-black relative overflow-hidden">
      {/* Neon Grid Background */}
      <div
        className="absolute inset-0 z-0 animate-gridMove"
        style={{
          background: "#000000",
          backgroundImage: `
            linear-gradient(to right, rgba(75, 85, 99, 0.4) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(75, 85, 99, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "45px 45px",
        }}
      />
      {/* Ambient Glow Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 ">
        <div className="absolute top-1/3 left-1/4 w-96 h-96  bg-[#00ff87] blur-[180px]  rounded-full" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96  bg-[#60efff] blur-[180px] rounded-full" />
      </div>
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
          {/* <div className="bg-gradient-to-br from-[#0e0e0e] to-[#1a1a1a] border border-[#23f9b2]/10 rounded-2xl shadow-[0_0_25px_-10px_rgba(35,249,178,0.3)] p-4"> */}
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
              className={`px-6 py-3 rounded-full font-semibold text-lg transition-all shadow-[0_0_20px_-5px_rgba(35,249,178,0.4)] ${
                isMyTurn
                  ? "bg-gradient-to-r from-[#00ff87] to-[#23f9b2] text-black animate-pulse"
                  : "bg-[#1a1a1a] text-[#60efff]/70 border border-[#60efff]/30"
              }`}
            >
              {isMyTurn ? "Your Turn!" : "Opponent's Turn"}
            </div>
          </div>
        )}
        {/* Connection Status */}
        {status !== "connected" && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-[#1a1a1a] border border-[#60efff]/40 text-[#60efff] px-6 py-3 rounded-lg font-semibold shadow-[0_0_15px_-5px_rgba(96,239,255,0.4)] animate-pulse">
              ⚠️ Disconnected — attempting to reconnect...
            </div>
          </div>
        )}
      </div>
      {/* <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#00ff87] blur-[180px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#60efff] blur-[180px] rounded-full" />
      </div> */}
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
