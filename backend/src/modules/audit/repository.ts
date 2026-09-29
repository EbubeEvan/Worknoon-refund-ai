import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { queryRows } from "../../db/execute.js";
import { auditLogs } from "../../db/schema/index.js";
import { newAuditId } from "../../lib/ids.js";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("audit");

/**
 * Append-only audit trail.
 *
 * There are no update or delete helpers here on purpose. The table is the
 * evidence that a refund decision was made under a specific policy version, so
 * the only write path is `recordAuditEvent`, and the only read paths are the
 * `list*` functions.
 */

export type ActorType = "USER" | "SYSTEM";

export interface AuditEvent {
  actorId?: string | null;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(event: AuditEvent): Promise<string> {
  const id = newAuditId();
  try {
    await db.insert(auditLogs).values({
      id,
      actorId: event.actorId ?? null,
      actorType: event.actorType,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      metadata: event.metadata ?? {},
    });
  } catch (err) {
    // The audit trail must not be able to break a refund request, but a silent
    // failure here is unacceptable, so it is surfaced loudly in the logs.
    log.error("failed to write audit event", { action: event.action, error: err });
  }
  return id;
}

export interface AuditRow {
  id: string;
  actorId: string | null;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export async function listAuditEvents(params: {
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: AuditRow[]; total: number }> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const filters = [
    params.entityType ? eq(auditLogs.entityType, params.entityType) : undefined,
    params.entityId ? eq(auditLogs.entityId, params.entityId) : undefined,
    params.action ? eq(auditLogs.action, params.action) : undefined,
  ].filter((f) => f !== undefined);

  const where = filters.length ? and(...filters) : undefined;

  const rows: AuditRow[] = (
    await db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
  ).map((r) => ({
    ...r,
    metadata: r.metadata ?? {},
  }));

  const [totalRow] = await db.select({ n: count() }).from(auditLogs).where(where);

  return { rows, total: totalRow?.n ?? 0 };
}

export interface AuditSummary {
  totalEvents: number;
  byAction: Array<{ action: string; count: number }>;
  byActorType: Array<{ actorType: ActorType; count: number }>;
}

/** Aggregate counters for the admin dashboard. */
export async function summariseAudit(): Promise<AuditSummary> {
  const byAction = await queryRows<{ action: string; count: number }>(sql`
    select action, count(*)::int as count
    from audit_logs group by action order by count desc
  `);
  const byActor = await queryRows<{ actor_type: ActorType; count: number }>(sql`
    select actor_type as actor_type, count(*)::int as count
    from audit_logs group by actor_type
  `);
  const [total] = await db.select({ n: count() }).from(auditLogs);

  return {
    totalEvents: total?.n ?? 0,
    byAction: byAction.map((r) => ({ action: r.action, count: Number(r.count) })),
    byActorType: byActor.map((r) => ({ actorType: r.actor_type, count: Number(r.count) })),
  };
}
