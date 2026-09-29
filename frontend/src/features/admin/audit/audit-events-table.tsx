import { Badge } from "@/components/ui/badge.js";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table.js";
import { MetadataTable } from "@/features/admin/audit/metadata-table.js";
import type { AuditEvent } from "@/lib/api.js";
import { dateTime } from "@/lib/format.js";

/** One row per audit event, with its metadata rendered generically. */
export function AuditEventsTable({ events }: Readonly<{ events: AuditEvent[] }>) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>When</Th>
          <Th>Action</Th>
          <Th>Actor</Th>
          <Th>Entity</Th>
          <Th>Detail</Th>
        </tr>
      </THead>
      <TBody>
        {events.map((e) => (
          <Tr key={e.id} className="align-top">
            <Td className="whitespace-nowrap text-muted">{dateTime(e.createdAt)}</Td>
            <Td>
              <Badge
                dot
                tone={
                  e.action.includes("approved")
                    ? "success"
                    : e.action.includes("denied") || e.action.includes("deleted")
                      ? "danger"
                      : e.action.includes("escalated")
                        ? "warning"
                        : "neutral"
                }
              >
                {e.action}
              </Badge>
            </Td>
            <Td className="whitespace-nowrap text-muted">
              {e.actorType}
              {e.actorId ? (
                <span className="ml-1.5 font-mono text-[10px] text-subtle">
                  {e.actorId.slice(0, 10)}
                </span>
              ) : null}
            </Td>
            <Td className="whitespace-nowrap text-muted">{e.entityType}</Td>
            <Td>
              <MetadataTable metadata={e.metadata} />
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
