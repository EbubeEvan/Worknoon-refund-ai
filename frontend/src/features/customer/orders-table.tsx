import { PackageIcon } from "@/components/icons.js";
import { Badge } from "@/components/ui/badge.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { SkeletonRows } from "@/components/ui/skeleton.js";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table.js";
import type { Order } from "@/lib/api.js";
import { shortDate, usd } from "@/lib/format.js";

/** Every order the customer has placed, and where each one stands. */
export function OrdersTable({
  orders,
  isLoading,
}: Readonly<{ orders: Order[]; isLoading: boolean }>) {
  return (
    <Card>
      <CardHeader
        icon={<PackageIcon size="size-[18px]" />}
        title="Your orders"
        description="Everything you've bought, and where each order stands."
      />
      {isLoading ? (
        <CardBody>
          <SkeletonRows rows={3} />
        </CardBody>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<PackageIcon size="size-5" />}
          title="No orders here yet"
          description="When you place an order, it will show up here."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Order</Th>
              <Th>Items</Th>
              <Th>Purchased</Th>
              <Th className="text-right">Total</Th>
              <Th>Status</Th>
              <Th>Refund</Th>
            </tr>
          </THead>
          <TBody>
            {orders.map((o) => (
              <Tr key={o.id}>
                <Td className="whitespace-nowrap">
                  <span className="font-mono text-[12px]">{o.orderNumber}</span>
                  {o.isFinalSale ? (
                    <Badge tone="warning" className="ml-2">
                      Final sale
                    </Badge>
                  ) : null}
                </Td>
                <Td className="text-muted">
                  {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                </Td>
                <Td className="whitespace-nowrap text-muted">{shortDate(o.purchasedAt)}</Td>
                <Td className="nums whitespace-nowrap text-right">{usd(o.totalAmountCents)}</Td>
                <Td>
                  <Badge
                    dot
                    tone={
                      o.status === "DELIVERED"
                        ? "success"
                        : o.status === "CANCELLED"
                          ? "danger"
                          : "info"
                    }
                  >
                    {o.status}
                  </Badge>
                </Td>
                <Td>
                  {o.refundStatus === "NONE" ? (
                    <span className="text-subtle">—</span>
                  ) : (
                    <Badge dot tone={o.refundStatus === "REFUNDED" ? "success" : "info"}>
                      {o.refundStatus}
                    </Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
