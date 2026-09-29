import type { Request, Response } from "express";
import { z } from "zod";

import { badRequest, notFound } from "../../lib/errors.js";
import { requireCustomer } from "../../middleware/auth.js";
import { recordAuditEvent } from "../audit/repository.js";
import { listOrdersForCustomer } from "../orders/repository.js";
import {
  countRefundRequestsForCustomer,
  listRefundRequestsForCustomer,
  summariseRefunds,
} from "./repository.js";
import { evaluateRefundRequest } from "./service.js";
import type { RetrievedContext } from "./types.js";

/**
 * Refund request controller.
 *
 * Controllers here are thin: validate, delegate to a service, shape the
 * response. The one piece of logic worth calling out is that the customer id is
 * read from the session via `requireCustomer`, never from the body.
 */

const MAX_MESSAGE_LENGTH = 4_000;

const createRefundSchema = z.object({
  message: z
    .string()
    .min(1, "Describe the reason for your refund request")
    .max(MAX_MESSAGE_LENGTH, "Message is too long"),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid request", parsed.error.issues);
  }
  return parsed.data;
}

/** POST /api/refunds/requests - submit a refund request and get a decision. */
export async function createRefundRequestHandler(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw badRequest("Unauthenticated");
  const customerId = requireCustomer(req);

  const body = parseOrThrow(createRefundSchema, req.body);

  const result = await evaluateRefundRequest({
    customerId,
    message: body.message,
    userId: principal.userId,
  });

  res.status(201).json({
    requestId: result.requestId,
    decision: result.outcome.decision,
    rules: result.outcome.rules,
    requiresHumanReview: result.outcome.requiresHumanReview,
    approvedAmountCents: result.outcome.approvedAmountCents,
    summary: result.outcome.summary,
    // The customer-facing reply. `response.source` lets the UI show whether this
    // was model-written or the deterministic fallback.
    reply: {
      text: result.response.text,
      source: result.response.source,
      degradedReason: result.response.degradedReason,
    },
    // Exposed for transparency and for the demo; both are non-authoritative.
    explain: {
      extraction: {
        source: result.extraction.source,
        orderNumber: result.extraction.orderNumber,
        reason: result.extraction.reason,
        requestedAmountCents: result.extraction.requestedAmountCents,
        degradedReason: result.extraction.degradedReason,
      },
      retrievedContext: result.policyContext.chunks.map((c): RetrievedContext => ({
        policyId: c.policyId,
        policyName: c.policyName,
        chunkIndex: c.chunkIndex,
        content: c.content,
      })),
      retrievalDegraded: result.policyContext.degraded,
    },
  });
}

/** GET /api/refunds/requests - the caller's own request history. */
export async function listRefundRequestsHandler(req: Request, res: Response): Promise<void> {
  const customerId = requireCustomer(req);
  const { limit, offset } = parseOrThrow(listSchema, req.query);

  const [requests, total] = await Promise.all([
    listRefundRequestsForCustomer(customerId, limit, offset),
    countRefundRequestsForCustomer(customerId),
  ]);
  res.json({ requests, total, limit, offset });
}

/** GET /api/refunds/stats - aggregate decision counters (admin dashboard). */
export async function refundStatsHandler(_req: Request, res: Response): Promise<void> {
  const stats = await summariseRefunds();
  res.json(stats);
}

/** GET /api/refunds/requests/:id - single request, scoped to the owner. */
export async function getRefundRequestHandler(req: Request, res: Response): Promise<void> {
  const customerId = requireCustomer(req);
  const { id } = req.params as { id: string };

  const all = await listRefundRequestsForCustomer(customerId, 100, 0);
  const found = all.find((r) => r.id === id);
  if (!found) throw notFound("Refund request not found");

  await recordAuditEvent({
    actorId: req.principal?.userId ?? null,
    actorType: "USER",
    action: "refund.viewed",
    entityType: "refund_request",
    entityId: found.id,
  });

  res.json(found);
}

/** GET /api/orders - the caller's orders, for the refund form's order picker. */
export async function listMyOrdersHandler(req: Request, res: Response): Promise<void> {
  const customerId = requireCustomer(req);
  const { limit, offset } = parseOrThrow(listSchema, req.query);
  const orders = await listOrdersForCustomer(customerId, limit, offset);
  res.json({ orders, limit, offset });
}
