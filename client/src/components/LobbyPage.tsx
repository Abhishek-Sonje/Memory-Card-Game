"use client";

import React, { useState } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { useGameLogic } from "../hooks/useGameLogic";
import { usePlayerManagement } from "../hooks/usePlayerManagement";
import MobileDrawer from "./Lobby/MobileDrawer";
import GameBoard from "./Lobby/GameBoard";
import SidePanel from "./Lobby/SidePanel";
import Header from "./Lobby/Header";
import type { User } from "../types/games.type";

function Lobby() {
  // User & Room Info
  const [currentUser] = useState<User>({ id: "user-1", name: "Guest-1234" });
  const [roomCode] = useState<string>("ABCD1234");
  const [isHost] = useState<boolean>(true);

  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Initialize Socket
  const socketActions = useGameSocket({
    roomCode,
    currentUserId: currentUser.id,
    currentUserName: currentUser.name,
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
    isConnected: socketActions.isConnected(),
    emitFlipCard: socketActions.emitFlipCard,
  });

  // Player Management
  const playerManager = usePlayerManagement({
    currentUserId: currentUser.id,
    currentUserName: currentUser.name,
    emitPlayerReady: socketActions.emitPlayerReady,
  });

  // Game Start Handler
  const handleStartGame = () => {
    if (socketActions.isConnected()) {
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

  const isMyTurn = gameLogic.currentTurn === currentUser.id;

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
            currentUserId={currentUser.id}
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
        currentUserId={currentUser.id}
        scores={gameLogic.scores}
      />
    </div>
  );
}

export default Lobby;
