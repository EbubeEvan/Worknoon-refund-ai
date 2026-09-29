import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, NavLink } from "@/components/app-shell.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Spinner,
  Stat,
  decisionTone,
} from "@/components/ui.js";
import { ApiError, endpoints } from "@/lib/api.js";
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

  const resolve = useMutation({
    mutationFn: (v: { id: string; decision: "APPROVE" | "DENY" }) =>
      endpoints.resolveEscalation(v.id, v.decision, note[v.id] || undefined),
    onSuccess: () => {
      setNote({});
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  if (!isReady) return <FullPageSpinner />;

  const nav = (
    <>
      <NavLink to="/customer">My account</NavLink>
      <NavLink to="/admin" active>
        Dashboard
      </NavLink>
      <NavLink to="/admin/policies">Policies</NavLink>
      <NavLink to="/admin/audit">Audit</NavLink>
    </>
  );

  const d = dash.data;

  return (
    <AppShell nav={nav}>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Refund operations
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Every decision below was made by the policy engine. The agent queue handles what the
            engine deliberately refuses to decide.
          </p>
        </div>

        {dash.isLoading ? (
          <Card>
            <CardBody>
              <Spinner />
            </CardBody>
          </Card>
        ) : resolve.isError ? (
          <Alert tone="danger">
            {resolve.error instanceof ApiError
              ? resolve.error.message
              : "Could not resolve the escalation"}
          </Alert>
        ) : (
          d && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Requests" value={d.refunds.total} />
                <Stat
                  label="Approved"
                  value={d.refunds.byDecision.find((x) => x.decision === "APPROVED")?.count ?? 0}
                  tone="success"
                />
                <Stat
                  label="Denied"
                  value={d.refunds.byDecision.find((x) => x.decision === "DENIED")?.count ?? 0}
                  tone="danger"
                />
                <Stat
                  label="Escalated"
                  value={d.refunds.byDecision.find((x) => x.decision === "ESCALATED")?.count ?? 0}
                  tone="warning"
                />
                <Stat
                  label="Injection flags"
                  value={d.refunds.injectionCount}
                  hint="Messages routed to a human"
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
                  title="Escalation queue"
                  description="Requests the engine refused to decide alone."
                />
                {d.escalations.length === 0 ? (
                  <EmptyState
                    title="Queue is clear"
                    description="No requests are waiting on a human."
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {d.escalations.map((r) => (
                      <li key={r.id} className="space-y-3 px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] text-foreground">
                                {r.orderNumber}
                              </span>
                              <Badge tone={decisionTone(r.decision)}>{r.decision}</Badge>
                              {r.status === "SUBMITTED" ? (
                                <Badge tone="info">Open</Badge>
                              ) : (
                                <Badge tone="neutral">Resolved</Badge>
                              )}
                              {r.injectionDetected ? (
                                <Badge tone="warning">Injection flagged</Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted">{r.message}</p>
                            <p className="mt-1 text-[11px] text-subtle">
                              {r.decisionReasons.map(humanRule).join(" / ")}
                              {r.approvedAmountCents
                                ? ` · asked for ${usd(r.approvedAmountCents)}`
                                : ""}
                            </p>
                          </div>
                          <p className="shrink-0 text-[11px] text-subtle">
                            {shortDate(r.createdAt)}
                          </p>
                        </div>

                        {r.status === "SUBMITTED" ? (
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[200px] flex-1">
                              <Label htmlFor={`note-${r.id}`}>Agent note (optional)</Label>
                              <Input
                                id={`note-${r.id}`}
                                value={note[r.id] ?? ""}
                                onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                                placeholder="Decision rationale"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => resolve.mutate({ id: r.id, decision: "APPROVE" })}
                              disabled={resolve.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => resolve.mutate({ id: r.id, decision: "DENY" })}
                              disabled={resolve.isPending}
                            >
                              Deny
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <CardHeader title="Recent requests" />
                {d.recent.length === 0 ? (
                  <EmptyState title="No requests yet" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border text-[11px] uppercase tracking-wide text-subtle">
                        <tr>
                          <th className="px-5 py-2 font-medium">Order</th>
                          <th className="px-5 py-2 font-medium">Decision</th>
                          <th className="px-5 py-2 font-medium">Rules</th>
                          <th className="px-5 py-2 font-medium">Amount</th>
                          <th className="px-5 py-2 font-medium">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {d.recent.map((r) => (
                          <tr key={r.id}>
                            <td className="px-5 py-2.5 font-mono text-[11px] text-foreground">
                              {r.orderNumber}
                            </td>
                            <td className="px-5 py-2.5">
                              <Badge tone={decisionTone(r.decision)}>{r.decision}</Badge>
                            </td>
                            <td className="px-5 py-2.5 text-muted">
                              {r.decisionReasons.map(humanRule).join(", ")}
                            </td>
                            <td className="px-5 py-2.5 tabular-nums text-muted">
                              {usd(r.requestedAmountCents)}
                            </td>
                            <td className="px-5 py-2.5 text-muted">{dateTime(r.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )
        )}
      </div>
    </AppShell>
  );
}
