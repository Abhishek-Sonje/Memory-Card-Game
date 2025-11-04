export const GAME_CONSTANTS = {
  CARD_PAIRS: 8,
  TOTAL_CARDS: 16,
  NO_MATCH_DELAY: 2000,
  RECONNECTION_GRACE_PERIOD: 30000, // 30 seconds
} as const;

export const SERVER_CONFIG = {
  PORT: 3002,
  FRONTEND_URL: "http://localhost:3000",
  FRONTEND_URL_ALT: "http://localhost:3001",
} as const;
