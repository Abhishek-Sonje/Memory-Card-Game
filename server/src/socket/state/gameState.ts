import type { LobbyState, GameState } from "../../types/index.js";

export const lobbyStates = new Map<string, LobbyState>();
export const gameStates = new Map<string, GameState>();
export const userSocketMap = new Map<string, string>();
export const socketUserMap = new Map<string, string>();

export function cleanupLobbyState(roomId: string) {
  lobbyStates.delete(roomId);
  console.log(`Cleaned up lobby state for room: ${roomId}`);
}

export function cleanupGameState(roomId: string) {
  const gameState = gameStates.get(roomId);

  // Clear any pending disconnection timers
  if (gameState) {
    for (const timer of gameState.disconnectionTimers.values()) {
      clearTimeout(timer);
    }
  }

  gameStates.delete(roomId);
  console.log(`Cleaned up game state for room: ${roomId}`);
}
