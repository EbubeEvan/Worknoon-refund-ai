import { and, count, eq, sql } from "drizzle-orm";

import { db } from "../../db/client.js";
import { queryRows } from "../../db/execute.js";
import { type OrderItem, orders, refundRequests } from "../../db/schema/index.js";
import type { Decision, PolicyRuleCode, RefundReason } from "../../domain/refund-policy.service.js";
import { conflict, notFound } from "../../lib/errors.js";
import { newRefundId } from "../../lib/ids.js";
import type { ExtractedRefundIntent, RetrievedContext } from "./types.js";

/**
 * Persistence for refund requests.
 *
 * The row stores both halves of the decision: the deterministic outcome, and the
 * AI contribution that fed it (extraction plus retrieved context). Separating
 * them is what allows a reviewer to answer "why was this approved?" without
 * re-running anything.
 */

export interface CreateRefundRequestInput {
  customerId: string;
  orderId: string;
  message: string;
  reason: RefundReason;
  requestedAmountCents: number | null;
  approvedAmountCents: number | null;
  decision: Decision;
  decisionReasons: PolicyRuleCode[];
  status: "SUBMITTED" | "DECIDED";
  extraction: ExtractedRefundIntent;
  injectionDetected: boolean;
  policyId: string | null;
  policyVersion: number | null;
  retrievedContext: RetrievedContext[];
}

export interface RefundRequestRecord extends Omit<CreateRefundRequestInput, "extraction"> {
  id: string;
  aiExtraction: Record<string, unknown> | null;
  retrievedContext: RetrievedContext[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Persist a decision and, when approved, mark the order refunded.
 *
 * This is a single transaction on purpose. If the request row and the order's
 * `refund_status` were written separately, an approved refund could be recorded
 * without the order reflecting it - and the engine's `ALREADY_REFUNDED` guard
 * reads that column. The failure mode is a customer submitting the same request
 * repeatedly and being approved each time, so the two writes must not be
 * separable.
 */
export async function createRefundRequest(
  input: CreateRefundRequestInput,
): Promise<RefundRequestRecord> {
  const id = newRefundId();

  return db.transaction(async (tx) => {
    // Serialise on the order row before deciding anything about it. The policy
    // engine ran outside this transaction, so two concurrent requests could both
    // have read refund_status = 'NONE' and both decided APPROVED. Taking the
    // lock here and re-reading is what makes a double refund impossible rather
    // than merely unlikely.
    const [locked] = await tx
      .select({
        refundStatus: orders.refundStatus,
        totalAmountCents: orders.totalAmountCents,
      })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");

    if (!locked) throw new Error("order not found while recording a refund request");

    // Lost the race: another request already refunded this order. Mirror what
    // the engine would have decided had it read the committed value.
    let decision = input.decision;
    let reasons = input.decisionReasons;
    let status = input.status;
    let approvedAmountCents = decision === "APPROVED" ? input.approvedAmountCents : null;
    if (decision === "APPROVED" && locked.refundStatus === "REFUNDED") {
      decision = "DENIED";
      reasons = ["ALREADY_REFUNDED"];
      status = "DECIDED";
      approvedAmountCents = null;
    }

    const [row] = await tx
      .insert(refundRequests)
      .values({
        id,
        customerId: input.customerId,
        orderId: input.orderId,
        message: input.message,
        reason: input.reason,
        requestedAmountCents: input.requestedAmountCents,
        approvedAmountCents,
        decision,
        decisionReasons: reasons,
        status,
        aiExtraction: {
          source: input.extraction.source,
          intent: input.extraction.intent,
          orderNumber: input.extraction.orderNumber,
          reason: input.extraction.reason,
          requestedAmountCents: input.extraction.requestedAmountCents,
          degradedReason: input.extraction.degradedReason,
          raw: input.extraction.raw,
        },
        injectionDetected: input.injectionDetected,
        policyId: input.policyId,
        policyVersion: input.policyVersion,
        retrievedContext: input.retrievedContext,
      })
      .returning();

    if (!row) throw new Error("refund request insert returned no row");

    // An auto-approval consumes the order's refund eligibility immediately, so
    // the next request hits ALREADY_REFUNDED instead of being approved again.
    if (decision === "APPROVED") {
      await tx.update(orders).set({ refundStatus: "REFUNDED" }).where(eq(orders.id, input.orderId));
    }

    return { ...(row as RefundRequestRecord), decision, decisionReasons: reasons };
  });
}

/** True when this customer already has an unresolved request for the order. */
export async function hasOpenRequestForOrder(orderId: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(refundRequests)
    .where(and(eq(refundRequests.orderId, orderId), eq(refundRequests.status, "SUBMITTED")));
  return (row?.n ?? 0) > 0;
}

export interface RefundRequestWithOrder extends RefundRequestRecord {
  orderNumber: string;
  orderTotalCents: number;
  items: OrderItem[];
}

export async function listRefundRequestsForCustomer(
  customerId: string,
  limit = 50,
  offset = 0,
): Promise<RefundRequestWithOrder[]> {
  const rows = await queryRows(sql`
    select r.*, o.order_number, o.total_amount_cents, o.items
    from refund_requests r
    join orders o on o.id = r.order_id
    where r.customer_id = ${customerId}
    order by r.created_at desc
    limit ${limit} offset ${offset}
  `);

  return rows.map((r) => ({
    id: String(r.id),
    customerId: String(r.customer_id),
    orderId: String(r.order_id),
    message: String(r.message),
    reason: r.reason as RefundReason,
    requestedAmountCents:
      r.requested_amount_cents === null ? null : Number(r.requested_amount_cents),
    approvedAmountCents: r.approved_amount_cents === null ? null : Number(r.approved_amount_cents),
    decision: r.decision as Decision,
    decisionReasons: (r.decision_reasons as PolicyRuleCode[]) ?? [],
    status: r.status as "SUBMITTED" | "DECIDED",
    injectionDetected: Boolean(r.injection_detected),
    policyId: (r.policy_id as string | null) ?? null,
    policyVersion: r.policy_version === null ? null : Number(r.policy_version),
    retrievedContext: (r.retrieved_context as RetrievedContext[]) ?? [],
    aiExtraction: (r.ai_extraction as Record<string, unknown> | null) ?? null,
    orderNumber: String(r.order_number),
    orderTotalCents: Number(r.total_amount_cents),
    items: (r.items as OrderItem[]) ?? [],
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  }));
}

/** Admin escalation queue: everything routed to a human, newest first. */
export async function listEscalatedRequests(
  limit = 50,
  offset = 0,
): Promise<RefundRequestWithOrder[]> {
  const rows = await queryRows(sql`
    select r.*, o.order_number, o.total_amount_cents, o.items
    from refund_requests r
    join orders o on o.id = r.order_id
    where r.decision = 'ESCALATED'
    order by r.created_at desc
    limit ${limit} offset ${offset}
  `);

  return rows.map((r) => ({
    id: String(r.id),
    customerId: String(r.customer_id),
    orderId: String(r.order_id),
    message: String(r.message),
    reason: r.reason as RefundReason,
    requestedAmountCents:
      r.requested_amount_cents === null ? null : Number(r.requested_amount_cents),
    approvedAmountCents: r.approved_amount_cents === null ? null : Number(r.approved_amount_cents),
    decision: r.decision as Decision,
    decisionReasons: (r.decision_reasons as PolicyRuleCode[]) ?? [],
    status: r.status as "SUBMITTED" | "DECIDED",
    injectionDetected: Boolean(r.injection_detected),
    policyId: (r.policy_id as string | null) ?? null,
    policyVersion: r.policy_version === null ? null : Number(r.policy_version),
    retrievedContext: (r.retrieved_context as RetrievedContext[]) ?? [],
    aiExtraction: (r.ai_extraction as Record<string, unknown> | null) ?? null,
    orderNumber: String(r.order_number),
    orderTotalCents: Number(r.total_amount_cents),
    items: (r.items as OrderItem[]) ?? [],
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  }));
}

/**
 * Apply a human decision to an escalated request.
 *
 * The order's refund_status is moved in the same transaction as the request
 * status, so an approval can never be recorded without the order reflecting it.
 */
export async function resolveEscalation(params: {
  requestId: string;
  resolve: "APPROVE" | "DENY";
  adminUserId: string;
  note: string | null;
}): Promise<{ approvedAmountCents: number | null }> {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, params.requestId))
      .limit(1);
    if (!request) throw notFound("refund request not found");
    // Resolving twice would be a double refund, so this is a conflict rather
    // than a server error: the caller's request was well-formed but lost a race.
    if (request.status === "DECIDED") {
      throw conflict("refund request is already resolved");
    }

    // An agent's approval must produce the same amount the engine would have
    // produced, or manual review would quietly diverge from policy. Damaged and
    // incorrect-item refunds are issued for the full value of the order line, so
    // the order total is the amount, not whatever the customer happened to ask
    // for. See seed/policies/refund-policy.md section 3.
    const [orderRow] = await tx
      .select({ totalAmountCents: orders.totalAmountCents })
      .from(orders)
      .where(eq(orders.id, request.orderId))
      .limit(1);
    const approved = params.resolve === "APPROVE" ? (orderRow?.totalAmountCents ?? null) : null;

    await tx
      .update(refundRequests)
      .set({
        status: "DECIDED",
        decision: params.resolve === "APPROVE" ? "APPROVED" : "DENIED",
        approvedAmountCents: approved,
        decisionReasons: [...(request.decisionReasons ?? []), `ADMIN_${params.resolve}`],
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, params.requestId));

    if (params.resolve === "APPROVE") {
      await tx
        .update(orders)
        .set({ refundStatus: "REFUNDED" })
        .where(eq(orders.id, request.orderId));
    }

    return { approvedAmountCents: approved };
  });
}

export interface RefundStats {
  total: number;
  byDecision: Array<{ decision: Decision; count: number }>;
  approvedAmountCents: number;
  degradedCount: number;
  injectionCount: number;
}

export async function summariseRefunds(): Promise<RefundStats> {
  const [row] = await db
    .select({
      total: count(),
      approvedAmountCents: sql<number>`coalesce(sum(approved_amount_cents), 0)`,
      degradedCount: sql<number>`coalesce(sum(case when ai_extraction->>'source' = 'fallback'
        then 1 else 0 end), 0)`,
      injectionCount: sql<number>`coalesce(sum(case when injection_detected then 1 else 0 end), 0)`,
    })
    .from(refundRequests);

  const byDecision = await queryRows<{ decision: Decision; count: number }>(sql`
    select decision, count(*)::int as count
    from refund_requests group by decision
  `);

  return {
    total: row?.total ?? 0,
    approvedAmountCents: Number(row?.approvedAmountCents ?? 0),
    degradedCount: Number(row?.degradedCount ?? 0),
    injectionCount: Number(row?.injectionCount ?? 0),
    byDecision: byDecision.map((r) => ({
      decision: r.decision,
      count: Number(r.count),
    })),
  };
}

/** Most recent requests across all customers, for the admin activity feed. */
export async function listRecentRequests(limit = 20): Promise<RefundRequestWithOrder[]> {
  const rows = await queryRows(sql`
    select r.*, o.order_number, o.total_amount_cents, o.items
    from refund_requests r
    join orders o on o.id = r.order_id
    order by r.created_at desc
    limit ${limit}
  `);
  return rows.map((r) => ({
    id: String(r.id),
    customerId: String(r.customer_id),
    orderId: String(r.order_id),
    message: String(r.message),
    reason: r.reason as RefundReason,
    requestedAmountCents:
      r.requested_amount_cents === null ? null : Number(r.requested_amount_cents),
    approvedAmountCents: r.approved_amount_cents === null ? null : Number(r.approved_amount_cents),
    decision: r.decision as Decision,
    decisionReasons: (r.decision_reasons as PolicyRuleCode[]) ?? [],
    status: r.status as "SUBMITTED" | "DECIDED",
    injectionDetected: Boolean(r.injection_detected),
    policyId: (r.policy_id as string | null) ?? null,
    policyVersion: r.policy_version === null ? null : Number(r.policy_version),
    retrievedContext: (r.retrieved_context as RetrievedContext[]) ?? [],
    aiExtraction: (r.ai_extraction as Record<string, unknown> | null) ?? null,
    orderNumber: String(r.order_number),
    orderTotalCents: Number(r.total_amount_cents),
    items: (r.items as OrderItem[]) ?? [],
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  }));
}
