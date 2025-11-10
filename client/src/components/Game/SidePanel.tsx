"use client";

import PlayerItem from "@/game/PlayerItem";
import { Player, Scores } from "@/types/games.type";

type props = {
  players:Player[]
  currentUserId:string
  scores:Scores
  OnReadyToggle:()=>void
  onStartGame:()=>void
  isHost:boolean
    allReady:boolean
  gameStarted:boolean
};

function SidePanel({
    players,
    currentUserId,
    scores,
    OnReadyToggle,
    onStartGame,    
    isHost,
    allReady,
    gameStarted,
}: any) {
  return (
    <aside className="hidden lg:block w-80 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 p-6 space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold mb-4">Players</h2>
        <div className="space-y-3">
          {players.map((player:Player) => (
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
            onClick={OnReadyToggle}
            className={`w-full py-3 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
              players.find((p:Player) => p.id === currentUserId)?.ready
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
          >
            {players.find((p:Player) => p.id === currentUserId)?.ready
              ? "Ready!"
              : "Ready Up"}
          </button>

          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!allReady}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              Start Game
            </button>
          )}
        </div>
      )}

      {gameStarted && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">Scores</h3>
          {players.map((player:Player) => (
            <div key={player.id} className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">{player.name}</span>
              <span className="text-emerald-400 font-semibold">
                {scores[player.id] || 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export default SidePanel;
