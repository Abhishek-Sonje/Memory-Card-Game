ALTER TABLE "users" RENAME COLUMN "username" TO "name";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "created_at" TO "emailVerified";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "avatar" TO "image";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "started_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "leaderboard" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leaderboard" ALTER COLUMN "total_games_played" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leaderboard" ALTER COLUMN "total_wins" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leaderboard" ALTER COLUMN "total_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "moves" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "host_idx" ON "games" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "status_idx" ON "games" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leadboard_user_idx" ON "leaderboard" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wins_idx" ON "leaderboard" USING btree ("total_wins");--> statement-breakpoint
CREATE INDEX "score_idx" ON "leaderboard" USING btree ("total_score");--> statement-breakpoint
CREATE INDEX "player_turn_idx" ON "moves" USING btree ("player_id","turn_number");--> statement-breakpoint
CREATE INDEX "moves_game_idx" ON "moves" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "player_idx" ON "moves" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_user_idx" ON "players" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "player_game_idx" ON "players" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_game_user" ON "players" USING btree ("game_id","user_id");