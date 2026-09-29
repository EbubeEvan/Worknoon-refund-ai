import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell, NavLink } from "@/components/app-shell.js";
import { FullPageSpinner } from "@/components/full-page-spinner.js";
import { SparkIcon } from "@/components/icons.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { PAGE_SIZE } from "@/components/ui/pagination.js";
import { useAuthGuard } from "@/features/auth/use-auth-guard.js";
import { DecisionResult } from "@/features/customer/decision-result.js";
import { HowItWorks } from "@/features/customer/how-it-works.js";
import { OrdersTable } from "@/features/customer/orders-table.js";
import { RefundComposer } from "@/features/customer/refund-composer.js";
import { RequestHistory } from "@/features/customer/request-history.js";
import { endpoints, type RefundRequestResult } from "@/lib/api.js";
import { friendlyError } from "@/lib/errors.js";

/**
 * Customer workspace: orders, the refund request form, and request history.
 *
 * The form is deliberately a free-text box rather than a reason dropdown. That
 * is the point of the system: the model reads messy natural language, and the
 * policy engine - not the model - decides the outcome. Everything below the
 * form exists to make that split visible to the person reading it.
 */
export function CustomerPage() {
  // Customer-only surface. Admins are redirected to /admin by the guard, so
  // the customer workspace never renders for the wrong role.
  const { isReady } = useAuthGuard({ requireCustomer: true });
  const queryClient = useQueryClient();
  const [historyPage, setHistoryPage] = useState(1);

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: endpoints.orders,
  });
  const history = useQuery({
    queryKey: ["refund-requests", historyPage],
    queryFn: () =>
      endpoints.refundRequests({
        limit: PAGE_SIZE,
        offset: (historyPage - 1) * PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const [message, setMessage] = useState("");
  const [result, setResult] = useState<RefundRequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExplain, setShowExplain] = useState(false);

  const submit = useMutation({
    mutationFn: () => endpoints.submitRefund(message.trim()),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setMessage("");
      setShowExplain(false);
      setHistoryPage(1);
      void queryClient.invalidateQueries({ queryKey: ["refund-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => {
      setResult(null);
      setError(friendlyError(err));
    },
  });

  const nav = (
    <NavLink to="/customer" active>
      My refunds
    </NavLink>
  );

  const allOrders = orders.data?.orders ?? [];
  const refundable = allOrders.filter((o) => o.refundStatus === "NONE" && o.status !== "CANCELLED");

  if (!isReady) return <FullPageSpinner />;

  return (
    <AppShell nav={nav}>
      <div className="space-y-8">
        <PageHeader
          icon={<SparkIcon size="size-5" />}
          title="How can we help?"
          description="Tell us what went wrong in your own words. We'll find the order, check it against our refund policy, and explain exactly why you got that outcome."
        />

        <div className="grid items-start gap-6 lg:grid-cols-5">
          <RefundComposer
            refundable={refundable}
            message={message}
            setMessage={setMessage}
            error={error}
            pending={submit.isPending}
            onSubmit={() => submit.mutate()}
          />

          {/* Decision result */}
          <div className="space-y-4 lg:col-span-2">
            {result ? (
              <DecisionResult
                result={result}
                showExplain={showExplain}
                setShowExplain={setShowExplain}
              />
            ) : (
              <HowItWorks />
            )}
          </div>
        </div>

        <OrdersTable orders={allOrders} isLoading={orders.isLoading} />

        <RequestHistory
          requests={history.data?.requests ?? []}
          total={history.data?.total ?? 0}
          isLoading={history.isLoading}
          page={historyPage}
          onPage={setHistoryPage}
        />
      </div>
    </AppShell>
  );
}
