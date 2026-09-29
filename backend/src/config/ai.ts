import { env } from "./env.js";

/**
 * Model configuration, kept in one place so the README, the code and the
 * migration width can never silently disagree.
 *
 * Both IDs are pinned dated snapshots rather than `-latest` aliases: an alias
 * can retarget under you, and a reviewer re-running this demo next month should
 * reproduce the same behaviour.
 */

/** Structured extraction + customer-facing explanations. */
export const CHAT_MODEL = env.CHAT_MODEL;

/** Policy embeddings for RAG. */
export const EMBED_MODEL = env.EMBED_MODEL;

/** Must match `policy_chunks.embedding` vector(N). Native output is 3072. */
export const EMBED_DIM = env.EMBED_DIM;

/**
 * Do NOT set `thinkingBudget: 0` on gemini-3.5-flash-lite.
 *
 * Verified against the live API: it returns HTTP 400 "Request contains an
 * invalid argument". The model is a thinking model and a zero budget is
 * rejected. Omitting `thinkingConfig` entirely uses the default and works.
 */
export const CHAT_LIMITS = {
  temperature: 0,
  maxOutputTokens: 2048,
} as const;

/** Retrieval tuning. Chunks are small, so a handful is plenty. */
export const RETRIEVAL = {
  topK: 4,
  /** Chunks scoring below this are dropped as noise. */
  minScore: 0.25,
} as const;

export const CHUNKING = {
  chunkSize: 900,
  chunkOverlap: 120,
} as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_MB = 5;
