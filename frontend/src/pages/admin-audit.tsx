import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell, NavLink } from "@/components/app-shell.js";
import { ChevronDownIcon, InboxIcon, ShieldIcon } from "@/components/icons.js";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  PAGE_SIZE,
  PageHeader,
  Pagination,
  SkeletonRows,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui.js";
import { endpoints } from "@/lib/api.js";
import { cn } from "@/lib/cn.js";
import { dateTime } from "@/lib/format.js";
import { FullPageSpinner, useAuthGuard } from "@/routes/root.js";

const ACTIONS = [
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

/**
 * Audit trail viewer.
 *
 * Append-only: the table has no update or delete path in the application, so
 * this view is the whole record of what happened and why.
 */
export function AdminAuditPage() {
  const { isReady } = useAuthGuard({ requireAdmin: true });
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const events = useQuery({
    queryKey: ["audit", action, page],
    queryFn: () =>
      endpoints.audit({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        action: action || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  /** Changing the filter restarts at page one; the old page may not exist. */
  function updateAction(next: string) {
    setAction(next);
    setPage(1);
  }

  if (!isReady) return <FullPageSpinner />;

  const nav = (
    <>
      <NavLink to="/admin">Dashboard</NavLink>
      <NavLink to="/admin/policies">Policies</NavLink>
      <NavLink to="/admin/audit" active>
        Audit
      </NavLink>
    </>
  );

  return (
    <AppShell nav={nav}>
      <div className="space-y-8">
        <PageHeader
          icon={<ShieldIcon size="size-5" />}
          title="Audit trail"
          description="A permanent record of every decision. Entries can't be edited or deleted — including whether the assistant ran or fell back."
        />

        <Card>
          <CardHeader
            title={`Events${events.data ? ` · ${events.data.total} total` : ""}`}
            description="Filter by action to trace one event type end to end."
            action={
              <div className="w-full sm:w-64">
                <Label htmlFor="action">Filter by action</Label>
                <Input
                  id="action"
                  value={action}
                  onChange={(e) => updateAction(e.target.value)}
                  list="audit-actions"
                  placeholder="All actions"
                />
                <datalist id="audit-actions">
                  {ACTIONS.filter(Boolean).map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
            }
          />

          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-surface-muted/40 px-6 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-subtle">
              Quick filter
            </span>
            {ACTIONS.filter(Boolean).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => updateAction(a === action ? "" : a)}
                aria-pressed={a === action}
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[11px] transition duration-150",
                  a === action
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-muted text-muted ring-1 ring-border/80 ring-inset hover:text-foreground",
                )}
              >
                {a}
              </button>
            ))}
            {action ? (
              <Button variant="ghost" size="sm" onClick={() => updateAction("")}>
                Clear
              </Button>
            ) : null}
          </div>

          {events.isLoading ? (
            <CardBody>
              <SkeletonRows rows={5} />
            </CardBody>
          ) : (events.data?.events.length ?? 0) === 0 ? (
            <EmptyState
              icon={<InboxIcon size="size-5" />}
              title="No matching events"
              description="Try clearing the action filter."
            />
          ) : (
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
                {events.data?.events.map((e) => (
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
          )}
          <Pagination page={page} total={events.data?.total ?? 0} onPage={setPage} />
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
    return <span className="text-subtle">—</span>;
  }

  return (
    <dl className="space-y-0.5">
      {entries.map(([k, v]) => {
        const isComplex = typeof v === "object" && v !== null;
        const serialised =
          v === null || v === undefined ? "-" : isComplex ? JSON.stringify(v) : String(v);

        return (
          <div key={k} className="flex gap-1.5">
            <dt className="shrink-0 text-[12px] text-subtle">{k}:</dt>
            <dd className="min-w-0">
              {isComplex ? (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1 font-mono text-[10px] text-muted transition hover:text-foreground">
                    <ChevronDownIcon
                      size="size-3"
                      className="transition-transform duration-200 group-open:rotate-180"
                    />
                    {serialised}
                  </summary>
                  <pre className="mt-1 max-w-sm overflow-x-auto rounded-lg bg-surface-muted px-2.5 py-2 font-mono text-[10px] leading-relaxed text-muted">
                    {serialised}
                  </pre>
                </details>
              ) : (
                <span className="font-mono text-[10px] break-words text-muted">{serialised}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
