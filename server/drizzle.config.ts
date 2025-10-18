import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../packages/shared/db/schema.ts", // shared package in your monorepo
  out: "./migrations", // where migration files will be generated
  dialect: "postgresql", // modern replacement for "driver: pg"
  dbCredentials: {
    url: process.env.DATABASE_URL!, // database URL from .env
  },
});


 