import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket"; // Your existing socket hook
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

export const useLobbySocket = ({
  initialGameInfo,
  roomId,
}: {
  initialGameInfo: GameData | null;
  roomId: string;
}) => {
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

  // Toast connection
  useEffect(() => {
    if (isConnected && !hasShownConnectionToast.current) {
      toast.success("Connected to lobby", { duration: 2000, icon: "🔌" });
      hasShownConnectionToast.current = true;
    } else if (!isConnected && hasShownConnectionToast.current) {
      toast.error("Connection lost. Reconnecting...", {
        duration: 3000,
        icon: "⚠️",
      });
    }
  }, [isConnected]);

  // Player join/leave toasts
  useEffect(() => {
    if (previousPlayersRef.current.length === 0) {
      previousPlayersRef.current = players;
      return;
    }

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

  // Initial and on socket/game change
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

    socket.on("gameStarting", () => {
      toast.success("Game is starting! Get ready! 🎮", { duration: 2000 });
      router.push(`/${roomId}/game`);
    });

    socket.on("gameCancelled", () => {
      toast.error("Game cancelled by host", { duration: 3000, icon: "❌" });
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
    socket.emit("playerReady", { roomId, userId, ready: newReadyState });
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
      toast.error("All players must be ready!", { duration: 3000, icon: "⚠️" });
      return;
    }
    const loadingToast = toast.loading("Starting game...");
    try {
      socket.emit("startGame", { roomId });
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
      toast.error("Not connected. Unable to cancel game.", { duration: 2000 });
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
      { duration: 5000, icon: "⚠️" }
    );
  };

  const handleLeaveLobby = () => {
    if (!socket || !isConnected) {
      toast.error("Not connected. Unable to leave lobby.", { duration: 2000 });
      return;
    }
    socket.emit("leaveLobby", { roomId, userId });
    toast.success("Left the lobby", { duration: 2000, icon: "👋" });
    router.push("/");
  };

  const allReady =
    players.length > 0 && players.every((p) => p.ready || p.id === userId);

  return {
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
  };
};

export default useLobbySocket;