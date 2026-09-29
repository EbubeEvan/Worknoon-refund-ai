import type { SQLWrapper } from "drizzle-orm";
import { db } from "./client.js";

/**
 * Run raw SQL and get back an array of rows.
 *
 * With the node-postgres driver, drizzle's `db.execute()` resolves to a
 * `QueryResult` object - it has a `.rows` property but is not itself iterable.
 * Casting it to an array type compiles fine and then throws
 * "x.map is not a function" at runtime, so every raw query goes through this
 * helper instead.
 *
 * Prefer the query builder where it reads well; this is for the conditional
 * aggregates and the multi-table selects that would be unreadable otherwise.
 */
export async function queryRows<T = Record<string, unknown>>(
  query: SQLWrapper,
): Promise<T[]> {
  const result = await db.execute(query);
  return (result as unknown as { rows: T[] }).rows;
}
