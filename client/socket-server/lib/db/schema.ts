import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  text,
  primaryKey,
} from "drizzle-orm/pg-core";

// NextAuth Required Tables
export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 256 }).notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: varchar("image", { length: 512 }),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// Your Game Tables
export const gameStatus = pgEnum("game_status", [
  "waiting",
  "in_progress",
  "completed",
]);

export const games = pgTable(
  "games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hostId: uuid("host_id")
      .references(() => users.id)
      .notNull(),
    roomId: varchar("room_id").notNull(),
    opponentId: uuid("opponent_id").references(() => users.id),
    status: gameStatus("status").default("waiting").notNull(),
    winnerId: uuid("winner_id").references(() => users.id),
    startedAt: timestamp("started_at").defaultNow(),
    endedAt: timestamp("ended_at"),
  },
  (table) => ({
    hostIdx: index("host_idx").on(table.hostId),
    statusIdx: index("status_idx").on(table.status),
  })
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .references(() => games.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    score: integer("score").default(0).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("user_idx").on(table.userId),
    gameIdx: index("player_game_idx").on(table.gameId),
    uniqueGameUser: uniqueIndex("unique_game_user").on(
      table.gameId,
      table.userId
    ),
  })
);

export const moves = pgTable(
  "moves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .references(() => games.id)
      .notNull(),
    playerId: uuid("player_id")
      .references(() => players.id)
      .notNull(),
    cardSelected: integer("card_selected").notNull(),
    turnNumber: integer("turn_number").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    playerTurnIdx: index("player_turn_idx").on(
      table.playerId,
      table.turnNumber
    ),
    gameIdx: index("moves_game_idx").on(table.gameId),
    playerIdx: index("player_idx").on(table.playerId),
  })
);

export const leaderboard = pgTable(
  "leaderboard",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull()
      .unique(),
    totalGamesPlayed: integer("total_games_played").default(0).notNull(),
    totalWins: integer("total_wins").default(0).notNull(),
    totalScore: integer("total_score").default(0).notNull(),
    lastPlayedAt: timestamp("last_played_at"),
  },
  (table) => ({
    userIdx: index("leadboard_user_idx").on(table.userId),
    winsIdx: index("wins_idx").on(table.totalWins),
    scoreIdx: index("score_idx").on(table.totalScore),
  })
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export type Move = typeof moves.$inferSelect;
export type NewMove = typeof moves.$inferInsert;

export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type NewLeaderboardEntry = typeof leaderboard.$inferInsert;
