import { db } from "@/lib/db";
import { leaderboard } from "@memory-game/shared/db/schema";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import NextAuth from "next-auth";

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not set");
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials are not set");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await db
        .insert(leaderboard)
        .values({
          userId: user.id,
          totalGamesPlayed: 0,
          totalScore: 0,
          totalWins: 0,
        });
    },
  },
});
