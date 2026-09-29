import type { Request, Response } from "express";
import { z } from "zod";

import { badRequest, notFound } from "../../lib/errors.js";
import { requireCustomer } from "../../middleware/auth.js";
import { listOrdersForCustomer } from "../orders/repository.js";
import { listRefundRequestsForCustomer } from "../refunds/repository.js";
import { findCustomerById } from "./repository.js";

/** Customer-facing handlers. All scoped to the session's customer id. */

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export function parsePagination(query: unknown): { limit: number; offset: number } {
  const parsed = paginationSchema.safeParse(query);
  if (!parsed.success) throw badRequest("Invalid pagination parameters");
  return parsed.data;
}

/** GET /api/customers/me - the caller's own profile with order and refund history. */
export async function getMyProfileHandler(req: Request, res: Response): Promise<void> {
  const customerId = requireCustomer(req);
  const customer = await findCustomerById(customerId);
  if (!customer) throw notFound("Customer profile not found");

  const [orders, refunds] = await Promise.all([
    listOrdersForCustomer(customer.id, 100, 0),
    listRefundRequestsForCustomer(customer.id, 100, 0),
  ]);

  res.json({ customer, orders, refunds });
}
