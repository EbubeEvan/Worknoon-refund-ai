import { createLogger } from "../lib/logger.js";
import { getEmbeddingModel } from "../ai/gemini.js";

const log = createLogger("embeddings");

/**
 * Embedding helpers.
 *
 * Kept as a thin, typed seam so the RAG pipeline never talks to LangChain
 * directly, and so swapping the provider is a one-file change.
 */

/** Embed a batch of chunks for storage. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const vectors = await getEmbeddingModel().embedDocuments(texts);
  return vectors.map(assertVector);
}

/** Embed a single search query (LangChain uses the RETRIEVAL_QUERY task type). */
export async function embedQuery(text: string): Promise<number[]> {
  const vector = await getEmbeddingModel().embedQuery(text);
  return assertVector(vector);
}

function assertVector(v: number[]): number[] {
  if (!Array.isArray(v) || v.length === 0) {
    throw new Error("Embedding model returned an empty vector");
  }
  return v;
}

/**
 * Render a vector as a pgvector literal, e.g. `[0.1,0.2,...]`.
 *
 * The values are all numeric and originate from the embedding model, not from
 * user input, so string interpolation here is safe. Any non-finite value would
 * produce invalid SQL, so it is filtered rather than trusted.
 */
export function toVectorLiteral(vector: number[]): string {
  const safe = vector.map((n) => (Number.isFinite(n) ? n : 0));
  return `[${safe.join(",")}]`;
}

/** Log-and-swallow wrapper used by non-critical paths such as the seed. */
export async function tryEmbedDocuments(texts: string[]): Promise<number[][] | null> {
  try {
    return await embedDocuments(texts);
  } catch (err) {
    log.warn(
      `embedding failed for ${texts.length} chunk(s); continuing without vectors`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
