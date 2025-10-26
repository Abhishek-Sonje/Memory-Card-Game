"use client";
import React from "react";
import { Player } from "../types/games.type";

export interface PlayerItemProps {
  player: Player;
  isCurrentUser: boolean;
  isHost: boolean;
}

const PlayerItem: React.FC<PlayerItemProps> = ({
  player,
  isCurrentUser,
  isHost,
}) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
        {player.name.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{player.name}</span>
          {isHost && (
            <span className="text-xs bg-purple-600 px-2 py-0.5 rounded text-white">
              HOST
            </span>
          )}
          {isCurrentUser && (
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
              You
            </span>
          )}
        </div>
      </div>
      <div
        className={`w-3 h-3 rounded-full ${
          player.ready ? "bg-emerald-500" : "bg-gray-600"
        }`}
        aria-label={player.ready ? "Ready" : "Not ready"}
      />
    </div>
  );
};

export default React.memo(PlayerItem);
