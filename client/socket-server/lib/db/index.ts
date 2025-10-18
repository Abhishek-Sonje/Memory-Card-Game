import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as schema  from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DatabaseURL is not set");
}

dotenv.config({ path: ".env.local" }); // or .env.local

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql,{ schema });
