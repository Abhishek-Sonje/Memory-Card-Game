"use client";

import { useSocketContext } from "../context/SocketProvider";
import { useAuth } from "./useAuth";

export function useSocket() {
  const { socket, status, errorMessage } = useSocketContext();
  const { isAuthenticated } = useAuth();

  return {
    socket,
    status,
    errorMessage,
    isAuthenticated,
  };
}
