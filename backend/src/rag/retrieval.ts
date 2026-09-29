import { and, cosineDistance, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { policyChunks, policies } from "../db/schema/index.js";
import { RETRIEVAL } from "../config/ai.js";
import { createLogger } from "../lib/logger.js";
import { embedQuery } from "./embeddings.js";
import { getActivePolicyIds } from "../modules/policies/repository.js";

const log = createLogger("retrieval");

/**
 * Policy retrieval over pgvector.
 *
 * Scope note: this module retrieves *policy knowledge only*. Customer and order
 * state is never fetched through RAG - that always comes from PostgreSQL via
 * the orders repository. Keeping the two paths separate is what stops an
 * embedding from ever influencing an authorization decision.
 */

export interface RetrievedChunk {
  policyId: string;
  policyName: string;
  policyVersion: number;
  chunkIndex: number;
  content: string;
  /** Cosine similarity in [0, 1]; 1 is identical direction. */
  score: number;
}

export interface PolicyContext {
  chunks: RetrievedChunk[];
  /** Distinct policies that contributed, for the audit trail. */
  policyVersions: Array<{ policyId: string; policyName: string; version: number }>;
  /** True when retrieval was skipped, so callers can label the audit row. */
  degraded: boolean;
}

const EMPTY: PolicyContext = { chunks: [], policyVersions: [], degraded: false };

/**
 * Build the natural-language query used for retrieval.
 *
 * Deliberately derived from the *reason* and policy vocabulary rather than the
 * raw customer message: attacker-controlled text should not become the vector
 * search query.
 */
export function buildRetrievalQuery(params: {
  reason: string;
  orderIsFinalSale: boolean;
  orderTotalCents: number;
}): string {
  const parts = [
    `refund policy for reason: ${params.reason}`,
    params.orderIsFinalSale ? "order contains final sale items" : "no final sale items",
    `refund amount eligibility and manual review threshold`,
  ];
  return parts.join(". ");
}

/**
 * Retrieve the most relevant active policy chunks.
 *
 * Returns an empty result (never throws) if the embedding call fails, so a
 * Gemini outage degrades the explanation rather than blocking a refund
 * decision that the deterministic engine can make unaided.
 */
export async function retrievePolicyContext(query: string): Promise<PolicyContext> {
  const activeIds = await getActivePolicyIds();
  if (activeIds.length === 0) {
    log.warn("no active policies; retrieval returning empty");
    return EMPTY;
  }

  let vector: number[];
  try {
    vector = await embedQuery(query);
  } catch (err) {
    log.warn(
      "query embedding failed; retrieval degraded to empty",
      err instanceof Error ? err.message : err,
    );
    return { ...EMPTY, degraded: true };
  }

  try {
    const rows = await db
      .select({
        policyId: policies.id,
        policyName: policies.name,
        policyVersion: policies.version,
        chunkIndex: policyChunks.chunkIndex,
        content: policyChunks.content,
        distance: cosineDistance(policyChunks.embedding, vector),
      })
      .from(policyChunks)
      .innerJoin(policies, eq(policyChunks.policyId, policies.id))
      .where(and(eq(policies.status, "ACTIVE"), inArray(policyChunks.policyId, activeIds)))
      .orderBy(cosineDistance(policyChunks.embedding, vector))
      .limit(RETRIEVAL.topK);

    const chunks = rows
      .map((r) => ({ ...r, score: Number((1 - Number(r.distance)).toFixed(4)) }))
      // Drop weak matches rather than feeding noise into the prompt.
      .filter((r) => r.score >= RETRIEVAL.minScore);

    const seen = new Map<string, PolicyContext["policyVersions"][number]>();
    for (const c of chunks) {
      if (!seen.has(c.policyId)) {
        seen.set(c.policyId, {
          policyId: c.policyId,
          policyName: c.policyName,
          version: c.policyVersion,
        });
      }
    }

    return { chunks, policyVersions: [...seen.values()], degraded: false };
  } catch (err) {
    log.error("vector search failed; retrieval degraded to empty", err);
    return { ...EMPTY, degraded: true };
  }
}
