import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, NavLink } from "@/components/app-shell.js";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Spinner,
} from "@/components/ui.js";
import { endpoints } from "@/lib/api.js";
import { dateTime } from "@/lib/format.js";
import { FullPageSpinner, useAuthGuard } from "@/routes/root.js";

/**
 * Audit trail viewer.
 *
 * Append-only: the table has no update or delete path in the application, so
 * this view is the whole record of what happened and why.
 */
export function AdminAuditPage() {
  const { isReady } = useAuthGuard({ requireAdmin: true });
  const [action, setAction] = useState("");

  const events = useQuery({
    queryKey: ["audit", action],
    queryFn: () => endpoints.audit({ limit: 100, action: action || undefined }),
  });

  if (!isReady) return <FullPageSpinner />;

  const nav = (
    <>
      <NavLink to="/customer">My account</NavLink>
      <NavLink to="/admin">Dashboard</NavLink>
      <NavLink to="/admin/policies">Policies</NavLink>
      <NavLink to="/admin/audit" active>
        Audit
      </NavLink>
    </>
  );

  const actions = [
    "",
    "refund.approved",
    "refund.denied",
    "refund.escalated",
    "policy.uploaded",
    "policy.updated",
    "policy.deleted",
    "escalation.approve",
    "escalation.deny",
  ];

  return (
    <AppShell nav={nav}>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Audit trail</h1>
          <p className="mt-0.5 text-xs text-muted">
            Append-only record of every decision, including whether the AI step ran or fell back.
          </p>
        </div>

        <Card>
          <CardHeader
            title={`Events${events.data ? ` (${events.data.total} total)` : ""}`}
            action={
              <div className="w-52">
                <Label htmlFor="action">Filter by action</Label>
                <Input
                  id="action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  list="audit-actions"
                />
                <datalist id="audit-actions">
                  {actions.filter(Boolean).map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
            }
          />
          {events.isLoading ? (
            <CardBody>
              <Spinner />
            </CardBody>
          ) : (events.data?.events.length ?? 0) === 0 ? (
            <EmptyState title="No matching events" description="Try clearing the action filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-[11px] uppercase tracking-wide text-subtle">
                  <tr>
                    <th className="px-5 py-2 font-medium">When</th>
                    <th className="px-5 py-2 font-medium">Action</th>
                    <th className="px-5 py-2 font-medium">Actor</th>
                    <th className="px-5 py-2 font-medium">Entity</th>
                    <th className="px-5 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.data?.events.map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-2.5 text-muted">
                        {dateTime(e.createdAt)}
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge
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
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-muted">
                        {e.actorType}
                        {e.actorId ? (
                          <span className="ml-1 font-mono text-[10px] text-subtle">
                            {e.actorId.slice(0, 10)}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-muted">{e.entityType}</td>
                      <td className="px-5 py-2.5">
                        <MetadataTable metadata={e.metadata} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

/**
 * Renders audit metadata generically: scalar values as a key/value list, nested
 * arrays and objects as preformatted JSON. Keeps the table readable without
 * hard-coding every metadata shape the backend will ever emit.
 */
function MetadataTable({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata ?? {});
  if (entries.length === 0) {
    return <span className="text-subtle">-</span>;
  }

  return (
    <dl className="space-y-0.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-1.5">
          <dt className="shrink-0 text-subtle">{k}:</dt>
          <dd className="min-w-0 break-words font-mono text-[10px] text-muted">
            {v === null || v === undefined
              ? "-"
              : typeof v === "object"
                ? JSON.stringify(v)
                : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
