import {
  CheckCircleIcon,
  ClockIcon,
  HistoryIcon,
  ShieldIcon,
  XCircleIcon,
} from "@/components/icons.js";
import { Alert } from "@/components/ui/alert.js";
import { Stat } from "@/components/ui/stat.js";
import type { DashboardData } from "@/lib/api.js";

/** Decision counters, plus a warning when requests fell back to the degraded path. */
export function DashboardStats({ refunds }: Readonly<{ refunds: DashboardData["refunds"] }>) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Requests" value={refunds.total} icon={<HistoryIcon size="size-4" />} />
        <Stat
          label="Approved"
          value={refunds.byDecision.find((x) => x.decision === "APPROVED")?.count ?? 0}
          tone="success"
          icon={<CheckCircleIcon size="size-4" />}
        />
        <Stat
          label="Denied"
          value={refunds.byDecision.find((x) => x.decision === "DENIED")?.count ?? 0}
          tone="danger"
          icon={<XCircleIcon size="size-4" />}
        />
        <Stat
          label="Escalated"
          value={refunds.byDecision.find((x) => x.decision === "ESCALATED")?.count ?? 0}
          tone="warning"
          icon={<ClockIcon size="size-4" />}
        />
        <Stat
          label="Injection flags"
          value={refunds.injectionCount}
          hint="Messages routed to a human"
          icon={<ShieldIcon size="size-4" />}
        />
      </div>

      {refunds.degradedCount > 0 ? (
        <Alert
          tone="warning"
          title={`${refunds.degradedCount} request(s) used the extraction fallback`}
        >
          The model call failed or returned unusable output for these requests. They still received
          a deterministic decision, but the reason defaulted to &quot;other&quot;, so they were sent
          to an agent instead of being auto-approved (policy §3.4).
        </Alert>
      ) : null}
    </>
  );
}
