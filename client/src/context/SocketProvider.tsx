"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { authToken, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Don't create socket if not authenticated
    if (!isAuthenticated || !authToken) {
      console.log("❌ Not authenticated, skipping socket connection");
      return;
    }

    // Don't create new socket if one already exists
    if (socketRef.current?.connected) {
      console.log("✅ Socket already connected, reusing existing connection");
      return;
    }

    console.log("🔌 Creating new socket connection...");

    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002",
      {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
        auth: {
          token: authToken.token,
          userId: authToken.userId,
        },
      }
    );

    socketInstance.on("connect", () => {
      console.log("✅ Socket connected:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error.message);
    });

    socketInstance.on("error", (error) => {
      console.error("Socket error:", error);
      alert("Socket error: " + error);
    });

    socketInstance.on("duplicateConnection", (data) => {
      console.warn("⚠️ Duplicate connection:", data.message);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // ⚠️ IMPORTANT: Only disconnect when auth changes, NOT on every unmount
    return () => {
      console.log(
        "🔌 SocketProvider cleanup - NOT disconnecting (will reuse connection)"
      );
      // Don't disconnect here - let the socket persist across route changes
    };
  }, [isAuthenticated, authToken?.userId]); // Only depend on userId, not entire authToken object

  // Separate cleanup effect for when user logs out
  useEffect(() => {
    if (!isAuthenticated && socketRef.current) {
      console.log("🔌 User logged out, disconnecting socket");
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within SocketProvider");
  }
  return context;
};
