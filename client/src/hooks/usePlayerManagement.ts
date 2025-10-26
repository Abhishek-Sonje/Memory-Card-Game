import { useState } from "react";
import type { Player } from "../types/games.type";

interface UsePlayerManagementProps {
  currentUserId: string;
  currentUserName: string;
  emitPlayerReady: (ready: boolean) => void;
}

export const usePlayerManagement = ({
  currentUserId,
  currentUserName,
  emitPlayerReady,
}: UsePlayerManagementProps) => {
  const [players, setPlayers] = useState<Player[]>([
    { id: currentUserId, name: currentUserName, ready: false },
  ]);

  const handlePlayerJoined = (player: { id: string; name: string }) => {
    setPlayers((prev) => {
      if (prev.find((p) => p.id === player.id)) return prev;
      return [...prev, { id: player.id, name: player.name, ready: false }];
    });
  };

  const handlePlayerLeft = (userId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== userId));
  };

  const handlePlayerReady = (userId: string, ready: boolean) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, ready } : p))
    );
  };

  const handleReadyToggle = () => {
    const newReadyState = !players.find((p) => p.id === currentUserId)?.ready;

    emitPlayerReady(newReadyState);

    // Optimistic update
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId ? { ...p, ready: newReadyState } : p
      )
    );
  };

  const allReady = players.length >= 2 && players.every((p) => p.ready);

  return {
    players,
    allReady,
    handlePlayerJoined,
    handlePlayerLeft,
    handlePlayerReady,
    handleReadyToggle,
  };
};
