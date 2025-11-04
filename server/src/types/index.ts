export interface Player {
  id: string;
  name: string;
  ready: boolean;
  socketId?: string;
}

export interface LobbyState {
  roomId: string;
  hostId: string;
  players: Map<string, Player>;
}

export interface GameState {
  gameId: string;
  cards: number[];
  currentTurn: string;
  flippedCards: { index: number; playerId: string }[];
  matchedCards: Set<number>;
  hostId: string;
  opponentId: string;
  hostPlayerId: string;
  opponentPlayerId: string;
  isProcessing: boolean;
  disconnectionTimers: Map<string, NodeJS.Timeout>;
}

export interface JWTPayload {
  userId: string;
}
