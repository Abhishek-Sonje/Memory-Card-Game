import { useState, useEffect } from "react";
import { initializeDeck } from "../utils/deck";
import type { GameCard, Scores } from "../types/games.type";

interface UseGameLogicProps {
  isConnected: boolean;
  emitFlipCard: (cardId: string) => void;
}

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

  // Initialize deck on mount
  useEffect(() => {
    if (!gameStarted && cards.length === 0) {
      setCards(initializeDeck());
    }
  }, [gameStarted, cards.length]);

  // Handle card flip
  const handleCardFlip = (cardId: string) => {
    if (flippedIds.length >= 2) return;
    if (flippedIds.includes(cardId)) return;

    const card = cards.find((c) => c.id === cardId);
    if (card?.matched) return;

    // Emit to server
    emitFlipCard(cardId);

    // Optimistic local update
    setFlippedIds((prev) => [...prev, cardId]);

    // Local fallback matching logic (when not connected)
    if (flippedIds.length === 1 && !isConnected) {
      const firstCard = cards.find((c: GameCard) => c.id === flippedIds[0]);
      const secondCard = cards.find((c: GameCard) => c.id === cardId);

      if (firstCard?.emoji === secondCard?.emoji) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstCard!.id || c.id === secondCard!.id
                ? { ...c, matched: true }
                : c
            )
          );
          setFlippedIds([]);
        }, 600);
      } else {
        setTimeout(() => {
          setFlippedIds([]);
        }, 1000);
      }
    }
  };

  // Socket event handlers
  const handleGameStarted = (
    data: { deck?: string[]; currentTurn?: string },
    playersFirstId?: string
  ) => {
    setGameStarted(true);
    setWaitingForPlayers(false);
    if (data.deck) {
      setCards(
        data.deck.map(
          (emoji, index): GameCard => ({
            id: `card-${index}`,
            emoji,
            matched: false,
          })
        )
      );
    } else {
      setCards(initializeDeck());
    }
    setCurrentTurn(data.currentTurn || playersFirstId || null);
  };

  const handleCardFlipped = (cardId: string) => {
    setFlippedIds((prev) => {
      if (prev.includes(cardId)) return prev;
      return [...prev, cardId];
    });
  };

  const handleCardsMatched = (cardIds: string[], userId: string) => {
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

  const handleCardsMismatch = () => {
    setTimeout(() => {
      setFlippedIds([]);
    }, 1000);
  };

  const handleTurnChanged = (userId: string) => {
    setCurrentTurn(userId);
  };

  const handleLocalGameStart = () => {
    setGameStarted(true);
    setWaitingForPlayers(false);
    setCards(initializeDeck());
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
