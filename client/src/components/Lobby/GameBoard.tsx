"use client";

import React from "react";
import Card from "@/game/Card";
import { GameCard } from "@/types/games.type";
import { useGameLogic } from "@/hooks/useGameLogic";

type Props = {
  waitingForPlayers: boolean;
  gameStarted: boolean;
  roomCode: string;
  isMyTurn: boolean;
  cards: GameCard[];
  useImages: boolean;
  flippedIds: string[];
  onFlip: (id: string) => void;
  disabled: boolean;
};

function GameBoard({
  waitingForPlayers,
  gameStarted, //this
  roomCode,
  isMyTurn, //this
  cards,
  useImages, //this
  flippedIds, //this
  onFlip,
  disabled,
}: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      {waitingForPlayers && !gameStarted ? (
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-emerald-500" />
          <p className="text-xl">Waiting for players to join...</p>
          <p className="text-gray-400 text-sm">
            Share room code:{" "}
            <span className="font-mono font-semibold">{roomCode}</span>
          </p>
        </div>
      ) : (
        <>
          {gameStarted && (
            <div className="mb-4 text-center">
              <p className="text-white text-lg">
                {isMyTurn ? (
                  <span className="text-emerald-400 font-semibold">
                    Your Turn!
                  </span>
                ) : (
                  <span className="text-gray-400">Waiting for opponent...</span>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3 w-full max-w-2xl">
            {cards.map((card: GameCard) => (
              <Card
                key={card.id}
                id={card.id}
                emoji={card.emoji}
                image={card.image} // Add this
                isFlipped={flippedIds.includes(card.id)}
                isMatched={card.matched}
                onFlip={onFlip}
                disabled={disabled}
                useImages={useImages} // Make sure this is passed
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default GameBoard;
