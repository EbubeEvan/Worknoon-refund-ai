import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { CHUNKING } from "../config/ai.js";
import { createLogger } from "../lib/logger.js";
import { embedDocuments } from "./embeddings.js";
import {
  deleteChunksForPolicy,
  getPolicyById,
  insertChunks,
} from "../modules/policies/repository.js";
import { newId } from "../lib/ids.js";

const log = createLogger("ingestion");

/**
 * Policy document ingestion.
 *
 * Application code owns the lifecycle, persistence and permissions. LangChain
 * owns one thing: splitting text into chunks. The uploaded binary is never
 * stored - `policies.content` holds the extracted text, which is also what makes
 * reindexing possible without the original file.
 */

export type SourceType = "pdf" | "markdown" | "text";

export const SUPPORTED_MIME: Record<string, SourceType> = {
  "application/pdf": "pdf",
  "text/markdown": "markdown",
  "text/x-markdown": "markdown",
  "text/plain": "text",
};

export const SUPPORTED_EXTENSIONS = [".pdf", ".md", ".markdown", ".txt"];

/**
 * Normalize extracted text so chunk boundaries and stored content are stable
 * regardless of how the source file encoded whitespace.
 */
export function normalizeText(raw: string): string {
  return (
    raw
      // Normalize line endings.
      .replace(/\r\n?/g, "\n")
      // Drop control characters except tab and newline.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      // Collapse runs of spaces/tabs.
      .replace(/[ \t]+/g, " ")
      // Trim trailing whitespace per line, then collapse 3+ blank lines.
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Extract plain text from an uploaded file buffer. */
export async function extractText(
  buffer: Buffer,
  sourceType: SourceType,
): Promise<string> {
  if (sourceType === "pdf") {
    // unpdf has no native dependencies and runs cleanly on Node 24.
    const { extractText: extractPdfText, getDocumentProxy } = await import("unpdf");
    const document = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(document, { mergePages: true });
    return normalizeText(Array.isArray(text) ? text.join("\n\n") : text);
  }

  return normalizeText(buffer.toString("utf8"));
}

/** Split normalized policy text into overlapping chunks. */
export async function chunkPolicyText(text: string): Promise<string[]> {
  const splitter = new MarkdownTextSplitter({
    chunkSize: CHUNKING.chunkSize,
    chunkOverlap: CHUNKING.chunkOverlap,
  });
  const docs = await splitter.createDocuments([text]);
  return docs
    .map((d) => d.pageContent.trim())
    .filter((c) => c.length > 0);
}

export interface IndexResult {
  chunkCount: number;
  embedded: boolean;
}

/**
 * (Re)index a policy: drop existing chunks, re-split, embed, insert.
 *
 * Reads `policies.content` from the database, never from disk - this is why
 * reindexing does not require the original upload.
 */
export async function indexPolicy(policyId: string): Promise<IndexResult> {
  const policy = await getPolicyById(policyId);
  if (!policy) throw new Error(`Policy ${policyId} not found`);

  await deleteChunksForPolicy(policyId);

  const chunks = await chunkPolicyText(policy.content);
  if (chunks.length === 0) {
    log.warn(`policy ${policyId} produced no chunks`);
    return { chunkCount: 0, embedded: false };
  }

  let vectors: number[][];
  try {
    vectors = await embedDocuments(chunks);
  } catch (err) {
    // Degraded mode: keep the policy usable, but retrieval will return nothing.
    // The deterministic engine still decides refunds, so the product works.
    log.error(
      `embedding failed for policy ${policyId}; policy stored without vectors`,
      err instanceof Error ? err.message : err,
    );
    return { chunkCount: chunks.length, embedded: false };
  }

  await insertChunks(
    chunks.map((content, chunkIndex) => ({
      id: newId("chunk"),
      policyId,
      chunkIndex,
      content,
      embedding: vectors[chunkIndex] ?? [],
      metadata: {
        sourceType: policy.sourceType,
        originalFilename: policy.originalFilename,
        policyName: policy.name,
        policyVersion: policy.version,
      },
    })),
  );

  return { chunkCount: chunks.length, embedded: true };
}
