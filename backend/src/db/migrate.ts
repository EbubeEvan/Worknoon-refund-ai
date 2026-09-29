import { env } from "../config/env.js";

/**
 * Migrations are plain SQL applied in order by drizzle-orm's migrator.
 * A hand-written first migration creates the pgvector extension, because the
 * `vector` column type in policy_chunks cannot exist without it.
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
