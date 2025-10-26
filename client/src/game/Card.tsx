"use client";

import React from "react";

export interface CardProps {
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
            aria-hidden
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

export default React.memo(Card);
