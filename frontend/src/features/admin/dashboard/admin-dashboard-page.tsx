import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/app-shell.js";
import { FullPageSpinner } from "@/components/full-page-spinner.js";
import { ChartIcon } from "@/components/icons.js";
import { Alert } from "@/components/ui/alert.js";
import { Badge } from "@/components/ui/badge.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { SkeletonRows } from "@/components/ui/skeleton.js";
import { AdminNav } from "@/features/admin/admin-nav.js";
import { DashboardStats } from "@/features/admin/dashboard/dashboard-stats.js";
import {
  defaultLines,
  EscalationQueue,
  linesAmountCents,
} from "@/features/admin/dashboard/escalation-queue.js";
import { RecentRequests } from "@/features/admin/dashboard/recent-requests.js";
import {
  ResolveConfirmDialog,
  type ResolveDecision,
} from "@/features/admin/dashboard/resolve-confirm-dialog.js";
import { useAuthGuard } from "@/features/auth/use-auth-guard.js";
import { endpoints } from "@/lib/api.js";
import { friendlyError } from "@/lib/errors.js";

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
  const [lines, setLines] = useState<Record<string, number[]>>({});
  const [pendingResolve, setPendingResolve] = useState<{
    id: string;
    decision: ResolveDecision;
    /** Only sent for multi-item orders; the server defaults to every returnable line. */
    lines: number[] | undefined;
  } | null>(null);

  const resolve = useMutation({
    mutationFn: (v: { id: string; decision: ResolveDecision; lines: number[] | undefined }) =>
      endpoints.resolveEscalation(v.id, v.decision, note[v.id] || undefined, v.lines),
    onSuccess: () => {
      setNote({});
      setLines({});
      setPendingResolve(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  if (!isReady) return <FullPageSpinner />;

  const d = dash.data;
  const openCount = d?.escalations.filter((r) => r.status === "SUBMITTED").length ?? 0;
  const pendingRequest = d?.escalations.find((r) => r.id === pendingResolve?.id) ?? null;

  function requestResolve(id: string, decision: ResolveDecision) {
    const request = d?.escalations.find((r) => r.id === id);
    const multiLine = (request?.items.length ?? 0) > 1;
    const chosen = request ? (lines[id] ?? defaultLines(request)) : undefined;
    setPendingResolve({
      id,
      decision,
      lines: decision === "APPROVE" && multiLine ? chosen : undefined,
    });
  }

  return (
    <AppShell nav={<AdminNav active="dashboard" />}>
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
              <DashboardStats refunds={d.refunds} />

              <EscalationQueue
                escalations={d.escalations}
                notes={note}
                onNoteChange={(id, value) => setNote((n) => ({ ...n, [id]: value }))}
                lines={lines}
                onLinesChange={(id, value) => setLines((l) => ({ ...l, [id]: value }))}
                pending={resolve.isPending}
                onResolve={requestResolve}
              />

              <RecentRequests requests={d.recent} totalEvents={d.audit.totalEvents} />
            </>
          )
        )}
      </div>

      <ResolveConfirmDialog
        request={pendingRequest}
        decision={pendingResolve?.decision ?? null}
        amountCents={
          pendingRequest && pendingResolve?.decision === "APPROVE"
            ? linesAmountCents(pendingRequest, pendingResolve.lines ?? defaultLines(pendingRequest))
            : null
        }
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
