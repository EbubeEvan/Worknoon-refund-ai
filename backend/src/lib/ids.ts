import { randomUUID } from "node:crypto";

/**
 * Prefixed identifiers.
 *
 * A readable prefix makes it obvious in logs and in a database viewer which
 * table an id came from, which matters when a reviewer is reading audit rows.
 */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export const newUserId = () => newId("usr");
export const newCustomerId = () => newId("cus");
export const newOrderId = () => newId("ord");
export const newRefundId = () => newId("ref");
export const newAuditId = () => newId("aud");
