import type { Request, Response } from "express";
import { z } from "zod";
import { badMedia, badRequest, notFound } from "../../lib/errors.js";
import {
  deletePolicy,
  getPolicyById,
  getPolicyChunks,
  insertPolicy,
  listPolicies,
  updatePolicy,
} from "./repository.js";
import { extractText, indexPolicy } from "../../rag/ingestion.js";
import { recordAuditEvent } from "../audit/repository.js";
import { newPolicyId } from "../../lib/ids.js";

/**
 * Policy management controller (admin).
 *
 * Handles upload, indexing, activation, and deletion. The extracted text is
 * what gets stored; the uploaded binary is never persisted.
 */

const ALLOWED = new Map<string, "pdf" | "markdown" | "text">([
  ["application/pdf", "pdf"],
  ["text/markdown", "markdown"],
  ["text/plain", "text"],
  ["text/x-markdown", "markdown"],
]);

function sourceTypeFor(file: Express.Multer.File): "pdf" | "markdown" | "text" {
  const byMime = ALLOWED.get(file.mimetype);
  if (byMime) return byMime;
  const name = file.originalname.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  if (name.endsWith(".txt")) return "text";
  throw badMedia(`Unsupported file type: ${file.mimetype}`);
}

export async function listPoliciesHandler(_req: Request, res: Response): Promise<void> {
  res.json({ policies: await listPolicies() });
}

export async function getPolicyHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const policy = await getPolicyById(id);
  if (!policy) throw notFound("Policy not found");
  const chunks = await getPolicyChunks(id);
  res.json({ policy, chunkCount: chunks.length, chunks });
}

/**
 * POST /api/policies - upload a policy document and index it.
 * Accepts either a multipart file or a raw markdown/text body.
 */
export async function uploadPolicyHandler(req: Request, res: Response): Promise<void> {
  const file = (req.file as Express.Multer.File | undefined) ?? null;

  let name: string;
  let version: number;
  let sourceType: "pdf" | "markdown" | "text";
  let filename: string;
  let rawText: string;

  if (file) {
    sourceType = sourceTypeFor(file);
    filename = file.originalname;
    // The ingestion pipeline handles extraction + normalisation for all types.
    rawText = await extractText(file.buffer, sourceType);
    name = file.originalname.replace(/\.[^.]+$/, "");
    version = Number(req.body?.version ?? 1) || 1;
  } else if (typeof req.body?.content === "string" && req.body.content.length > 0) {
    rawText = req.body.content;
    sourceType = "markdown";
    filename = String(req.body?.originalFilename ?? "inline.md");
    name = String(req.body?.name ?? filename.replace(/\.[^.]+$/, ""));
    version = Number(req.body?.version ?? 1) || 1;
  } else {
    throw badRequest("Provide a policy file or a markdown content body");
  }

  if (rawText.trim().length === 0) {
    throw badRequest("Policy document is empty after text extraction");
  }

  const policy = await insertPolicy({
    id: newPolicyId(),
    name,
    version,
    status: "INACTIVE",
    sourceType,
    originalFilename: filename,
    content: rawText,
  });
  if (!policy) throw new Error("policy insert returned no row");

  const indexed = await indexPolicy(policy.id);

  await recordAuditEvent({
    actorId: req.principal?.userId ?? null,
    actorType: "USER",
    action: "policy.uploaded",
    entityType: "policy",
    entityId: policy.id,
    metadata: { name, version, sourceType, filename, chunkCount: indexed.chunkCount },
  });

  res.status(201).json({
    policy,
    chunkCount: indexed.chunkCount,
    embedded: indexed.embedded,
  });
}

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  name: z.string().min(1).max(200).optional(),
});

/** PATCH /api/policies/:id - activate/deactivate or rename. */
export async function updatePolicyHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid body");

  const existing = await getPolicyById(id);
  if (!existing) throw notFound("Policy not found");

  const updated = await updatePolicy(id, parsed.data);
  if (!updated) throw notFound("Policy not found");

  await recordAuditEvent({
    actorId: req.principal?.userId ?? null,
    actorType: "USER",
    action: "policy.updated",
    entityType: "policy",
    entityId: id,
    metadata: parsed.data,
  });

  res.json({ policy: updated });
}

/** DELETE /api/policies/:id - removes the policy and its chunks (CASCADE). */
export async function deletePolicyHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const deleted = await deletePolicy(id);
  if (!deleted) throw notFound("Policy not found");

  await recordAuditEvent({
    actorId: req.principal?.userId ?? null,
    actorType: "USER",
    action: "policy.deleted",
    entityType: "policy",
    entityId: id,
  });

  res.json({ ok: true });
}
