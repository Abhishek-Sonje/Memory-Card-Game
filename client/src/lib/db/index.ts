import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as schema  from "@memory-game/shared/db/schema"

dotenv.config({ path: ".env.local" }); // or .env.local

if (!process.env.DATABASE_URL) {
  throw new Error("DatabaseURL is not set");
}

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql,{ schema });
