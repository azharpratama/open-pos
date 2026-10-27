import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, conn } from "./index";
import path from "path";

async function runMigrate() {
  console.log("⏳ Running database migrations (schema tables)...");
  const start = Date.now();
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "migrations"),
  });
  const end = Date.now();
  console.log(`✅ Migrations completed successfully in ${end - start}ms`);
  await conn.end();
  process.exit(0);
}

runMigrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
