"use client";

import React, { useState } from "react";

export interface CardProps {
  id: string;
  emoji?: string;
  image?: string;
  isFlipped: boolean;
  isMatched: boolean;
  onFlip: (id: string) => void;
  disabled: boolean;
  useImages?: boolean;
}

const Card: React.FC<CardProps> = ({
  id,
  emoji,
  image,
  isFlipped,
  isMatched,
  onFlip,
  disabled,
  useImages = false,
}) => {
  const [imageError, setImageError] = useState(false);

  // Use image prop if available, otherwise fall back to emoji
  const displayValue = image || emoji || "🎴";

  // Check if displayValue is a URL (starts with http/https or data:)
  const isImageUrl =
    useImages &&
    (displayValue.startsWith("http") ||
      displayValue.startsWith("data:") ||
      displayValue.startsWith("//"));

  // Determine if we should show image or emoji
  const shouldShowImage = isImageUrl && !imageError && displayValue !== "🎴";

  return (
    <button
      onClick={() => !disabled && onFlip(id)}
      disabled={disabled || isMatched}
      aria-label={`Card ${id}${isFlipped ? `, showing ${displayValue}` : ""}`}
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
          } rounded-lg flex items-center justify-center overflow-hidden`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {shouldShowImage ? (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img
                src={displayValue}
                alt={`Card ${id}`}
                className={`max-w-full max-h-full object-contain rounded-lg transition-opacity duration-200 ${
                  isMatched ? "opacity-60" : ""
                }`}
                onError={() => {
                  console.error(`Failed to load image: ${displayValue}`);
                  setImageError(true);
                }}
                loading="lazy"
              />
              {/* Matched overlay */}
              {isMatched && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-lg">
                  <svg
                    className="w-12 h-12 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <div className="text-4xl">{displayValue}</div>
          )}
        </div>
      </div>
    </button>
  );
};

export default React.memo(Card);
