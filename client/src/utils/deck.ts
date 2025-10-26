// utils/deck.ts
import type { GameCard } from "../types/games.type";

export const defaultEmojis = ["🎮", "🎯", "🎨", "🎭", "🎪", "🎸", "🎺", "🎼"];

export function initializeDeck(emojis = defaultEmojis): GameCard[] {
  const deck: GameCard[] = [...emojis, ...emojis]
    .map((emoji, index) => ({ id: `card-${index}`, emoji, matched: false }))
    .sort(() => Math.random() - 0.5);
  return deck;
}
