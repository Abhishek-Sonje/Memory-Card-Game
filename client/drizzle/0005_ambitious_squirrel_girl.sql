ALTER TABLE "sessions" RENAME TO "session";--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "sessions_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;