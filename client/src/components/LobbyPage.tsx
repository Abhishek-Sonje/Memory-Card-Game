"use client";
import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, Users, Menu, X } from "lucide-react";

// Types
import type {Player,Card,User,Scores} from "./types/games.type"
 

 interface CardProps {
   id: string;
   emoji: string;
   isFlipped: boolean;
   isMatched: boolean;
   onFlip: (id: string) => void;
   disabled: boolean;
 }
const Card: React.FC<CardProps> = ({
  id,
  emoji,
  isFlipped,
  isMatched,
  onFlip,
  disabled,
}) => {
  return (
    <button
      onClick={() => !disabled && onFlip(id)}
      disabled={disabled || isMatched}
      aria-label={`Card ${id}${isFlipped ? `, showing ${emoji}` : ""}`}
      className="relative w-full aspect-square cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-300"
        style={{
          transformStyle: "preserve-3d",
          transform:
            isFlipped || isMatched ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Card Back */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg flex items-center justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <svg
            className="w-8 h-8 text-gray-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>

        {/* Card Face */}
        <div
          className={`absolute inset-0 ${
            isMatched ? "bg-emerald-900/40" : "bg-gray-800"
          } border-2 ${
            isMatched ? "border-emerald-500" : "border-gray-600"
          } rounded-lg flex items-center justify-center text-4xl`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {emoji}
        </div>
      </div>
    </button>
  );
};

// Player Item Component
interface PlayerItemProps {
  player: Player;
  isCurrentUser: boolean;
  isHost: boolean;
}

const PlayerItem: React.FC<PlayerItemProps> = ({
  player,
  isCurrentUser,
  isHost,
}) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
        {player.name.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{player.name}</span>
          {isHost && (
            <span className="text-xs bg-purple-600 px-2 py-0.5 rounded text-white">
              HOST
            </span>
          )}
          {isCurrentUser && (
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
              You
            </span>
          )}
        </div>
      </div>
      <div
        className={`w-3 h-3 rounded-full ${
          player.ready ? "bg-emerald-500" : "bg-gray-600"
        }`}
        aria-label={player.ready ? "Ready" : "Not ready"}
      />
    </div>
  );
};

// Main Lobby Component
function Lobby() {
  // Props that would come from parent/auth (placeholder for now)
  const [currentUser] = useState<User>({ id: "user-1", name: "Guest-1234" });
  const [roomCode] = useState<string>("ABCD1234");
  const [isHost] = useState<boolean>(true);

  // Game state
  const [players, setPlayers] = useState<Player[]>([
    { id: "user-1", name: "Guest-1234", ready: false },
  ]);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [waitingForPlayers, setWaitingForPlayers] = useState<boolean>(false);

  const socketRef = useRef<any>(null);
  const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  // Initialize emoji deck
  const initializeDeck = () => {
    const emojis = ["🎮", "🎯", "🎨", "🎭", "🎪", "🎸", "🎺", "🎼"];
    const deck: Card[] = [...emojis, ...emojis]
      .map((emoji, index) => ({
        id: `card-${index}`,
        emoji,
        matched: false,
      }))
      .sort(() => Math.random() - 0.5);
    setCards(deck);
  };

  // Socket.IO Integration
  useEffect(() => {
    // Initialize socket connection
    if (typeof window !== "undefined") {
      const io = require("socket.io-client");
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        autoConnect: false,
      });

      const socket = socketRef.current;

      // Connect and join room
      socket.connect();
      socket.emit("joinRoom", {
        roomCode,
        userId: currentUser.id,
        userName: currentUser.name,
      });

      // Socket event listeners
      socket.on("playerJoined", (data: { id: string; name: string }) => {
        setPlayers((prev) => {
          if (prev.find((p) => p.id === data.id)) return prev;
          return [...prev, { id: data.id, name: data.name, ready: false }];
        });
        setWaitingForPlayers(false);
      });

      socket.on("playerLeft", (data: { userId: string }) => {
        setPlayers((prev) => prev.filter((p) => p.id !== data.userId));
      });

      socket.on("playerReady", (data: { userId: string; ready: boolean }) => {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === data.userId ? { ...p, ready: data.ready } : p
          )
        );
      });

      socket.on(
        "gameStarted",
        (data: { deck?: string[]; currentTurn?: string }) => {
          setGameStarted(true);
          setWaitingForPlayers(false);
          if (data.deck) {
            setCards(
              data.deck.map((emoji, index) => ({
                id: `card-${index}`,
                emoji,
                matched: false,
              }))
            );
          } else {
            initializeDeck();
          }
          setCurrentTurn(data.currentTurn || players[0]?.id || null);
        }
      );

      socket.on("cardFlipped", (data: { cardId: string; userId: string }) => {
        // Server authoritative flip
        setFlippedIds((prev) => {
          if (prev.includes(data.cardId)) return prev;
          return [...prev, data.cardId];
        });
      });

      socket.on(
        "cardsMatched",
        (data: { cardIds: string[]; userId: string }) => {
          setCards((prev) =>
            prev.map((card) =>
              data.cardIds.includes(card.id) ? { ...card, matched: true } : card
            )
          );
          setFlippedIds([]);
          setScores((prev) => ({
            ...prev,
            [data.userId]: (prev[data.userId] || 0) + 1,
          }));
        }
      );

      socket.on("cardsMismatch", (data: { cardIds: string[] }) => {
        setTimeout(() => {
          setFlippedIds([]);
        }, 1000);
      });

      socket.on("turnChanged", (data: { userId: string }) => {
        setCurrentTurn(data.userId);
      });

      socket.on(
        "gameOver",
        (data: { winner: { name: string; score: number } }) => {
          alert(
            `Game Over! Winner: ${data.winner.name} with ${data.winner.score} pairs!`
          );
        }
      );

      return () => {
        socket.emit("leaveRoom", { roomCode, userId: currentUser.id });
        socket.disconnect();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local fallback (when socket not connected)
  useEffect(() => {
    if (!gameStarted && cards.length === 0) {
      initializeDeck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle card flip
  const handleCardFlip = (cardId: string) => {
    if (flippedIds.length >= 2) return;
    if (flippedIds.includes(cardId)) return;

    const card = cards.find((c) => c.id === cardId);
    if (card?.matched) return;

    // Emit to server
    if (socketRef.current?.connected) {
      socketRef.current.emit("flipCard", {
        roomCode,
        cardId,
        userId: currentUser.id,
      });
    }

    // Optimistic local update
    setFlippedIds((prev) => [...prev, cardId]);

    // Local fallback matching logic
    if (flippedIds.length === 1 && !socketRef.current?.connected) {
      const firstCard = cards.find((c) => c.id === flippedIds[0]);
      const secondCard = cards.find((c) => c.id === cardId);

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

  // Handle ready toggle
  const handleReadyToggle = () => {
    const newReadyState = !players.find((p) => p.id === currentUser.id)?.ready;
    if (socketRef.current?.connected) {
      socketRef.current.emit("playerReady", {
        roomCode,
        userId: currentUser.id,
        ready: newReadyState,
      });
    }
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUser.id ? { ...p, ready: newReadyState } : p
      )
    );
  };

  // Handle game start
  const handleStartGame = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("startGame", { roomCode });
    } else {
      // Local fallback
      setGameStarted(true);
      setWaitingForPlayers(false);
      initializeDeck();
    }
  };

  // Copy room code
  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allReady = players.length >= 2 && players.every((p) => p.ready);
  const isMyTurn = currentTurn === currentUser.id;

  return (
    <div className="min-h-screen w-full bg-black relative">
      {/* Striped Dark Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "repeating-linear-gradient(45deg, #000 0px, #111 2px, #000 4px, #222 6px)",
        }}
      />

      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backdropFilter: "grayscale(0%)",
        }}
      />

      {/* Main Content */}
      <div className="relative z-50 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-gray-800 backdrop-blur-sm bg-black/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">Memory Match</h1>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-lg border border-gray-700">
                <span className="text-gray-400 text-sm">Room:</span>
                <span className="text-white font-mono font-semibold">
                  {roomCode}
                </span>
                <button
                  onClick={handleCopyRoomCode}
                  className="ml-1 p-1 hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  aria-label="Copy room code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors text-white"
              aria-label="Toggle menu"
            >
              {isDrawerOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            <div className="hidden lg:flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <span className="text-white">
                {players.length} Player{players.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </header>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
          {/* Game Board */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {waitingForPlayers && !gameStarted ? (
              <div className="flex flex-col items-center gap-4 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-emerald-500" />
                <p className="text-xl">Waiting for players to join...</p>
                <p className="text-gray-400 text-sm">
                  Share room code:{" "}
                  <span className="font-mono font-semibold">{roomCode}</span>
                </p>
              </div>
            ) : (
              <>
                {gameStarted && (
                  <div className="mb-4 text-center">
                    <p className="text-white text-lg">
                      {isMyTurn ? (
                        <span className="text-emerald-400 font-semibold">
                          Your Turn!
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          Waiting for opponent...
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-3 w-full max-w-2xl">
                  {cards.map((card) => (
                    <Card
                      key={card.id}
                      id={card.id}
                      emoji={card.emoji}
                      isFlipped={flippedIds.includes(card.id)}
                      isMatched={card.matched}
                      onFlip={handleCardFlip}
                      disabled={
                        !gameStarted || !isMyTurn || flippedIds.length >= 2
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Side Panel (Desktop) */}
          <aside className="hidden lg:block w-80 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 p-6 space-y-6">
            <div>
              <h2 className="text-white text-xl font-semibold mb-4">Players</h2>
              <div className="space-y-3">
                {players.map((player) => (
                  <PlayerItem
                    key={player.id}
                    player={player}
                    isCurrentUser={player.id === currentUser.id}
                    isHost={isHost && player.id === currentUser.id}
                  />
                ))}
              </div>
            </div>

            {!gameStarted && (
              <div className="space-y-3">
                <button
                  onClick={handleReadyToggle}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                    players.find((p) => p.id === currentUser.id)?.ready
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  {players.find((p) => p.id === currentUser.id)?.ready
                    ? "Ready!"
                    : "Ready Up"}
                </button>

                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={!allReady}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    Start Game
                  </button>
                )}
              </div>
            )}

            {gameStarted && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3">Scores</h3>
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between text-sm mb-2"
                  >
                    <span className="text-gray-300">{player.name}</span>
                    <span className="text-emerald-400 font-semibold">
                      {scores[player.id] || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-800 p-6 space-y-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">Game Info</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <span className="text-gray-400 text-sm">Room:</span>
              <span className="text-white font-mono font-semibold">
                {roomCode}
              </span>
              <button
                onClick={handleCopyRoomCode}
                className="ml-auto p-1 hover:bg-gray-700 rounded"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3">Players</h3>
              <div className="space-y-3">
                {players.map((player) => (
                  <PlayerItem
                    key={player.id}
                    player={player}
                    isCurrentUser={player.id === currentUser.id}
                    isHost={isHost && player.id === currentUser.id}
                  />
                ))}
              </div>
            </div>

            {!gameStarted && (
              <div className="space-y-3">
                <button
                  onClick={handleReadyToggle}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    players.find((p) => p.id === currentUser.id)?.ready
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  {players.find((p) => p.id === currentUser.id)?.ready
                    ? "Ready!"
                    : "Ready Up"}
                </button>

                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={!allReady}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors"
                  >
                    Start Game
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;
