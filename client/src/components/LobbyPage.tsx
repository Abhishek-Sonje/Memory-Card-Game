"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";

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
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const userId = session?.user?.id || "guest-id";
  const userName = session?.user?.name || "Guest";
  const isHost = gameData?.hostId === userId;

  // Fetch initial game data
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const response = await fetch(`/api/games/${roomId}`);
        if (!response.ok) {
          router.push("/"); // Game not found, redirect home
          return;
        }
        const data = await response.json();
        setGameData(data.game);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching game:", error);
        router.push("/");
      }
    };

    fetchGameData();
  }, [roomId, router]);

  // Socket.IO: Join lobby room
  useEffect(() => {
    if (!socket || !isConnected || !gameData) return;

    console.log("Joining lobby room:", roomId);

    // Join the lobby room
    socket.emit("joinLobby", {
      roomId,
      userId,
      userName,
    });

    // Listen for player updates
    socket.on("lobbyUpdate", (data: { players: Player[] }) => {
      console.log("Lobby update:", data);
      setPlayers(data.players);
    });

    // Listen for game start
    socket.on("gameStarting", (data: { status: string }) => {
      console.log("Game starting!", data);
      // Update database status first
      updateGameStatus("in_progress");
    });

    return () => {
      socket.off("lobbyUpdate");
      socket.off("gameStarting");
      socket.emit("leaveLobby", { roomId, userId });
    };
  }, [socket, isConnected, gameData, roomId, userId, userName]);

  // Poll for game status changes (backup for socket)
  useEffect(() => {
    if (!gameData || gameData.status !== "waiting") return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/games/${roomId}`);
      const data = await response.json();

      if (data.game.status === "in_progress") {
        clearInterval(interval);
        router.push(`/${roomId}/game`);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameData, roomId, router]);

  // Update game status in database
  const updateGameStatus = async (status: string) => {
    try {
      await fetch(`/api/games/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      // Navigate to game page
      router.push(`/${roomId}/game`);
    } catch (error) {
      console.error("Error updating game status:", error);
    }
  };

  // Handle ready toggle
  const handleReadyToggle = () => {
    if (!socket || !isConnected) return;

    const newReadyState = !isReady;
    setIsReady(newReadyState);

    socket.emit("playerReady", {
      roomId,
      userId,
      ready: newReadyState,
    });
  };

  // Handle start game (host only)
  const handleStartGame = async () => {
    if (!isHost || !socket || !isConnected) return;

    const allReady = players.every((p) => p.ready || p.id === userId);
    if (!allReady || players.length < 2) {
      alert("All players must be ready and at least 2 players required!");
      return;
    }

    // Emit to all clients
    socket.emit("startGame", { roomId });

    // Update database
    await updateGameStatus("in_progress");
  };

  // Copy room code
  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-xl">Loading lobby...</div>
      </div>
    );
  }

  const allReady = players.every((p) => p.ready || p.id === userId);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Game Lobby</h1>
          <div className="flex items-center gap-4">
            <div className="bg-gray-800 px-4 py-2 rounded-lg font-mono text-xl">
              {roomId}
            </div>
            <button
              onClick={handleCopyRoomCode}
              className="bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition"
            >
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>
          <p className="text-gray-400 mt-2">
            Connection: {isConnected ? "✅ Connected" : "❌ Disconnected"}
          </p>
        </div>

        {/* Players List */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            Players ({players.length}/2)
          </h2>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-gray-800 p-4 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    {player.id === gameData?.hostId && (
                      <span className="text-xs text-yellow-400">Host</span>
                    )}
                  </div>
                </div>
                <div>
                  {player.ready ? (
                    <span className="text-green-400 font-semibold">
                      ✓ Ready
                    </span>
                  ) : (
                    <span className="text-gray-400">Not Ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleReadyToggle}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              isReady
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {isReady ? "Not Ready" : "Ready"}
          </button>

          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!allReady || players.length < 2}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition"
            >
              Start Game
            </button>
          )}
        </div>

        {/* Warning Messages */}
        {players.length < 2 && (
          <p className="text-yellow-400 text-center mt-4">
            Waiting for more players to join...
          </p>
        )}
        {!allReady && players.length >= 2 && (
          <p className="text-yellow-400 text-center mt-4">
            All players must be ready to start!
          </p>
        )}
      </div>
    </div>
  );
}
