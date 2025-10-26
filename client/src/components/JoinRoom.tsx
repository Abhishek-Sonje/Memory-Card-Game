"use client";

import React, { useState } from "react";
import { useSocket } from "../hooks/useSocket";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "./UI/animated-modal-button";
import { motion } from "framer-motion";

export default function JoinRoomModal() {
  const { socket, isConnected, isAuthenticated } = useSocket();
  const [roomId, setRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }

      if (!socket || !isConnected) {
        alert("Not connected to the server yet!");
        return;
      }

    setIsJoining(true);

    try {
      // Replace with your actual userId and socket instance
      

      // TODO: Emit joinGame socket event
      socket.emit("joinGame", roomId.trim());
      console.log("Joining room:", roomId.trim());

      // The socket will handle the response via gameStarted or error events
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room. Please try again.");
      setIsJoining(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Modal>
        <ModalTrigger className="bg-black dark:bg-white dark:text-black text-white flex justify-center group/modal-btn px-8 py-4 text-lg">
          {" "}
          <span className="group-hover/modal-btn:translate-x-40 text-center transition duration-500 text-xl">
            Join Room
          </span>
          <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex items-center justify-center absolute inset-0 transition duration-500 text-black dark:text-white z-20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000000"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-search"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
              <path d="M21 21l-6 -6" />
            </svg>
          </div>
        </ModalTrigger>
        <ModalBody>
          <ModalContent>
            <div className="text-center mb-10">
              <h4 className="text-2xl md:text-3xl text-neutral-800 dark:text-neutral-100 font-bold mb-2">
                Join Game Room
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Enter the room ID shared by your friend
              </p>
            </div>

            <div className="flex justify-center items-center mb-8">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md"
              >
                <div className="relative">
                  <label
                    htmlFor="roomId"
                    className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3 uppercase tracking-wide"
                  >
                    Room ID
                  </label>
                  <div className="relative group">
                    <input
                      id="roomId"
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="e.g., game-123"
                      className="w-full px-5 py-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-black dark:focus:border-white transition-all duration-200 text-base font-medium"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-black to-neutral-800 dark:from-white dark:to-neutral-200 opacity-0 group-focus-within:opacity-5 transition-opacity pointer-events-none" />
                  </div>
                  <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-500 flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Ask your friend for the room ID to join
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <GameIcon className="mb-2 text-neutral-700 dark:text-neutral-300 h-6 w-6" />
                <span className="text-neutral-900 dark:text-neutral-100 text-sm font-semibold">
                  8 Pairs
                </span>
                <span className="text-neutral-500 dark:text-neutral-500 text-xs">
                  16 Cards
                </span>
              </motion.div>
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <UsersIcon className="mb-2 text-neutral-700 dark:text-neutral-300 h-6 w-6" />
                <span className="text-neutral-900 dark:text-neutral-100 text-sm font-semibold">
                  2 Players
                </span>
                <span className="text-neutral-500 dark:text-neutral-500 text-xs">
                  Multiplayer
                </span>
              </motion.div>
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <TrophyIcon className="mb-2 text-neutral-700 dark:text-neutral-300 h-6 w-6" />
                <span className="text-neutral-900 dark:text-neutral-100 text-sm font-semibold">
                  Scoring
                </span>
                <span className="text-neutral-500 dark:text-neutral-500 text-xs">
                  Track wins
                </span>
              </motion.div>
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <ClockIcon className="mb-2 text-neutral-700 dark:text-neutral-300 h-6 w-6" />
                <span className="text-neutral-900 dark:text-neutral-100 text-sm font-semibold">
                  Turn-based
                </span>
                <span className="text-neutral-500 dark:text-neutral-500 text-xs">
                  Take turns
                </span>
              </motion.div>
            </div>
          </ModalContent>
          <ModalFooter className="gap-3">
            <button
              className="px-6 py-2.5 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-200"
              disabled={isJoining}
            >
              Cancel
            </button>
            <button
              onClick={handleJoinRoom}
              disabled={isJoining || !roomId.trim()}
              className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg border border-black dark:border-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 min-w-[120px]"
            >
              {isJoining ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Joining...
                </span>
              ) : (
                "Join Room"
              )}
            </button>
          </ModalFooter>
        </ModalBody>
      </Modal>
    </div>
  );
}

const GameIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  );
};

const UsersIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
      <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
    </svg>
  );
};

const TrophyIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M8 21l8 0" />
      <path d="M12 17l0 4" />
      <path d="M7 4l10 0" />
      <path d="M17 4v8a5 5 0 0 1 -10 0v-8" />
      <path d="M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    </svg>
  );
};

const ClockIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 12l3 2" />
      <path d="M12 7v5" />
    </svg>
  );
};
