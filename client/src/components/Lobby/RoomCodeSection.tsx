import React from "react";

interface RoomCodeSectionProps {
  roomId: string;
  copied: boolean;
  isConnected: boolean;
  handleCopyRoomCode: () => void;
}

const RoomCodeSection: React.FC<RoomCodeSectionProps> = ({
  roomId,
  copied,
  isConnected,
  handleCopyRoomCode,
}) => (
  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-gray-700 bg-[#0e0e0e] shadow-[0_0_15px_-6px_rgba(0,255,135,0.3)]">
    <span className="text-gray-400 text-sm">Room Code:</span>
    <span
      className="font-mono text-xl font-semibold tracking-wider"
      style={{ color: "#00FF87" }}
    >
      {roomId}
    </span>
    <button
      onClick={handleCopyRoomCode}
      disabled={!isConnected}
      className="
        ml-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105
        bg-[#00FF87] text-black
        hover:bg-[#23F9B2]
        focus:ring-2 focus:ring-[#60EFFF]
        disabled:bg-gray-800 disabled:text-gray-500"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  </div>
);


export default RoomCodeSection;
