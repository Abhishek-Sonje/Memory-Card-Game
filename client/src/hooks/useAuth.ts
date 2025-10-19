"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface AuthToken {
  token: string;
  userId: string;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const [authToken, setAuthToken] = useState<AuthToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getAuthToken() {
      if (status === "loading") return;
      
      if (status === "unauthenticated") {
        setIsLoading(false);
        return;
      }

      if (session?.user?.id) {
        try {
          const response = await fetch("http://localhost:3002/api/auth/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: session.user.id }),
          });

          if (response.ok) {
            const data = await response.json();
            setAuthToken(data);
          } else {
            console.error("Failed to get auth token:", response.status, response.statusText);
            // Don't set auth token if request failed
          }
        } catch (error) {
          console.error("Error getting auth token:", error);
          // Don't set auth token if request failed
        } finally {
          setIsLoading(false);
        }
      }
    }

    getAuthToken();
  }, [session, status]);

  return {
    session,
    authToken,
    isLoading: isLoading || status === "loading",
    isAuthenticated: !!session && !!authToken,
  };
}
