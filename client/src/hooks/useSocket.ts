"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

export function useSocket() {
  const { authToken, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      return;
    }

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002", {

      auth: {
        token: authToken.token,
        userId: authToken.userId,
      },
    });

    socketInstance.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    socketInstance.on("error", (error) => {
      console.error("Socket error:", error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, authToken]);

  return {
    socket,
    isConnected,
    isAuthenticated,
   
  };
}
