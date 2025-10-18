"use client";

import React from "react";
import { signIn } from "next-auth/react";

function SignIn() {
  return (
    <form
      action={async () => {
        await signIn("google");
      }}
      className="z-20 flex items-center justify-center min-h-screen"
    >
      <button
        className="bg-white z-20 text-black border-2 w-3xl h-32 text-5xl rounded-2xl p-2.5"
        type="submit"
      >
        Google
      </button>
    </form>
  );
}

export default SignIn;
