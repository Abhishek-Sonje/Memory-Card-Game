"use client";

import React from "react";
import { signIn, signOut } from "next-auth/react";
import { useAuth } from "@/hooks/useAuth";

function SignIn() {
  const { session, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="z-20 flex items-center justify-center min-h-screen">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated && session) {
    return (
      <div className="z-20 flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-white text-2xl">
          Welcome, {session.user?.name || session.user?.email}!
        </div>
        <div className="text-white text-lg">
          You are now authenticated and ready to play!
        </div>
        <button
          onClick={() => signOut()}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        await signIn("google");
      }}
      className="z-20 flex items-center justify-center min-h-screen"
    >
      <button
        className="bg-white z-20 text-black border-2 w-3xl h-32 text-5xl rounded-2xl p-2.5 hover:bg-gray-100 transition-colors"
        type="submit"
      >
        Sign in with Google
      </button>
    </form>
  );
}

export default SignIn;
