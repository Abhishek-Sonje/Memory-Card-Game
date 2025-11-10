import React from "react";

type Player = {
  id: string;
  name: string;
  ready: boolean;
};

interface PlayerCardProps {
  player: Player | null;
  isCurrentUser: boolean;
  isHost?: boolean;
  isReady?: boolean;
  onReadyToggle?: () => void;
  justJoined?: string | null;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentUser,
  isHost = false,
  isReady = false,
  onReadyToggle,
  justJoined,
}) => {
  if (!player)
    return (
      <div className="bg-[#00000073] rounded-lg p-6 border border-gray-800 border-dashed h-full min-h-[280px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
          <svg
            className="w-8 h-8 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <p className="text-gray-400 text-center mb-2">Waiting for opponent</p>
        <p className="text-sm text-gray-600 text-center">
          Share the room code to invite a player
        </p>
      </div>
    );

  return (
    <div
      className={`relative ${
        justJoined === player.id ? "animate-scale-in" : ""
      }`}
    >
      <div className=" bg-[#00000073] rounded-lg p-6 border border-[#3d403fc4] hover:border-[#23f9b2]/40 transition-all duration-300 shadow-[0_0_15px_-3px_rgba(35,249,178,0.15)]">
        {isHost && (
          <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-[#00ff87] to-[#23f9b2] rounded-full text-xs font-semibold text-black shadow-md">
            HOST
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg transition-all duration-300 ${
              isCurrentUser
                ? "bg-gradient-to-br from-[#00ff87] to-[#23f9b2] text-black shadow-[0_0_20px_-3px_rgba(0,255,135,0.6)]"
                : "bg-gradient-to-br from-[#23f9b2] to-[#60efff] text-black shadow-[0_0_20px_-3px_rgba(96,239,255,0.6)]"
            }`}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-1">
              {player.name}
            </h3>
            <p className="text-sm text-gray-400">
              {isCurrentUser ? "You" : "Opponent"}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-800">
          <span className="text-sm text-gray-400">Status</span>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
              player.ready
                ? "bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/30"
                : "bg-gray-800 text-gray-400 border border-gray-700"
            }`}
          >
            {player.ready ? "✓ Ready" : "Not Ready"}
          </div>
        </div>

        {/* Current player's ready button */}
        {isCurrentUser && onReadyToggle && (
          <button
            onClick={onReadyToggle}
            className={`w-full py-3 rounded-4xl font-semibold transition-all duration-200 ${
              isReady
                ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                : "bg-gradient-to-r from-[#00ff87] to-[#23f9b2] hover:scale-[1.03] text-black shadow-[0_0_20px_-5px_rgba(35,249,178,0.5)]"
            }`}
          >
            {isReady ? "Cancel Ready" : "Ready Up"}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PlayerCard;
