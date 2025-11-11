import React from "react";

interface StatusBannerProps {
  players: { id: string; name: string; ready: boolean }[];
  allReady: boolean;
}

const StatusBanner: React.FC<StatusBannerProps> = ({ players, allReady }) => {
  // Waiting for another player
  if (players.length < 2) {
    return (
      <div className="text-center p-4   ">
        <p className="text-lg animate-pulse flex justify-center items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-bulb text-amber-300"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" />
            <path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" />
            <path d="M9.7 17l4.6 0" />
          </svg>
          Share the room code with a friend to start playing
        </p>
      </div>
    );
  }

  // Not all ready yet
  if (!allReady && players.length >= 2) {
    return (
      <div className="text-center p-4 bg-[#1a1a1a] border border-[#60efff]/25 rounded-xl shadow-[0_0_15px_-6px_rgba(96,239,255,0.2)]">
        <p className="text-[#60efff] text-sm">
          ⏳ All players must be ready before the game can start
        </p>
      </div>
    );
  }

  return null;
};

export default StatusBanner;
