"use client";

import { useLobbySocket } from "@/hooks/useLobbySocket";
import PlayerCard from "@/components/Lobby/PlayerCard";
import RoomCodeSection from "@/components/Lobby/RoomCodeSection";
import StatusBanner from "@/components/Lobby/StatusBanner";
import LobbyActions from "@/components/Lobby/LobbyActions";

type GameData = {
  id: string;
  hostId: string;
  roomId: string;
  opponentId: string | null;
  status: "waiting" | "in_progress" | "completed";
  winnerId: string | null;
};
export default function LobbyPage({
  initialGameInfo,
  roomId,
}: {
  initialGameInfo: GameData | null;
  roomId: string;
}) {
  const {
    players,
    gameData,
    isHost,
    userId,
    userName,
    isConnected,
    isReady,
    copied,
    justJoined,
    allReady,
    handleReadyToggle,
    handleStartGame,
    handleCopyRoomCode,
    handleCancelGame,
    handleLeaveLobby,
    loading,
  } = useLobbySocket({ initialGameInfo, roomId });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        Loading lobby...
      </div>
    );

  const currentPlayer = players.find((p) => p.id === userId);
  const opponent = players.find((p) => p.id !== userId);

  // {/* <div className="min-h-screen w-full bg-black relative">
  //   {/* Striped Dark */}
  //   <div
  //     className="absolute inset-0 z-0"
  //     style={{
  //       background:
  //         "repeating-linear-gradient(45deg, #000 0px, #111 2px, #000 4px, #222 6px)",
  //     }}
  //   />

  //   <div
  //     className="absolute inset-0 z-10 pointer-events-none"
  //     style={{
  //       background: "rgba(255, 255, 255, 0.02)",
  //       backdropFilter: "blur(45px) grayscale(20%)",
  //       WebkitBackdropFilter: "blur(45px) grayscale(20%)",
  //     }}
  //   />

  //   {/* Your Content/Components */}
  // </div>; */}

  return (
    <div
      className="min-h-screen w-full bg-black relative overflow-hidden text-white p-4 md:p-8"
      style={{
        background:
          "repeating-linear-gradient(45deg, #000 0px, #111 2px, #000 4px, #222 6px)",
      }}
    >
      <div className="max-w-6xl  mx-auto">
        {/* Header with Room Code */}
        <div className="text-center mb-12">
          <h1
            className="text-8xl md:text-5xl mb-6 h-16
    bg-gradient-to-r from-[#00FF87] via-[#23F9B2] to-[#60EFFF]
    bg-clip-text text-transparent font-[lobster]"
          >
            Memique Lobby
          </h1>
          <RoomCodeSection
            roomId={roomId}
            copied={copied}
            isConnected={isConnected}
            handleCopyRoomCode={handleCopyRoomCode}
          />
        </div>

        {/* Player Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <PlayerCard
            isHost={isHost}
            player={
              currentPlayer || { id: userId, name: userName, ready: isReady }
            }
            isCurrentUser
            isReady={isReady}
            onReadyToggle={handleReadyToggle}
            justJoined={null}
          />
          <PlayerCard
            isHost={false}
            player={opponent || null}
            isCurrentUser={false}
            justJoined={justJoined}
          />
        </div>

        {/* Actions and Status */}
        <LobbyActions
          isHost={isHost}
          allReady={allReady}
          players={players}
          isConnected={isConnected}
          handleStartGame={handleStartGame}
          handleCancelGame={handleCancelGame}
          handleLeaveLobby={handleLeaveLobby}
        />
        <StatusBanner allReady={allReady} players={players} />
      </div>
    </div>
  );
}
