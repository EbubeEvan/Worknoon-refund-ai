import { sql } from "drizzle-orm";

import { db, pool } from "../src/db/client.js";
import { seedIfEmpty } from "../src/db/seed.js";

/**
 * Reset the demo dataset to a known state and re-seed it.
 *
 *   POSTGRES_HOST=... npx tsx scripts/reset-demo.ts
 *
 * Truncates the domain tables (customers cascade to orders and refund
 * requests) and leaves the Better Auth users and policies alone, so login
 * credentials survive. Useful before a demo or before the e2e run, which needs
 * a clean slate to assert on refund counts.
 */
async function main() {
  console.log("truncating domain tables...");
  await db.execute(sql`
    truncate table refund_requests, orders, customers, policy_chunks, policies
    restart identity cascade
  `);

  console.log("re-seeding...");
  await seedIfEmpty();

  console.log("done.");
  await pool.end();
}

main().catch(async (e) => {
  console.error("reset failed:", e);
  await pool.end();
  process.exit(1);
});
