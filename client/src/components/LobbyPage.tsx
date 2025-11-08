"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import toast from "react-hot-toast";

type Player = {
  id: string;
  name: string;
  ready: boolean;
};

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
  const { data: session } = useSession();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [gameData, setGameData] = useState<GameData | null>(initialGameInfo);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [justJoined, setJustJoined] = useState<string | null>(null);

  const hasShownConnectionToast = useRef(false);
  const previousPlayersRef = useRef<Player[]>([]);

  const userId = session?.user?.id || "guest-id";
  const userName = session?.user?.name || "Guest";
  const isHost = gameData?.hostId === userId;

  // Show connection status toast only once
  useEffect(() => {
    if (isConnected && !hasShownConnectionToast.current) {
      toast.success("Connected to lobby", {
        duration: 2000,
        icon: "🔌",
      });
      hasShownConnectionToast.current = true;
    } else if (!isConnected && hasShownConnectionToast.current) {
      toast.error("Connection lost. Reconnecting...", {
        duration: 3000,
        icon: "⚠️",
      });
    }
  }, [isConnected]);

  // Handle player join/leave toasts
  useEffect(() => {
    if (previousPlayersRef.current.length === 0) {
      previousPlayersRef.current = players;
      return;
    }

    // Check for new players
    const newPlayer = players.find(
      (p) =>
        !previousPlayersRef.current.some((existing) => existing.id === p.id)
    );

    if (newPlayer && newPlayer.id !== userId) {
      setJustJoined(newPlayer.id);
      setTimeout(() => setJustJoined(null), 1000);

      toast.success(`${newPlayer.name} joined the lobby`, {
        duration: 3000,
        icon: "👋",
      });
    }

    // Check for players who left
    const leftPlayer = previousPlayersRef.current.find(
      (p) => !players.some((existing) => existing.id === p.id)
    );

    if (leftPlayer && leftPlayer.id !== userId) {
      toast(`${leftPlayer.name} left the lobby`, {
        duration: 3000,
        icon: "👋",
      });
    }

    previousPlayersRef.current = players;
  }, [players, userId]);

  useEffect(() => {
    if (!socket || !isConnected || !gameData) {
      if (!gameData) {
        toast.error("Game session not found. Redirecting...");
        setTimeout(() => router.push("/"), 2000);
      }
      return;
    }

    socket.emit("joinLobby", {
      roomId,
      userId,
      userName,
    });

    socket.on("lobbyUpdate", (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socket.on("gameStarting", (data: { status: string }) => {
      toast.success("Game is starting! Get ready! 🎮", {
        duration: 2000,
      });
      router.push(`/${roomId}/game`);
    });

    socket.on("gameCancelled", () => {
      toast.error("Game cancelled by host", {
        duration: 3000,
        icon: "❌",
      });
      router.push("/");
    });

    socket.on("connect_error", () => {
      toast.error("Connection error. Please refresh the page.", {
        duration: 4000,
      });
    });

    return () => {
      socket.off("lobbyUpdate");
      socket.off("gameStarting");
      socket.off("gameCancelled");
      socket.off("connect_error");
      socket.emit("leaveLobby", { roomId, userId });
    };
  }, [socket, isConnected, gameData, roomId, userId, userName, router]);

  // useEffect(() => {
  //   if (!gameData || gameData.status !== "waiting") return;

  //   const interval = setInterval(async () => {
  //     try {
  //       const response = await fetch(`/api/games/${roomId}`);

  //       if (!response.ok) {
  //         throw new Error("Failed to fetch game status");
  //       }

  //       const data = await response.json();

  //       if (data.game.status === "in_progress") {
  //         clearInterval(interval);
  //         router.push(`/${roomId}/game`);
  //       }
  //     } catch (error) {
  //       console.error("Error polling game status:", error);
  //       // Don't show toast here as it might be too frequent
  //     }
  //   }, 2000);

  //   return () => clearInterval(interval);
  // }, [gameData, roomId, router]);

  // const updateGameStatus = async (status: string) => {
  //   try {
  //     const response = await fetch(`/api/games/${roomId}`, {
  //       method: "PATCH",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ status }),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to update game status");
  //     }

  //     router.push(`/${roomId}/game`);
  //   } catch (error) {
  //     console.error("Error updating game status:", error);
  //     toast.error("Failed to start game. Please try again.", {
  //       duration: 3000,
  //     });
  //   }
  // };

  const handleReadyToggle = () => {
    if (!socket || !isConnected) {
      toast.error("Not connected to server. Please wait...", {
        duration: 2000,
        icon: "⚠️",
      });
      return;
    }

    const newReadyState = !isReady;
    setIsReady(newReadyState);

    socket.emit("playerReady", {
      roomId,
      userId,
      ready: newReadyState,
    });

    toast.success(
      newReadyState ? "You're ready! ✓" : "Ready status cancelled",
      {
        duration: 2000,
        icon: newReadyState ? "✅" : "↩️",
      }
    );
  };

  const handleStartGame = async () => {
    if (!isHost || !socket || !isConnected) return;

    const allReady = players.every((p) => p.ready || p.id === userId);

    if (players.length < 2) {
      toast.error("Need at least 2 players to start!", {
        duration: 3000,
        icon: "👥",
      });
      return;
    }

    if (!allReady) {
      toast.error("All players must be ready!", {
        duration: 3000,
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="#FF5F15"
            className="icon icon-tabler icons-tabler-filled icon-tabler-alert-circle"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 2c5.523 0 10 4.477 10 10a10 10 0 0 1 -19.995 .324l-.005 -.324l.004 -.28c.148 -5.393 4.566 -9.72 9.996 -9.72zm.01 13l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007zm-.01 -8a1 1 0 0 0 -.993 .883l-.007 .117v4l.007 .117a1 1 0 0 0 1.986 0l.007 -.117v-4l-.007 -.117a1 1 0 0 0 -.993 -.883z" />
          </svg>
        ),
      });
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading("Starting game...");

    try {
      socket.emit("startGame", { roomId });
      // await updateGameStatus("in_progress");
      toast.dismiss(loadingToast);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to start game. Please try again.");
    }
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success("Room code copied to clipboard!", {
      duration: 2000,
      icon: "📋",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelGame = () => {
    if (!socket || !isConnected) {
      toast.error("Not connected. Unable to cancel game.", {
        duration: 2000,
      });
      return;
    }

    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Cancel this game?</p>
          <p className="text-sm text-gray-600">
            This will end the session for all players.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                socket.emit("cancelGame", { roomId });
                toast.dismiss(t.id);
                toast.success("Game cancelled");
                router.push("/");
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Yes, Cancel
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              No, Keep Playing
            </button>
          </div>
        </div>
      ),
      {
        duration: 5000,
        icon: "⚠️",
      }
    );
  };

  const handleLeaveLobby = () => {
    if (!socket || !isConnected) {
      toast.error("Not connected. Unable to leave lobby.", {
        duration: 2000,
      });
      return;
    }

    socket.emit("leaveLobby", { roomId, userId });
    toast.success("Left the lobby", {
      duration: 2000,
      icon: "👋",
    });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-xl text-gray-400">Loading lobby...</div>
      </div>
    );
  }

  const currentPlayer = players.find((p) => p.id === userId);
  const opponent = players.find((p) => p.id !== userId);
  const allReady = players.every((p) => p.ready || p.id === userId);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Memory Game Lobby
          </h1>

          {/* Room Code */}
          <div className="inline-flex items-center gap-3 bg-gray-900 px-6 py-3 rounded-full border border-gray-800">
            <span className="text-gray-400 text-sm">Room Code:</span>
            <span className="font-mono text-xl text-blue-400 font-semibold tracking-wider">
              {roomId}
            </span>
            <button
              onClick={handleCopyRoomCode}
              className="ml-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>

          {/* Connection Status */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-400">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Player Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Host/Current Player Card */}
          <div className="relative">
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-6 border border-gray-800 hover:border-gray-700 transition-all duration-300">
              {/* Host Badge */}
              {isHost && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold">
                  HOST
                </div>
              )}

              {/* Player Avatar */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-900/50">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">{userName}</h3>
                  <p className="text-sm text-gray-400">You</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-800">
                <span className="text-sm text-gray-400">Status</span>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isReady
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-gray-800 text-gray-400 border border-gray-700"
                  }`}
                >
                  {isReady ? "✓ Ready" : "Not Ready"}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleReadyToggle}
                  disabled={!isConnected}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isReady
                      ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                      : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]"
                  }`}
                >
                  {isReady ? "Cancel Ready" : "Ready Up"}
                </button>

                {isHost ? (
                  <>
                    <button
                      onClick={handleStartGame}
                      disabled={!allReady || players.length < 2 || !isConnected}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100"
                    >
                      Start Game
                    </button>
                    <button
                      onClick={handleCancelGame}
                      disabled={!isConnected}
                      className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel Game
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleLeaveLobby}
                    disabled={!isConnected}
                    className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Leave Room
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Opponent Card or Waiting */}
          <div
            className={`relative ${
              justJoined === opponent?.id ? "animate-scale-in" : ""
            }`}
          >
            {opponent ? (
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-6 border border-gray-800 hover:border-gray-700 transition-all duration-300">
                {/* Player Avatar */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-purple-900/50">
                    {opponent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">
                      {opponent.name}
                    </h3>
                    <p className="text-sm text-gray-400">Opponent</p>
                  </div>
                </div>
                {/* Status */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Status</span>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      opponent.ready
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-gray-800 text-gray-400 border border-gray-700"
                    }`}
                  >
                    {opponent.ready ? "✓ Ready" : "Not Ready"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-6 border border-gray-800 border-dashed h-full min-h-[280px] flex flex-col items-center justify-center">
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
                <p className="text-gray-400 text-center mb-2">
                  Waiting for opponent
                </p>
                <p className="text-sm text-gray-600 text-center">
                  Share the room code to invite a player
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {players.length < 2 && (
          <div className="text-center p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl">
            <p className="text-blue-400 text-sm">
              💡 Share the room code with a friend to start playing
            </p>
          </div>
        )}
        {!allReady && players.length >= 2 && (
          <div className="text-center p-4 bg-yellow-600/10 border border-yellow-600/20 rounded-xl">
            <p className="text-yellow-400 text-sm">
              ⏳ All players must be ready before the game can start
            </p>
          </div>
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
}
