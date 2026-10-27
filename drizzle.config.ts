import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: path.join(__dirname, "src/db/schema.ts"),
  out: path.join(__dirname, "src/db/migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/openpos",
  },
  verbose: true,
  strict: true,
});
