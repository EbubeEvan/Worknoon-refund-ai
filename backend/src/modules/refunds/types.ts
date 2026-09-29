import type { ExtractionResult } from "../../ai/extraction.js";
import type { GeneratedResponse } from "../../ai/response.js";
import type { Decision, PolicyOutcome } from "../../domain/refund-policy.service.js";
import type { PolicyContext } from "../../rag/retrieval.js";

/**
 * Shared shapes for the refund flow.
 *
 * These exist so the service, repository, and controller agree on one
 * vocabulary for the AI's contribution to a decision, without any of them
 * needing to import the Gemini modules directly.
 */

/** What the model extracted, persisted alongside the decision. */
export type ExtractedRefundIntent = ExtractionResult;

/** A policy excerpt, snapshotted at decision time. */
export interface RetrievedContext {
  policyId: string;
  policyName: string;
  chunkIndex: number;
  content: string;
}

export interface RefundDecisionView {
  decision: Decision;
  rules: PolicyOutcome["rules"];
  requiresHumanReview: boolean;
  approvedAmountCents: number | null;
  summary: string;
}

export interface RefundEvaluation {
  outcome: PolicyOutcome;
  /** What the model proposed. Persisted for the audit trail, never authoritative. */
  extraction: ExtractedRefundIntent;
  policyContext: PolicyContext;
  response: GeneratedResponse;
  requestId: string | null;
  orderId: string | null;
}
