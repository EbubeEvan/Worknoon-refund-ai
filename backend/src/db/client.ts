import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  // Fail fast rather than hanging a request forever if the DB is down.
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  // An idle client erroring out should not take the process down.
  console.error("[db] idle client error", err.message);
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export * as tables from "./schema/index.js";
