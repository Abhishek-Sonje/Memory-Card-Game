"use client";

import { useSocketContext } from "../context/SocketProvider"
import { useAuth } from "./useAuth";

export function useSocket() {
  const { socket, isConnected } = useSocketContext();
  const { isAuthenticated } = useAuth();

  return {
    socket,
    isConnected,
    isAuthenticated,
  };
}
