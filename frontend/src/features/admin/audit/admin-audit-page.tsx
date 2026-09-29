import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/app-shell.js";
import { FullPageSpinner } from "@/components/full-page-spinner.js";
import { InboxIcon, ShieldIcon } from "@/components/icons.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { PAGE_SIZE, Pagination } from "@/components/ui/pagination.js";
import { SkeletonRows } from "@/components/ui/skeleton.js";
import { AdminNav } from "@/features/admin/admin-nav.js";
import { AuditEventsTable } from "@/features/admin/audit/audit-events-table.js";
import { AuditActionInput, AuditQuickFilter } from "@/features/admin/audit/audit-filters.js";
import { useAuthGuard } from "@/features/auth/use-auth-guard.js";
import { endpoints } from "@/lib/api.js";

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

  return (
    <AppShell nav={<AdminNav active="audit" />}>
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
            action={<AuditActionInput action={action} onChange={updateAction} />}
          />

          <AuditQuickFilter action={action} onChange={updateAction} />

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
            <AuditEventsTable events={events.data?.events ?? []} />
          )}
          <Pagination page={page} total={events.data?.total ?? 0} onPage={setPage} />
        </Card>
      </div>
    </AppShell>
  );
}
