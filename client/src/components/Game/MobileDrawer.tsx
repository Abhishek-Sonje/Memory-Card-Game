"use client";

import PlayerItem from "@/game/PlayerItem";
import { Player, Scores } from "@/types/games.type";
import { Check, Copy, X } from "lucide-react";


type Props = {
    isOpen: boolean;
    onClose: () => void;
    roomCode: string;
    copied: boolean;
    onCopy: () => void;
    players: Player[];
    onReadyToggle: () => void;
    onStartGame: () => void;
    isHost: boolean;
    allReady: boolean;
    gameStarted: boolean;
    currentUserId: string;
    scores: Scores;
}
function MobileDrawer({ isOpen, onClose, roomCode, copied, onCopy, players, onReadyToggle, onStartGame, isHost, allReady, gameStarted, currentUserId, scores }: Props) {

    if (!isOpen) return null;
    return ( <div
          className="lg:hidden fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-800 p-6 space-y-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">Game Info</h2>
              <button
            onClick={onClose}
            type="button"
            title="shut down"
                className="p-2 hover:bg-gray-800 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <span className="text-gray-400 text-sm">Room:</span>
              <span className="text-white font-mono font-semibold">
                {roomCode}
              </span>
              <button
                onClick={onCopy}
                className="ml-auto p-1 hover:bg-gray-700 rounded"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3">Players</h3>
              <div className="space-y-3">
                {players.map((player) => (
                  <PlayerItem
                    key={player.id}
                    player={player}
                    isCurrentUser={player.id === currentUserId}
                    isHost={isHost && player.id === currentUserId}
                  />
                ))}
              </div>
            </div>

            {!gameStarted && (
              <div className="space-y-3">
                <button
                  onClick={onReadyToggle}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    players.find((p) => p.id === currentUserId)?.ready
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  {players.find((p) => p.id === currentUserId)?.ready
                    ? "Ready!"
                    : "Ready Up"}
                </button>

                {isHost && (
                  <button
                    onClick= {onStartGame}
                    disabled={!allReady}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors"
                  >
                    Start Game
                  </button>
                )}
              </div>
            )}
          </div>
        </div> );
}

export default MobileDrawer;