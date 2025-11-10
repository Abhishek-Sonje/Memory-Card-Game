import React from "react";

interface LobbyActionsProps {
  isHost: boolean;
  allReady: boolean;
  players: { id: string; name: string; ready: boolean }[];
  isConnected: boolean;
  handleStartGame: () => void;
  handleCancelGame: () => void;
  handleLeaveLobby: () => void;
}

const LobbyActions: React.FC<LobbyActionsProps> = ({
  isHost,
  allReady,
  players,
  isConnected,
  handleStartGame,
  handleCancelGame,
  handleLeaveLobby,
}) => {
  // Host controls (start/cancel)
  if (isHost) {
    return (
      <div className="space-y-3 my-4 flex flex-col justify-center items-center ">
        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          disabled={!allReady || players.length < 2 || !isConnected}
          className={`w-3xl py-3 rounded-4xl font-semibold transition-all duration-300 
          ${
            !allReady || players.length < 2 || !isConnected
              ?  "border border-gray-700 bg-[#0e0e0e] shadow-[0_0_15px_-6px_rgba(0,255,135,0.3)] cursor-not-allowed text-gray-500"
              : "bg-gradient-to-r from-[#00ff87] via-[#23f9b2] to-[#60efff] transition-all text-black hover:scale-[1.03] shadow-[0_0_20px_-4px_rgba(35,249,178,0.5)]"
          }`}
        >
          Start Game
        </button>

        {/* Cancel Game Button */}
        <button
          onClick={handleCancelGame}
          disabled={!isConnected}
          className={`w-3xl py-3 rounded-4xl font-semibold transition-all duration-300
          ${
            !isConnected
              ? "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
              : "bg-gradient-to-r from-[#1a1a1a] to-[#0e0e0e] text-[#60efff] border border-[#60efff]/30 hover:bg-[#111] hover:scale-[1.02] transition-all hover:border-[#23f9b2]/40 shadow-[0_0_15px_-6px_rgba(96,239,255,0.3)]"
          }`}
        >
          Cancel Game
        </button>
      </div>
    );
  }

  // Non-host (leave lobby)
  return (
    <div className="space-y-3 my-4 flex flex-col justify-center items-center ">
      <button
        onClick={handleLeaveLobby}
        disabled={!isConnected}
        className={`w-3xl py-3 rounded-4xl font-semibold transition-all duration-300
        ${
          !isConnected
            ? "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
            : "bg-[#0e0e0e] border border-[#23f9b2]/40 text-[#23f9b2] hover:scale-[1.02] hover:bg-[#1a1a1a] shadow-[0_0_10px_-5px_rgba(35,249,178,0.4)]"
        }`}
      >
        Leave Room
      </button>
    </div>
  );
};

export default LobbyActions;
