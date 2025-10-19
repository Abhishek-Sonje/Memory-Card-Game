"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";

export function AuthTest() {
  const { session, authToken, isAuthenticated, isLoading } = useAuth();
  const { socket, isConnected } = useSocket();

  if (isLoading) {
    return <div className="text-white">Loading authentication...</div>;
  }

  return (
    <div className="text-white space-y-2 p-4">
      <h3 className="text-xl font-bold">Authentication Status</h3>
      <div>Authenticated: {isAuthenticated ? "✅" : "❌"}</div>
      <div>Socket Connected: {isConnected ? "✅" : "❌"}</div>
      <div>User: {session?.user?.name || session?.user?.email || "Not logged in"}</div>
      <div>User ID: {session?.user?.id || "N/A"}</div>
      <div>Token: {authToken ? "✅ Generated" : "❌ Not available"}</div>
      <div>Socket: {socket ? "✅ Connected" : "❌ Not connected"}</div>
    </div>
  );
}
