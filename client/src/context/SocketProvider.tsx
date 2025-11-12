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
  // isConnected: boolean;
  status: "idle" | "connecting" | "connected" | "disconnected" | "error";
  errorMessage?: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  status: "idle",
  errorMessage: null,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { authToken, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  // const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<SocketContextType["status"]>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      setStatus("connected");
      return;
    }

    console.log("🔌 Creating new socket connection...");
    setStatus("connecting");
    setErrorMessage(null);

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
      setStatus("connected");
      setErrorMessage(null);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setStatus("disconnected");
    });

    socketInstance.on("connect_error", (error) => {
      console.log("🔴 Socket connection error:", error.message);
      setStatus("error");
      setErrorMessage(error.message);
    });

    socketInstance.on("error", (error) => {
      console.log("Socket runtime error:", error);
      setStatus("error");
      setErrorMessage(
        typeof error === "string" ? error : JSON.stringify(error)
      );
    });

    socketInstance.on("duplicateConnection", (data) => {
      console.warn("⚠️ Duplicate connection:", data.message);
       setStatus("error");
       setErrorMessage(data.message);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // ⚠️ IMPORTANT: Only disconnect when auth changes, NOT on every unmount
     return () => {
       console.log("🧹 SocketProvider cleanup - keeping connection persistent");
     };
  }, [isAuthenticated, authToken?.userId]); // Only depend on userId, not entire authToken object

  // Separate cleanup effect for when user logs out
  useEffect(() => {
    if (!isAuthenticated && socketRef.current) {
       console.log("🔌 User logged out, disconnecting socket");
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus("disconnected");
      setErrorMessage(null);
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, status, errorMessage }}>
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
