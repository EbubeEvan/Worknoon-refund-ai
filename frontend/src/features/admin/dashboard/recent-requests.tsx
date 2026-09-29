import { useState } from "react";

import { HistoryIcon, InboxIcon } from "@/components/icons.js";
import { Badge, decisionTone } from "@/components/ui/badge.js";
import { Card, CardHeader } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PAGE_SIZE, Pagination } from "@/components/ui/pagination.js";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table.js";
import type { RefundRequest } from "@/lib/api.js";
import { dateTime, humanRule, usd } from "@/lib/format.js";

/** The latest requests across all customers, paginated client-side. */
export function RecentRequests({
  requests,
  totalEvents,
}: Readonly<{ requests: RefundRequest[]; totalEvents: number }>) {
  const [page, setPage] = useState(1);

  return (
    <Card>
      <CardHeader
        icon={<HistoryIcon size="size-[18px]" />}
        title="Recent requests"
        description={`${totalEvents} audit events recorded so far.`}
      />
      {requests.length === 0 ? (
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
              {requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap font-mono text-[12px]">{r.orderNumber}</Td>
                  <Td>
                    <Badge tone={decisionTone(r.decision)} dot>
                      {r.decision}
                    </Badge>
                  </Td>
                  <Td className="text-muted">{r.decisionReasons.map(humanRule).join(", ")}</Td>
                  <Td className="nums whitespace-nowrap text-right text-muted">
                    {usd(r.requestedAmountCents)}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{dateTime(r.createdAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} total={requests.length} onPage={setPage} />
        </>
      )}
    </Card>
  );
}
