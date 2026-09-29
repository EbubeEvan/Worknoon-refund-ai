import { ClockIcon, FlagIcon, InboxIcon } from "@/components/icons.js";
import { Badge, decisionTone } from "@/components/ui/badge.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { Pagination } from "@/components/ui/pagination.js";
import { SkeletonRows } from "@/components/ui/skeleton.js";
import type { RefundRequest } from "@/lib/api.js";
import { humanRule, shortDate, usd } from "@/lib/format.js";

/** The customer's past requests, newest first, with their outcomes. */
export function RequestHistory({
  requests,
  total,
  isLoading,
  page,
  onPage,
}: Readonly<{
  requests: RefundRequest[];
  total: number;
  isLoading: boolean;
  page: number;
  onPage: (page: number) => void;
}>) {
  return (
    <Card>
      <CardHeader
        icon={<ClockIcon size="size-[18px]" />}
        title="Request history"
        description="Every request you've made, and how it turned out."
      />
      {isLoading ? (
        <CardBody>
          <SkeletonRows rows={3} />
        </CardBody>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size="size-5" />}
          title="No requests yet"
          description="When you ask for a refund, it will show up here with its outcome."
        />
      ) : (
        <>
          <HistoryTimeline requests={requests} />
          <Pagination page={page} total={total} onPage={onPage} />
        </>
      )}
    </Card>
  );
}

function HistoryTimeline({ requests }: { requests: RefundRequest[] }) {
  return (
    <ol className="relative px-6 py-5">
      {/* Rail behind the dots, trimmed so it stops at the last item. */}
      <span className="pointer-events-none absolute bottom-10 left-[27px] top-10 w-px bg-border" />
      {requests.map((r) => {
        const tone = decisionTone(r.decision);
        const dot = {
          success: "bg-approved",
          danger: "bg-denied",
          warning: "bg-escalated",
          info: "bg-info",
          neutral: "bg-subtle",
        }[tone];

        return (
          <li key={r.id} className="relative pb-6 pl-11 last:pb-0">
            <span
              className={`absolute left-[22px] top-[7px] size-2.5 rounded-full ${dot} ring-4 ring-surface`}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] font-medium text-foreground">
                    {r.orderNumber}
                  </span>
                  <Badge tone={tone} dot>
                    {r.decision}
                  </Badge>
                  {r.status === "SUBMITTED" ? (
                    <Badge tone="info">With our support team</Badge>
                  ) : null}
                  {r.injectionDetected ? (
                    <Badge tone="warning">
                      <FlagIcon size="size-3" />
                      Under review
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{r.message}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {r.decisionReasons.map((code) => (
                    <Badge key={code} tone="neutral">
                      {humanRule(code)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] text-subtle">{shortDate(r.createdAt)}</p>
                {r.approvedAmountCents ? (
                  <p className="nums mt-1 text-[13px] font-semibold text-approved">
                    {usd(r.approvedAmountCents)}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
