import { GAME_CONSTANTS } from "../config/constants.js";

export function generateCards(): number[] {
  const pairs = Array.from({ length: GAME_CONSTANTS.CARD_PAIRS }, (_, i) => i);
  const deck = [...pairs, ...pairs];

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i]!, deck[j]!] = [deck[j]!, deck[i]!];
  }

  return deck;
}

export function generateRoomId(): string {
  return `ROOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
