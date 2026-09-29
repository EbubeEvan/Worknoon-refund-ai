import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell, NavLink } from "@/components/app-shell.js";
import {
  ChartIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  HistoryIcon,
  InboxIcon,
  ShieldIcon,
  UsersIcon,
  XCircleIcon,
} from "@/components/icons.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  decisionTone,
  EmptyState,
  Input,
  Label,
  PAGE_SIZE,
  PageHeader,
  Pagination,
  SkeletonRows,
  Stat,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui.js";
import { endpoints, type RefundRequest } from "@/lib/api.js";
import { cn } from "@/lib/cn.js";
import { friendlyError } from "@/lib/errors.js";
import { dateTime, humanRule, shortDate, usd } from "@/lib/format.js";
import { FullPageSpinner, useAuthGuard } from "@/routes/root.js";

/**
 * Admin dashboard: decision counters, the escalation queue, and recent activity.
 *
 * The escalation queue is the human half of the design. Anything the engine
 * would not decide on its own lands here for an agent, and the agent's own
 * decision is written back to the audit trail.
 */
export function AdminDashboardPage() {
  const { isReady } = useAuthGuard({ requireAdmin: true });
  const queryClient = useQueryClient();

  const dash = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: endpoints.dashboard,
    refetchInterval: 15_000,
  });

  const [note, setNote] = useState<Record<string, string>>({});
  const [recentPage, setRecentPage] = useState(1);
  const [pendingResolve, setPendingResolve] = useState<{
    id: string;
    decision: "APPROVE" | "DENY";
  } | null>(null);

  const resolve = useMutation({
    mutationFn: (v: { id: string; decision: "APPROVE" | "DENY" }) =>
      endpoints.resolveEscalation(v.id, v.decision, note[v.id] || undefined),
    onSuccess: () => {
      setNote({});
      setPendingResolve(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  if (!isReady) return <FullPageSpinner />;

  const nav = (
    <>
      <NavLink to="/admin" active>
        Dashboard
      </NavLink>
      <NavLink to="/admin/policies">Policies</NavLink>
      <NavLink to="/admin/audit">Audit</NavLink>
    </>
  );

  const d = dash.data;
  const openCount = d?.escalations.filter((r) => r.status === "SUBMITTED").length ?? 0;

  return (
    <AppShell nav={nav}>
      <div className="space-y-8">
        <PageHeader
          icon={<ChartIcon size="size-5" />}
          title="Refund operations"
          description="Every count below comes from the policy engine. The queue holds what the engine won't decide on its own."
          action={
            openCount > 0 ? (
              <Badge tone="warning" dot>
                {openCount} waiting on an agent
              </Badge>
            ) : (
              <Badge tone="success" dot>
                Queue is clear
              </Badge>
            )
          }
        />

        {dash.isLoading ? (
          <Card>
            <CardBody>
              <SkeletonRows rows={4} />
            </CardBody>
          </Card>
        ) : resolve.isError ? (
          <Alert tone="danger">{friendlyError(resolve.error, "admin")}</Alert>
        ) : (
          d && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat
                  label="Requests"
                  value={d.refunds.total}
                  icon={<HistoryIcon size="size-4" />}
                />
                <Stat
                  label="Approved"
                  value={d.refunds.byDecision.find((x) => x.decision === "APPROVED")?.count ?? 0}
                  tone="success"
                  icon={<CheckCircleIcon size="size-4" />}
                />
                <Stat
                  label="Denied"
                  value={d.refunds.byDecision.find((x) => x.decision === "DENIED")?.count ?? 0}
                  tone="danger"
                  icon={<XCircleIcon size="size-4" />}
                />
                <Stat
                  label="Escalated"
                  value={d.refunds.byDecision.find((x) => x.decision === "ESCALATED")?.count ?? 0}
                  tone="warning"
                  icon={<ClockIcon size="size-4" />}
                />
                <Stat
                  label="Injection flags"
                  value={d.refunds.injectionCount}
                  hint="Messages routed to a human"
                  icon={<ShieldIcon size="size-4" />}
                />
              </div>

              {d.refunds.degradedCount > 0 ? (
                <Alert
                  tone="warning"
                  title={`${d.refunds.degradedCount} request(s) used the extraction fallback`}
                >
                  The model call failed or returned unusable output for these requests. They still
                  received a deterministic decision, but the reason defaulted to &quot;other&quot;,
                  so they were not auto-approved.
                </Alert>
              ) : null}

              <Card>
                <CardHeader
                  icon={<UsersIcon size="size-[18px]" />}
                  title="Escalation queue"
                  description="Requests that need a human decision."
                />
                {d.escalations.length === 0 ? (
                  <EmptyState
                    icon={<InboxIcon size="size-5" />}
                    title="Queue is clear"
                    description="Nothing is waiting on a human right now."
                  />
                ) : (
                  <ul className="space-y-3 p-5">
                    {d.escalations.map((r) => {
                      const isOpen = r.status === "SUBMITTED";
                      return (
                        <li
                          key={r.id}
                          className={cn(
                            "rounded-2xl border p-4 transition duration-200",
                            r.injectionDetected
                              ? "border-escalated/40 bg-escalated-surface/45"
                              : isOpen
                                ? "border-info/30 bg-info-surface/35"
                                : "border-border/70 bg-surface-muted/40",
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 gap-3">
                              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface-muted text-subtle ring-1 ring-border/70 ring-inset">
                                <UsersIcon size="size-3.5" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[12px] font-medium text-foreground">
                                    {r.orderNumber}
                                  </span>
                                  <Badge tone={decisionTone(r.decision)} dot>
                                    {r.decision}
                                  </Badge>
                                  {isOpen ? (
                                    <Badge tone="info">Open</Badge>
                                  ) : (
                                    <Badge tone="neutral">Resolved</Badge>
                                  )}
                                  {r.injectionDetected ? (
                                    <Badge tone="warning">
                                      <FlagIcon size="size-3" />
                                      Injection flagged
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                                  {r.message}
                                </p>
                                <p className="mt-1.5 text-[12px] text-subtle">
                                  {r.decisionReasons.map(humanRule).join(" / ")}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[11px] text-subtle">{shortDate(r.createdAt)}</p>
                              {r.approvedAmountCents ? (
                                <p className="nums mt-1 text-[13px] font-semibold text-foreground">
                                  {usd(r.approvedAmountCents)}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {isOpen ? (
                            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border/60 pt-4">
                              <div className="min-w-[200px] flex-1">
                                <Label htmlFor={`note-${r.id}`}>
                                  Note for the record (optional)
                                </Label>
                                <Input
                                  id={`note-${r.id}`}
                                  value={note[r.id] ?? ""}
                                  onChange={(e) =>
                                    setNote((n) => ({ ...n, [r.id]: e.target.value }))
                                  }
                                  placeholder="Why you decided this way"
                                />
                              </div>
                              <Button
                                size="md"
                                onClick={() => setPendingResolve({ id: r.id, decision: "APPROVE" })}
                                disabled={resolve.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                size="md"
                                variant="danger"
                                onClick={() => setPendingResolve({ id: r.id, decision: "DENY" })}
                                disabled={resolve.isPending}
                              >
                                Deny
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <Card>
                <CardHeader
                  icon={<HistoryIcon size="size-[18px]" />}
                  title="Recent requests"
                  description={`${d.audit.totalEvents} audit events recorded so far.`}
                />
                {d.recent.length === 0 ? (
                  <EmptyState icon={<InboxIcon size="size-5" />} title="No requests yet" />
                ) : (
                  <>
                    <Table>
                      <THead>
                        <tr>
                          <Th>Order</Th>
                          <Th>Decision</Th>
                          <Th>Rules</Th>
                          <Th className="text-right">Asked for</Th>
                          <Th>When</Th>
                        </tr>
                      </THead>
                      <TBody>
                        {d.recent
                          .slice((recentPage - 1) * PAGE_SIZE, recentPage * PAGE_SIZE)
                          .map((r) => (
                            <Tr key={r.id}>
                              <Td className="whitespace-nowrap font-mono text-[12px]">
                                {r.orderNumber}
                              </Td>
                              <Td>
                                <Badge tone={decisionTone(r.decision)} dot>
                                  {r.decision}
                                </Badge>
                              </Td>
                              <Td className="text-muted">
                                {r.decisionReasons.map(humanRule).join(", ")}
                              </Td>
                              <Td className="nums whitespace-nowrap text-right text-muted">
                                {usd(r.requestedAmountCents)}
                              </Td>
                              <Td className="whitespace-nowrap text-muted">
                                {dateTime(r.createdAt)}
                              </Td>
                            </Tr>
                          ))}
                      </TBody>
                    </Table>
                    <Pagination page={recentPage} total={d.recent.length} onPage={setRecentPage} />
                  </>
                )}
              </Card>
            </>
          )
        )}
      </div>

      <ResolveConfirmDialog
        request={d?.escalations.find((r) => r.id === pendingResolve?.id) ?? null}
        decision={pendingResolve?.decision ?? null}
        note={pendingResolve ? (note[pendingResolve.id] ?? "") : ""}
        open={pendingResolve !== null}
        pending={resolve.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingResolve(null);
        }}
        onConfirm={() => {
          if (pendingResolve) resolve.mutate(pendingResolve);
        }}
      />
    </AppShell>
  );
}

function ResolveConfirmDialog({
  request,
  decision,
  note,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: {
  request: RefundRequest | null;
  decision: "APPROVE" | "DENY" | null;
  note: string;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const approving = decision === "APPROVE";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={approving ? "Approve this refund?" : "Deny this refund?"}
      description={
        approving
          ? "This approves the refund and writes your decision to the audit trail."
          : "This denies the refund and writes your decision to the audit trail."
      }
      preview={
        request ? (
          <>
            <span className="font-medium text-foreground">{request.orderNumber}</span>
            {request.approvedAmountCents ? (
              <span className="nums"> · {usd(request.approvedAmountCents)}</span>
            ) : null}
            <br />
            <span>{request.decisionReasons.map(humanRule).join(" / ")}</span>
            {note.trim() ? (
              <>
                <br />
                <span className="mt-1 block border-t border-border/60 pt-1.5 italic">
                  “{note.trim()}”
                </span>
              </>
            ) : null}
          </>
        ) : null
      }
      confirmLabel={approving ? "Approve refund" : "Deny refund"}
      tone={approving ? "primary" : "danger"}
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}
