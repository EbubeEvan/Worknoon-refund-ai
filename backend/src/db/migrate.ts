import { env } from "../config/env.js";

/**
 * Migrations are plain SQL applied in order by drizzle-orm's migrator.
 * The first migration creates the pgvector extension for a since-removed
 * policy_chunks table; 0003 drops both, but a fresh database still needs the
 * pgvector image for 0000 to apply.
 */
export async function runMigrations(): Promise<void> {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { db } = await import("./client.js");
  console.log("[db] applying migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[db] migrations up to date");
}

const isEntrypoint = process.argv[1]?.includes("migrate");
if (isEntrypoint) {
  runMigrations()
    .then(async () => {
      const { pool } = await import("./client.js");
      await pool.end();
      process.exit(0);
    })
    .catch((err) => {
      console.error("[db] migration failed:", err);
      process.exit(1);
    });
}

export { env };
