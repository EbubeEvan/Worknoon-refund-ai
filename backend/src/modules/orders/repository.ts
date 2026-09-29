import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db/client.js";
import { queryRows } from "../../db/execute.js";
import { type OrderItem, orders } from "../../db/schema/index.js";
import type { OrderStatus, RefundStatus } from "../../domain/refund-policy.service.js";

/**
 * Order reads for the refund flow.
 *
 * `customerId` is mandatory on every lookup. There is deliberately no
 * `findOrderByNumber()` without it: resolving an order by number alone would be
 * an IDOR, since order numbers are customer-supplied and guessable.
 */

export interface OrderRecord {
  id: string;
  customerId: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  totalAmountCents: number;
  isFinalSale: boolean;
  purchasedAt: Date;
  refundStatus: RefundStatus;
  items: OrderItem[];
}

export async function findOrderForCustomer(
  orderNumber: string,
  customerId: string,
): Promise<OrderRecord | null> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.customerId, customerId)))
    .limit(1);
  return row ?? null;
}

export async function listOrdersForCustomer(
  customerId: string,
  limit = 50,
  offset = 0,
): Promise<OrderRecord[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.purchasedAt))
    .limit(limit)
    .offset(offset);
}

export interface OrderWithCustomer extends OrderRecord {
  customerName: string;
  customerEmail: string;
}

/** Admin view: any order, with its owner attached. */
export async function listOrdersWithCustomer(limit = 50, offset = 0): Promise<OrderWithCustomer[]> {
  const rows = await queryRows(sql`
    select o.*, c.full_name as customer_name, c.email as customer_email
    from orders o
    join customers c on c.id = o.customer_id
    order by o.purchased_at desc
    limit ${limit} offset ${offset}
  `);
  return rows.map((r) => ({
    id: String(r.id),
    customerId: String(r.customer_id),
    orderNumber: String(r.order_number),
    status: r.status as OrderStatus,
    currency: String(r.currency),
    totalAmountCents: Number(r.total_amount_cents),
    isFinalSale: Boolean(r.is_final_sale),
    purchasedAt: new Date(r.purchased_at as string),
    refundStatus: r.refund_status as RefundStatus,
    items: (r.items as OrderItem[]) ?? [],
    customerName: String(r.customer_name),
    customerEmail: String(r.customer_email),
  }));
}

export async function markOrderRefunded(orderId: string): Promise<void> {
  await db.update(orders).set({ refundStatus: "REFUNDED" }).where(eq(orders.id, orderId));
}
