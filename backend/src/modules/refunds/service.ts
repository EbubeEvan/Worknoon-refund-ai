import { extractRefundIntent, toPolicyFacts } from "../../ai/extraction.js";
import { generateCustomerResponse } from "../../ai/response.js";
import {
  evaluateRefundPolicy,
  type PolicyOrderSnapshot,
  type RefundReason,
} from "../../domain/refund-policy.service.js";
import { createLogger } from "../../lib/logger.js";
import { buildRetrievalQuery, retrievePolicyContext } from "../../rag/retrieval.js";
import { recordAuditEvent } from "../audit/repository.js";
import { findOrderForCustomer, type OrderRecord } from "../orders/repository.js";
import { createRefundRequest, hasOpenRequestForOrder } from "./repository.js";
import type { ExtractedRefundIntent, RefundEvaluation, RetrievedContext } from "./types.js";

const log = createLogger("refund-service");

/**
 * The refund orchestration service.
 *
 * This is the single place the end-to-end flow is expressed, and the ordering
 * below is the security-critical part of the system:
 *
 *   1. Deterministic injection scan on the RAW message (before the LLM runs).
 *   2. LLM extraction, treated as an untrusted proposal.
 *   3. Order lookup scoped to the session's customer, never a client id.
 *   4. Deterministic policy evaluation. This is authoritative.
 *   5. RAG retrieval for explanation context only.
 *   6. LLM phrasing of the already-fixed decision, with a deterministic fallback.
 *   7. Persist the request plus an audit event.
 *
 * Steps 5 and 6 happen after step 4, so nothing the model or the vector store
 * returns can change the decision. The model is a parser and a writer; the
 * engine is the judge.
 */

export interface EvaluateRefundInput {
  /** Resolved from the session, never from the request body. */
  customerId: string;
  message: string;
  userId: string;
}

function toSnapshot(order: OrderRecord): PolicyOrderSnapshot {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    totalAmountCents: order.totalAmountCents,
    isFinalSale: order.isFinalSale,
    purchasedAt: order.purchasedAt,
    refundStatus: order.refundStatus,
    status: order.status,
  };
}

function toRetrievedContext(
  chunks: Array<{
    policyId: string;
    policyName: string;
    chunkIndex: number;
    content: string;
  }>,
): RetrievedContext[] {
  return chunks.map((c) => ({
    policyId: c.policyId,
    policyName: c.policyName,
    chunkIndex: c.chunkIndex,
    content: c.content,
  }));
}

/**
 * Evaluate a refund request end to end and persist the outcome.
 *
 * Never throws for a policy denial or an AI failure: a caller always receives a
 * decision. The only errors that propagate are genuine infrastructure faults
 * (the database is down), which the error middleware turns into a 500.
 */
export async function evaluateRefundRequest(input: EvaluateRefundInput): Promise<RefundEvaluation> {
  const { customerId, message, userId } = input;

  // (1) Deterministic scan of the raw message, before any model call.
  //     scanForInjection is idempotent and cheap; toPolicyFacts re-runs it and
  //     the engine reads that value, so the model's output cannot launder an
  //     injection away.
  const earlyScan = toPolicyFacts({
    extraction: {
      intent: "refund_request",
      orderNumber: null,
      reason: "other",
      requestedAmountCents: null,
      source: "fallback",
      degradedReason: null,
      raw: null,
    } as ExtractedRefundIntent,
    message,
    order: null,
    hasOpenRequest: false,
  }).injection;

  // (2) LLM extraction, treated as an untrusted proposal.
  const extraction = await extractRefundIntent(message);

  // (3) Resolve the order within the session's customer scope.
  let order: OrderRecord | null = null;
  if (extraction.orderNumber) {
    order = await findOrderForCustomer(extraction.orderNumber, customerId);
  }

  // (4) Authoritative deterministic evaluation.
  const hasOpenRequest = order ? await hasOpenRequestForOrder(order.id) : false;
  const facts = toPolicyFacts({
    extraction,
    message,
    order: order ? toSnapshot(order) : null,
    hasOpenRequest,
  });
  const outcome = evaluateRefundPolicy(facts);

  // (5) RAG context for the explanation. Best-effort; never affects step 4.
  const retrievalQuery = buildRetrievalQuery({
    reason: extraction.reason,
    orderIsFinalSale: order?.isFinalSale ?? false,
    orderTotalCents: order?.totalAmountCents ?? 0,
  });
  const policyContext = await retrievePolicyContext(retrievalQuery);

  // (6) LLM phrasing of the fixed decision, with a deterministic fallback.
  const response = await generateCustomerResponse({
    decision: outcome.decision,
    outcome,
    chunks: policyContext.chunks,
    message,
    orderNumber: order?.orderNumber ?? extraction.orderNumber,
  });

  // (7) Persist the request and write an audit event.
  let requestId: string | null = null;
  let finalOutcome = outcome;
  if (order) {
    const record = await createRefundRequest({
      customerId,
      orderId: order.id,
      message,
      reason: extraction.reason as RefundReason,
      requestedAmountCents: extraction.requestedAmountCents,
      approvedAmountCents: outcome.approvedAmountCents,
      decision: outcome.decision,
      decisionReasons: outcome.rules,
      status: outcome.requiresHumanReview ? "SUBMITTED" : "DECIDED",
      extraction,
      injectionDetected: earlyScan.detected,
      policyId: policyContext.policyVersions[0]?.policyId ?? null,
      policyVersion: policyContext.policyVersions[0]?.version ?? null,
      retrievedContext: toRetrievedContext(policyContext.chunks),
    });
    requestId = record.id;

    // A concurrent request may have consumed this order's refund eligibility
    // between the engine's read and the write. The stored decision is the one
    // that counts, so the audit trail records it.
    if (record.decision !== outcome.decision) {
      log.warn(
        `decision downgraded on write: ${outcome.decision} -> ${record.decision} ` +
          `rules=${record.decisionReasons.join("|")}`,
      );
      finalOutcome = {
        ...outcome,
        decision: record.decision,
        rules: record.decisionReasons,
        approvedAmountCents: null,
        requiresHumanReview: false,
        summary: "A refund has already been issued for this order.",
      };
    }
  }

  await recordAuditEvent({
    actorId: userId,
    actorType: "USER",
    action: `refund.${finalOutcome.decision.toLowerCase()}`,
    entityType: "refund_request",
    entityId: requestId,
    metadata: {
      orderNumber: order?.orderNumber ?? extraction.orderNumber,
      orderId: order?.id ?? null,
      rules: finalOutcome.rules,
      requiresHumanReview: finalOutcome.requiresHumanReview,
      approvedAmountCents: finalOutcome.approvedAmountCents,
      extractionSource: extraction.source,
      extractionDegradedReason: extraction.degradedReason,
      injectionDetected: earlyScan.detected,
      injectionCategories: earlyScan.categories,
      retrievalDegraded: policyContext.degraded,
      retrievedChunkCount: policyContext.chunks.length,
      policyVersion: policyContext.policyVersions[0]?.version ?? null,
      responseSource: response.source,
    },
  });

  log.info(
    `refund decision=${finalOutcome.decision} rules=${finalOutcome.rules.join("|")} ` +
      `order=${order?.orderNumber ?? "none"} requestId=${requestId ?? "none"}`,
  );

  return {
    outcome: finalOutcome,
    extraction,
    policyContext,
    response,
    requestId,
    orderId: order?.id ?? null,
  };
}
