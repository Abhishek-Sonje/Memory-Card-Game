import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DatabaseURL is not set");
}

export default defineConfig({
  out: "./drizzle", // Or "./migrations" if you prefer
  schema: "./src/lib/db/schema.ts", // Use your project's schema path
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: "__drizzle_migration",
    schema: "public",
  },
  verbose: true,
  // strict: true,
});
