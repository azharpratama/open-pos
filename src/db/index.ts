import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/openpos";

// Prevent multiple connection pools from being created during Next.js hot reload
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1") ||
  process.env.DB_SSL === "false";

export const conn =
  globalForDb.conn ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isLocal ? false : process.env.NODE_ENV === "production" ? "require" : false,
    prepare: false, // Recommended for transaction poolers (e.g. PgBouncer, serverless connection poolers)
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
