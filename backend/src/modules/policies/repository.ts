import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db/client.js";
import { policies, policyChunks } from "../../db/schema/index.js";

export type PolicyRow = typeof policies.$inferSelect;
export type PolicyChunkRow = typeof policyChunks.$inferSelect;

/** All policies, newest first, with their chunk counts. */
export async function listPolicies() {
  const rows = await db
    .select({
      id: policies.id,
      name: policies.name,
      version: policies.version,
      status: policies.status,
      sourceType: policies.sourceType,
      originalFilename: policies.originalFilename,
      // `content` is deliberately excluded: it can be a large document and the
      // list view only needs metadata.
      createdAt: policies.createdAt,
      updatedAt: policies.updatedAt,
      chunkCount: sql<number>`(
        select count(*)::int from ${policyChunks}
        where ${policyChunks.policyId} = ${policies.id}
      )`,
    })
    .from(policies)
    .orderBy(desc(policies.createdAt));

  return rows;
}

export async function getPolicyById(id: string) {
  const [row] = await db.select().from(policies).where(eq(policies.id, id)).limit(1);
  return row ?? null;
}

export async function getPolicyChunks(policyId: string): Promise<PolicyChunkRow[]> {
  return db
    .select()
    .from(policyChunks)
    .where(eq(policyChunks.policyId, policyId))
    .orderBy(asc(policyChunks.chunkIndex));
}

export async function getActivePolicyIds(): Promise<string[]> {
  const rows = await db
    .select({ id: policies.id })
    .from(policies)
    .where(eq(policies.status, "ACTIVE"));
  return rows.map((r) => r.id);
}

export async function insertPolicy(input: {
  id: string;
  name: string;
  version: number;
  status: "ACTIVE" | "INACTIVE";
  sourceType: "pdf" | "markdown" | "text";
  originalFilename: string;
  content: string;
}) {
  const [row] = await db.insert(policies).values(input).returning();
  return row;
}

export async function updatePolicy(
  id: string,
  patch: Partial<Pick<PolicyRow, "name" | "version" | "status" | "content">>,
) {
  const [row] = await db
    .update(policies)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(policies.id, id))
    .returning();
  return row ?? null;
}

/** Chunks are removed by ON DELETE CASCADE too; this makes reindex explicit. */
export async function deleteChunksForPolicy(policyId: string): Promise<void> {
  await db.delete(policyChunks).where(eq(policyChunks.policyId, policyId));
}

export async function deletePolicy(id: string): Promise<boolean> {
  const rows = await db.delete(policies).where(eq(policies.id, id)).returning();
  return rows.length > 0;
}

export async function insertChunks(
  rows: Array<{
    id: string;
    policyId: string;
    chunkIndex: number;
    content: string;
    embedding: number[];
    metadata: Record<string, unknown>;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(policyChunks).values(rows);
}

export async function countChunks(policyId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(policyChunks)
    .where(eq(policyChunks.policyId, policyId));
  return row?.n ?? 0;
}

export async function policyExistsByNameAndVersion(name: string, version: number) {
  const [row] = await db
    .select({ id: policies.id })
    .from(policies)
    .where(and(eq(policies.name, name), eq(policies.version, version)))
    .limit(1);
  return row ?? null;
}
