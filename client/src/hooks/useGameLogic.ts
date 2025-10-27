import { useState } from "react";
import type { GameCard, Scores } from "../types/games.type";

interface UseGameLogicProps {
  isConnected: boolean;
  emitFlipCard: (cardId: string) => void;
}

// Card emoji mapping for display (matches server's card values 0-7)
const CARD_EMOJIS = ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭", "🎸", "🎹"];

export const useGameLogic = ({
  isConnected,
  emitFlipCard,
}: UseGameLogicProps) => {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>({});
  const [waitingForPlayers, setWaitingForPlayers] = useState<boolean>(false);

  // Handle card flip
  const handleCardFlip = (cardId: string) => {
    if (flippedIds.length >= 2) return;
    if (flippedIds.includes(cardId)) return;

    const card = cards.find((c) => c.id === cardId);
    if (card?.matched) return;

    // Always emit to server (server validates turn and card state)
    emitFlipCard(cardId);

    // Don't do optimistic update - wait for server confirmation
    // Server will send back cardFlipped event
  };

  // Socket event: Game started by server
  const handleGameStarted = (
    data: { deck?: string[]; currentTurn?: string },
    playersFirstId?: string
  ) => {
    console.log("Game started:", data);

    setGameStarted(true);
    setWaitingForPlayers(false);

    if (data.deck) {
      // Server sends card IDs like ["card-0", "card-1", ..., "card-15"]
      // We don't know the values yet - they're revealed on flip
      const initialCards: GameCard[] = data.deck.map((id) => ({
        id,
        emoji: "🎴", // Placeholder until revealed
        value: null, // Unknown until server reveals
        matched: false,
      }));
      setCards(initialCards);
    }

    setCurrentTurn(data.currentTurn || playersFirstId || null);
    setFlippedIds([]);
  };

  // Socket event: Card flipped by any player
  const handleCardFlipped = (cardId: string, cardValue?: number) => {
    console.log("Card flipped:", cardId, "Value:", cardValue);

    // Update card with revealed value from server
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId && cardValue !== undefined) {
          return {
            ...card,
            emoji: CARD_EMOJIS[cardValue] || "❓",
            value: cardValue,
          };
        }
        return card;
      })
    );

    // Track flipped cards
    setFlippedIds((prev) => {
      if (prev.includes(cardId)) return prev;
      return [...prev, cardId];
    });
  };

  // Socket event: Cards matched
  const handleCardsMatched = (cardIds: string[], userId: string) => {
    console.log("Cards matched:", cardIds, userId);

    setCards((prev) =>
      prev.map((card) =>
        cardIds.includes(card.id) ? { ...card, matched: true } : card
      )
    );

    setFlippedIds([]);

    setScores((prev) => ({
      ...prev,
      [userId]: (prev[userId] || 0) + 1,
    }));
  };

  // Socket event: Cards don't match
  const handleCardsMismatch = () => {
    console.log("Cards mismatch");

    // Keep cards flipped for 2 seconds to show mismatch
    // Then server will send turnChanged event
    setTimeout(() => {
      // Reset the non-matched flipped cards
      setCards((prev) =>
        prev.map((card) => {
          if (flippedIds.includes(card.id) && !card.matched) {
            return {
              ...card,
              emoji: "🎴", // Hide card again
              value: null, // Remove value
            };
          }
          return card;
        })
      );
      setFlippedIds([]);
    }, 2000);
  };

  // Socket event: Turn changed
  const handleTurnChanged = (userId: string) => {
    console.log("Turn changed to:", userId);
    setCurrentTurn(userId);
  };

  // Local game start (for testing without server)
  const handleLocalGameStart = () => {
    console.log("Starting local game (no server)");

    setGameStarted(true);
    setWaitingForPlayers(false);

    // Generate local deck for testing
    const pairs = ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭", "🎸", "🎹"];
    const deck = [...pairs, ...pairs];

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }

    const localCards: GameCard[] = deck.map((emoji, index) => ({
      id: `card-${index}`,
      emoji,
      value: pairs.indexOf(emoji),
      matched: false,
    }));

    setCards(localCards);
    setCurrentTurn("user-1"); // Set to current user for local testing
  };

  return {
    // State
    cards,
    flippedIds,
    gameStarted,
    currentTurn,
    scores,
    waitingForPlayers,

    // Setters (for external control)
    setCards,
    setWaitingForPlayers,

    // Handlers
    handleCardFlip,
    handleGameStarted,
    handleCardFlipped,
    handleCardsMatched,
    handleCardsMismatch,
    handleTurnChanged,
    handleLocalGameStart,
  };
};
