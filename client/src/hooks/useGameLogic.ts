import { useState, useRef, useCallback, useEffect } from "react";
import type { GameCard, Scores } from "../types/games.type";
import { useImagePreloader, CARD_IMAGES } from "./useImagePreloader";

interface UseGameLogicProps {
  isConnected: boolean;
  emitFlipCard: (cardId: string) => void;
  currentUserId?: string;
  useImages?: boolean;
}

const CARD_EMOJIS = ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭", "🎸", "🎹"];
const MISMATCH_DELAY = 2000;

// Helper function to get card display value safely
const getCardDisplay = (
  value: number | null | undefined,
  useImages: boolean
): string => {
  if (value === null || value === undefined) return "❓";

  if (useImages) {
    return CARD_IMAGES[value] || "❓";
  } else {
    return CARD_EMOJIS[value] || "❓";
  }
};

export const useGameLogic = ({
  isConnected,
  emitFlipCard,
  currentUserId,
  useImages = false,
}: UseGameLogicProps) => {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>({});
  const [waitingForPlayers, setWaitingForPlayers] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const deckValuesRef = useRef<number[]>([]);
  const mismatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preload images when using image mode
  const { loading: imagesLoading, progress: imageProgress } =
    useImagePreloader(useImages);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mismatchTimeoutRef.current) {
        clearTimeout(mismatchTimeoutRef.current);
      }
    };
  }, []);

  // Handle card flip
  const handleCardFlip = useCallback(
    (cardId: string) => {
      if (isProcessing) return;
      if (flippedIds.length >= 2) return;
      if (flippedIds.includes(cardId)) return;

      const card = cards.find((c) => c.id === cardId);
      if (card?.matched) return;

      if (isConnected) {
        emitFlipCard(cardId);
      } else {
        handleLocalCardFlip(cardId);
      }
    },
    [isProcessing, flippedIds, cards, isConnected, emitFlipCard]
  );

  // Local game flip logic
  const handleLocalCardFlip = useCallback(
    (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.matched) return;

      // Reveal the card with proper display value
      setCards((prev) =>
        prev.map((c) => {
          if (c.id === cardId) {
            const displayValue = getCardDisplay(c.value, useImages);
            return useImages
              ? { ...c, image: displayValue }
              : { ...c, emoji: displayValue };
          }
          return c;
        })
      );

      setFlippedIds((prev) => {
        const newFlipped = [...prev, cardId];

        // Check for match when 2 cards are flipped
        if (newFlipped.length === 2) {
          setIsProcessing(true);
          const [firstId, secondId] = newFlipped;
          const firstCard = cards.find((c) => c.id === firstId);
          const secondCard = cards.find((c) => c.id === secondId);

          if (firstCard?.value === secondCard?.value) {
            // Match!
            setTimeout(() => {
              handleCardsMatched(newFlipped, currentUserId || "local-user");
              setIsProcessing(false);
            }, 500);
          } else {
            // No match
            setTimeout(() => {
              handleCardsMismatch(newFlipped);
              setIsProcessing(false);
            }, 1500);
          }
        }

        return newFlipped;
      });
    },
    [cards, currentUserId, useImages]
  );

  // Socket event: Game started
  const handleGameStarted = useCallback(
    (
      data: {
        deck?: number[] | string[];
        currentTurn?: string;
        players?: string[];
      },
      playersFirstId?: string
    ) => {
      console.log("Game started with deck:", data.deck);

      if (mismatchTimeoutRef.current) {
        clearTimeout(mismatchTimeoutRef.current);
        mismatchTimeoutRef.current = null;
      }

      setGameStarted(true);
      setWaitingForPlayers(false);
      setIsProcessing(false);

      if (data.deck) {
        const initialCards: GameCard[] = data.deck.map((value, index) => {
          const numValue =
            typeof value === "string" ? parseInt(value, 10) : value;
          console.log(`Card ${index}: value = ${numValue}`);

          return {
            id: `card-${index}`,
            emoji: useImages ? undefined : "🎴",
            image: useImages ? "🎴" : undefined,
            value: numValue,
            matched: false,
          };
        });
        setCards(initialCards);
      }

      // Initialize scores for all players
      const initialScores: Scores = {};
      if (data.players) {
        data.players.forEach((playerId) => {
          initialScores[playerId] = 0;
        });
      }
      setScores(initialScores);

      setCurrentTurn(data.currentTurn || playersFirstId || null);
      setFlippedIds([]);
    },
    [useImages]
  );

  // Socket event: Card flipped
  const handleCardFlipped = useCallback(
    (cardId: string, cardValue?: number) => {
      console.log("Card flipped event received:", { cardId, cardValue });

      setCards((prev) => {
        return prev.map((card) => {
          if (card.id === cardId) {
            const finalValue = cardValue !== undefined ? cardValue : card.value;
            const displayValue = getCardDisplay(finalValue, useImages);

            console.log(
              `Revealing card ${cardId}: value=${finalValue}, display=${displayValue}`
            );

            if (useImages) {
              return {
                ...card,
                image: displayValue,
                value: finalValue,
              };
            } else {
              return {
                ...card,
                emoji: displayValue,
                value: finalValue,
              };
            }
          }
          return card;
        });
      });

      setFlippedIds((prev) => {
        if (prev.includes(cardId)) return prev;
        return [...prev, cardId];
      });
    },
    [useImages]
  );

  // Socket event: Cards matched
  const handleCardsMatched = useCallback(
    (cardIds: string[], userId: string) => {
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
    },
    []
  );

  // Socket event: Cards mismatch
  const handleCardsMismatch = useCallback(
    (mismatchedCardIds?: string[]) => {
      console.log("Cards mismatch", mismatchedCardIds);

      if (mismatchTimeoutRef.current) {
        clearTimeout(mismatchTimeoutRef.current);
      }

      const cardsToHide = mismatchedCardIds || flippedIds;

      mismatchTimeoutRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((card) => {
            if (cardsToHide.includes(card.id) && !card.matched) {
              return useImages
                ? { ...card, image: "🎴" }
                : { ...card, emoji: "🎴" };
            }
            return card;
          })
        );

        setFlippedIds([]);
        mismatchTimeoutRef.current = null;
      }, MISMATCH_DELAY);
    },
    [flippedIds, useImages]
  );

  // Socket event: Turn changed
  const handleTurnChanged = useCallback((userId: string) => {
    console.log("Turn changed to:", userId);
    setCurrentTurn(userId);
    setIsProcessing(false);
  }, []);

  // Local game start
  const handleLocalGameStart = useCallback(() => {
    console.log("Starting local game (no server)");

    setGameStarted(true);
    setWaitingForPlayers(false);
    setIsProcessing(false);

    const pairs = ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭", "🎸", "🎹"];
    const deck = [...pairs, ...pairs];

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }

    const localCards: GameCard[] = deck.map((emoji, index) => ({
      id: `card-${index}`,
      emoji: useImages ? undefined : "🎴",
      image: useImages ? "🎴" : undefined,
      value: pairs.indexOf(emoji),
      matched: false,
    }));

    setCards(localCards);
    setCurrentTurn(currentUserId || "local-user");
    setScores({ [currentUserId || "local-user"]: 0 });
    setFlippedIds([]);
  }, [currentUserId, useImages]);

  return {
    // State
    cards,
    flippedIds,
    gameStarted,
    currentTurn,
    scores,
    waitingForPlayers,
    isProcessing,
    useImages,
    imagesLoading,
    imageProgress,

    // Setters
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
