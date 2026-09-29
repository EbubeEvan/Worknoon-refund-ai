import type { Request, Response } from "express";
import { z } from "zod";

import { badRequest, notFound } from "../../lib/errors.js";
import { listAuditEvents, recordAuditEvent, summariseAudit } from "../audit/repository.js";
import { findCustomerById, listCustomersWithStats } from "../customers/repository.js";
import { listOrdersForCustomer, listOrdersWithCustomer } from "../orders/repository.js";
import {
  listEscalatedRequests,
  listRecentRequests,
  listRefundRequestsForCustomer,
  resolveEscalation,
} from "../refunds/repository.js";
import { summariseRefunds } from "../refunds/repository.js";

/**
 * Admin controller: escalation queue, customer 360, and the audit trail.
 * Authorization is enforced once at the router (`requireRole("ADMIN")`), so
 * nothing here repeats the role check.
 */

function page(req: Request): { limit: number; offset: number } {
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  return { limit, offset };
}

export async function listEscalationsHandler(req: Request, res: Response): Promise<void> {
  const { limit, offset } = page(req);
  const requests = await listEscalatedRequests(limit, offset);
  res.json({ requests, limit, offset });
}

const resolveSchema = z.object({
  resolve: z.enum(["APPROVE", "DENY"]),
  note: z.string().max(2_000).optional(),
  /** Indices into the order's items to refund. Omit to refund every returnable line. */
  lines: z.array(z.number().int().min(0)).min(1).optional(),
});

export async function resolveEscalationHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  const result = await resolveEscalation({
    requestId: id,
    resolve: parsed.data.resolve,
    adminUserId: req.principal!.userId,
    note: parsed.data.note ?? null,
    lines: parsed.data.lines,
  });

  await recordAuditEvent({
    actorId: req.principal!.userId,
    actorType: "USER",
    action: `escalation.${parsed.data.resolve.toLowerCase()}`,
    entityType: "refund_request",
    entityId: id,
    metadata: { note: parsed.data.note ?? null, ...result },
  });

  res.json({ ok: true, ...result });
}

export async function listCustomersHandler(req: Request, res: Response): Promise<void> {
  const { limit, offset } = page(req);
  const customers = await listCustomersWithStats(limit, offset);
  res.json({ customers, limit, offset });
}

export async function getCustomerHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const customer = await findCustomerById(id);
  if (!customer) throw notFound("Customer not found");

  const [orders, refunds] = await Promise.all([
    listOrdersForCustomer(customer.id, 100, 0),
    listRefundRequestsForCustomer(customer.id, 100, 0),
  ]);

  res.json({ customer, orders, refunds });
}

export async function listOrdersHandler(req: Request, res: Response): Promise<void> {
  const { limit, offset } = page(req);
  const orders = await listOrdersWithCustomer(limit, offset);
  res.json({ orders, limit, offset });
}

export async function listAuditHandler(req: Request, res: Response): Promise<void> {
  const { limit, offset } = page(req);
  const { rows, total } = await listAuditEvents({
    entityType: req.query.entityType as string | undefined,
    entityId: req.query.entityId as string | undefined,
    action: req.query.action as string | undefined,
    limit,
    offset,
  });
  res.json({ events: rows, total, limit, offset });
}

export async function auditSummaryHandler(_req: Request, res: Response): Promise<void> {
  res.json(await summariseAudit());
}

/** Everything the admin dashboard needs, in one round trip. */
export async function dashboardHandler(_req: Request, res: Response): Promise<void> {
  const [refunds, audit, recent, escalations] = await Promise.all([
    summariseRefunds(),
    summariseAudit(),
    listRecentRequests(10),
    listEscalatedRequests(10, 0),
  ]);
  res.json({ refunds, audit, recent, escalations });
}
