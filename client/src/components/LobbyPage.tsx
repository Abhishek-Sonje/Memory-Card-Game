"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { useGameLogic } from "../hooks/useGameLogic";
import { usePlayerManagement } from "../hooks/usePlayerManagement";
import MobileDrawer from "./Lobby/MobileDrawer";
import GameBoard from "./Lobby/GameBoard";
import SidePanel from "./Lobby/SidePanel";
import Header from "./Lobby/Header";
// import type { User } from "../types/games.type";
import { useSocket } from "../hooks/useSocket";
import { useSession } from "next-auth/react";

function Lobby() {
  const { isConnected } = useSocket();

  // User & Room Info
  const { data: session } = useSession();
  const userId = session?.user?.id || "guest-id";
  // const [currentUser] = useState<User>({ id: "user-1", name: "Guest-1234" });
  const [roomCode] = useState<string>("ABCD1234");
  const [isHost] = useState<boolean>(true);
  const [gameCreated, setGameCreated] = useState<boolean>(false);

  const [createError, setCreateError] = useState<string | null>(null);

  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const emitFlipCardRef = useRef<(cardId: string) => void>(() => {});
  const emitPlayerReadyRef = useRef<(ready: boolean) => void>(() => {});

  // Create game in database FIRST (only for host)
  useEffect(() => {
    const createGame = async () => {
      if (isHost && !gameCreated) {
        try {
          console.log("Creating game with:", {
            userId ,
            roomId: roomCode,
          });

          console.log("Creating game with:", {
            userId,
            roomId: roomCode,
          });

          const response = await fetch(
            process.env.NEXT_PUBLIC_SOCKET_URL + "/api/games" ||
              "http://localhost:3002/api/games",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                roomId: roomCode,
              }),
            }
          );
          console.log("Response status:", response.status);

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Unknown error" }));
            console.error("Failed to create game:", errorData);
            setCreateError(errorData.error || "Failed to create game");
            return;
          }

          const game = await response.json();
          console.log("Game created:", game);
          setGameCreated(true);
        } catch (error) {
          console.error("Error creating game:", error);
          setCreateError(
            error instanceof Error ? error.message : "Network error"
          );
        }
      } else if (!isHost) {
        // Non-host: game should already exist
        console.log("Non-host: skipping game creation");

        setGameCreated(true);
      }
    };

    createGame();
  }, [isHost, userId, roomCode, gameCreated]);

  // Initialize Socket

  const socketActions = useGameSocket({
    roomCode,
    currentUserId: userId,
    currentUserName: session?.user?.name || "Guest",
    onPlayerJoined: (player) => playerManager.handlePlayerJoined(player),
    onPlayerLeft: (userId) => playerManager.handlePlayerLeft(userId),
    onPlayerReady: (userId, ready) =>
      playerManager.handlePlayerReady(userId, ready),
    onGameStarted: (data) =>
      gameLogic.handleGameStarted(data, playerManager.players[0]?.id),
    onCardFlipped: (cardId) => gameLogic.handleCardFlipped(cardId),
    onCardsMatched: (cardIds, userId) =>
      gameLogic.handleCardsMatched(cardIds, userId),
    onCardsMismatch: () => gameLogic.handleCardsMismatch(),
    onTurnChanged: (userId) => gameLogic.handleTurnChanged(userId),
    onGameOver: (winner) => {
      alert(`Game Over! Winner: ${winner.name} with ${winner.score} pairs!`);
    },
  });

  // Game Logic
  const gameLogic = useGameLogic({
    isConnected,
    // emitFlipCard: socketActions.emitFlipCard,
    emitFlipCard: (cardId: string) => emitFlipCardRef.current(cardId),
  });

  // Player Management
  const playerManager = usePlayerManagement({
    currentUserId: userId,
    currentUserName: session?.user?.name || "Guest",
    // emitPlayerReady: socketActions.emitPlayerReady,
    emitPlayerReady: (ready: boolean) => emitPlayerReadyRef.current(ready),
  });

  // 4. Update refs when socket actions are ready
  useEffect(() => {
    emitFlipCardRef.current = socketActions.emitFlipCard;
    emitPlayerReadyRef.current = socketActions.emitPlayerReady;
  }, [socketActions]);

  // Game Start Handler
  const handleStartGame = () => {
    if (isConnected) {
      socketActions.emitStartGame();
    } else {
      gameLogic.handleLocalGameStart();
    }
  };

  // Copy Room Code
  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMyTurn = gameLogic.currentTurn === userId;

  // Show loading while creating game
  if (!gameCreated) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="text-white text-xl">
          {isHost ? "Creating game..." : "Joining game..."}
        </div>
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
          roomCode={roomCode}
          copied={copied}
          onCopy={handleCopyRoomCode}
          playersCount={playerManager.players.length}
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          isDrawerOpen={isDrawerOpen}
        />

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
          {/* Game Board */}
          <GameBoard
            waitingForPlayers={gameLogic.waitingForPlayers}
            gameStarted={gameLogic.gameStarted}
            roomCode={roomCode}
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
            onStartGame={handleStartGame}
            isHost={isHost}
            allReady={playerManager.allReady}
            gameStarted={gameLogic.gameStarted}
          />
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        roomCode={roomCode}
        copied={copied}
        onCopy={handleCopyRoomCode}
        players={playerManager.players}
        onReadyToggle={playerManager.handleReadyToggle}
        onStartGame={handleStartGame}
        isHost={isHost}
        allReady={playerManager.allReady}
        gameStarted={gameLogic.gameStarted}
        currentUserId={userId}
        scores={gameLogic.scores}
      />
    </div>
  );
}

export default Lobby;
