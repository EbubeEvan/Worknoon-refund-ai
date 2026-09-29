import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { customers } from "../../db/schema/index.js";

/**
 * Customer profile lookups.
 *
 * The only entry point that resolves a session to a customerId is
 * `resolvePrincipal` in middleware/auth.ts, which reads the customer row from
 * the server-side session. Nothing here accepts a client-supplied customer id.
 */

export interface CustomerRecord {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  tier: string;
  lifetimeValueCents: number;
}

export async function findCustomerById(id: string): Promise<CustomerRecord | null> {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return row ?? null;
}

export async function findCustomerByUserId(userId: string): Promise<CustomerRecord | null> {
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);
  return row ?? null;
}

export interface CustomerWithStats extends CustomerRecord {
  orderCount: number;
  totalSpendCents: number;
  refundedCents: number;
}

/** Customer profile plus aggregate spend, for the admin customer list. */
export async function listCustomersWithStats(
  limit = 50,
  offset = 0,
): Promise<CustomerWithStats[]> {
  const rows = await db
    .select({
      id: customers.id,
      userId: customers.userId,
      fullName: customers.fullName,
      email: customers.email,
      tier: customers.tier,
      lifetimeValueCents: customers.lifetimeValueCents,
      orderCount: sql<number>`(
        select count(*)::int from orders o where o.customer_id = ${customers.id}
      )`,
      totalSpendCents: sql<number>`coalesce((
        select sum(o.total_amount_cents) from orders o where o.customer_id = ${customers.id}
      ), 0)`,
      refundedCents: sql<number>`coalesce((
        select sum(o.total_amount_cents) from orders o
        where o.customer_id = ${customers.id} and o.refund_status = 'REFUNDED'
      ), 0)`,
    })
    .from(customers)
    .orderBy(desc(customers.lifetimeValueCents))
    .limit(limit)
    .offset(offset);

  return rows;
}
