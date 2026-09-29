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
  Label,
  Spinner,
  Textarea,
  decisionTone,
} from "@/components/ui.js";
import { ApiError, endpoints, type RefundRequestResult } from "@/lib/api.js";
import { humanRule, shortDate, usd } from "@/lib/format.js";
import { FullPageSpinner, useAuthGuard } from "@/routes/root.js";

/**
 * Customer workspace: orders, the refund request form, and request history.
 *
 * The form is deliberately a free-text box rather than a reason dropdown. That
 * is the point of the system: the model reads messy natural language, and the
 * policy engine - not the model - decides the outcome.
 */
export function CustomerPage() {
  const { isAdmin, isReady } = useAuthGuard();
  const queryClient = useQueryClient();

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: endpoints.orders,
  });
  const history = useQuery({
    queryKey: ["refund-requests"],
    queryFn: endpoints.refundRequests,
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
      void queryClient.invalidateQueries({ queryKey: ["refund-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Could not submit the request");
    },
  });

  const nav = (
    <>
      <NavLink to="/customer" active>
        My refunds
      </NavLink>
      {isAdmin ? <NavLink to="/admin">Admin</NavLink> : null}
    </>
  );

  const refundable = (orders.data?.orders ?? []).filter(
    (o) => o.refundStatus === "NONE" && o.status !== "CANCELLED",
  );

  if (!isReady) return <FullPageSpinner />;

  return (
    <AppShell nav={nav}>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">My refunds</h1>
          <p className="mt-0.5 text-xs text-muted">
            Describe the problem in your own words. Your order number and the reason are read
            automatically.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Request form */}
          <Card className="lg:col-span-3">
            <CardHeader
              title="Request a refund"
              description="Mention your order number, for example ORD-1001."
            />
            <CardBody className="space-y-3">
              <div>
                <Label htmlFor="message">What went wrong?</Label>
                <Textarea
                  id="message"
                  rows={4}
                  maxLength={4000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="My kettle from order ORD-1001 arrived cracked and won't hold water. I'd like a refund."
                />
                <p className="mt-1 text-[11px] text-subtle">{message.length}/4000 characters</p>
              </div>

              {error ? <Alert tone="danger">{error}</Alert> : null}

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => submit.mutate()}
                  disabled={message.trim().length === 0 || submit.isPending}
                >
                  {submit.isPending ? <Spinner className="size-3.5" /> : null}
                  {submit.isPending ? "Checking policy..." : "Submit request"}
                </Button>
                {refundable.length > 0 ? (
                  <span className="text-[11px] text-subtle">
                    {refundable.length} order
                    {refundable.length === 1 ? "" : "s"} may be eligible
                  </span>
                ) : null}
              </div>
            </CardBody>
          </Card>

          {/* Decision result */}
          <div className="space-y-3 lg:col-span-2">
            {result ? (
              <DecisionResult
                result={result}
                showExplain={showExplain}
                setShowExplain={setShowExplain}
              />
            ) : null}

            {!result ? (
              <Card>
                <CardHeader title="How decisions are made" />
                <CardBody className="space-y-2 text-[11px] text-muted">
                  <p>
                    The assistant reads your message and pulls out the order number, reason, and any
                    amount you asked for.
                  </p>
                  <p>
                    A deterministic rule set then applies your order's real data - purchase date,
                    final-sale status, amount, refund history - and makes the decision. The
                    assistant only writes the explanation afterwards.
                  </p>
                  <p>
                    Requests over $500, suspicious messages, and anything ambiguous go to a human
                    agent.
                  </p>
                </CardBody>
              </Card>
            ) : null}
          </div>
        </div>

        {/* Orders */}
        <Card>
          <CardHeader
            title="Your orders"
            description="Seed data: each order is shaped to trigger a different policy outcome."
          />
          {orders.isLoading ? (
            <CardBody>
              <Spinner />
            </CardBody>
          ) : (orders.data?.orders.length ?? 0) === 0 ? (
            <EmptyState title="No orders yet" description="This account has no orders on file." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-[11px] uppercase tracking-wide text-subtle">
                  <tr>
                    <th className="px-5 py-2 font-medium">Order</th>
                    <th className="px-5 py-2 font-medium">Items</th>
                    <th className="px-5 py-2 font-medium">Purchased</th>
                    <th className="px-5 py-2 font-medium">Total</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 font-medium">Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.data?.orders.map((o) => (
                    <tr key={o.id} className="text-foreground">
                      <td className="px-5 py-2.5 font-mono text-[11px]">
                        {o.orderNumber}
                        {o.isFinalSale ? (
                          <Badge tone="warning" className="ml-1.5">
                            Final sale
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-5 py-2.5 text-muted">
                        {o.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                      </td>
                      <td className="px-5 py-2.5 text-muted">{shortDate(o.purchasedAt)}</td>
                      <td className="px-5 py-2.5 tabular-nums">{usd(o.totalAmountCents)}</td>
                      <td className="px-5 py-2.5">
                        <Badge
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
                      </td>
                      <td className="px-5 py-2.5">
                        {o.refundStatus === "NONE" ? (
                          <span className="text-subtle">-</span>
                        ) : (
                          <Badge tone={o.refundStatus === "REFUNDED" ? "success" : "info"}>
                            {o.refundStatus}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* History */}
        <Card>
          <CardHeader
            title="Request history"
            description="Every decision keeps the rule codes that produced it."
          />
          {history.isLoading ? (
            <CardBody>
              <Spinner />
            </CardBody>
          ) : (history.data?.requests.length ?? 0) === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Submit a refund request above and it will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {history.data?.requests.map((r) => (
                <li key={r.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-fg">{r.orderNumber}</span>
                        <Badge tone={decisionTone(r.decision)}>{r.decision}</Badge>
                        {r.status === "SUBMITTED" ? (
                          <Badge tone="info">Awaiting agent</Badge>
                        ) : null}
                        {r.injectionDetected ? <Badge tone="warning">Flagged</Badge> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">{r.message}</p>
                    </div>
                    <div className="text-right text-[11px] text-subtle">
                      <p>{shortDate(r.createdAt)}</p>
                      {r.approvedAmountCents ? (
                        <p className="font-medium text-approved">{usd(r.approvedAmountCents)}</p>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1.5 flex flex-wrap gap-1">
                    {r.decisionReasons.map((code) => (
                      <Badge key={code} tone="neutral">
                        {humanRule(code)}
                      </Badge>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */

function DecisionResult({
  result,
  showExplain,
  setShowExplain,
}: {
  result: RefundRequestResult;
  showExplain: boolean;
  setShowExplain: (v: boolean) => void;
}) {
  const tone =
    result.decision === "APPROVED"
      ? "success"
      : result.decision === "DENIED"
        ? "danger"
        : "warning";

  const heading =
    result.decision === "APPROVED"
      ? "Refund approved"
      : result.decision === "DENIED"
        ? "Refund declined"
        : "Sent to a support agent";

  return (
    <>
      <Card className="border-l-4" data-tone={tone}>
        <CardBody className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={decisionTone(result.decision)}>{result.decision}</Badge>
              {result.approvedAmountCents ? (
                <span className="text-sm font-semibold tabular-nums text-approved">
                  {usd(result.approvedAmountCents)}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-foreground">{heading}</h3>
          </div>

          {/* The customer-facing reply from the assistant. */}
          <div className="rounded-lg border border-border bg-background px-3.5 py-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
                Support reply
              </span>
              {result.reply.source === "deterministic" ? (
                <Badge tone="warning" className="text-[10px]">
                  Fallback
                </Badge>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed text-foreground">{result.reply.text}</p>
          </div>

          <div className="flex flex-wrap gap-1">
            {result.rules.map((code) => (
              <Badge key={code} tone="neutral">
                {humanRule(code)}
              </Badge>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowExplain(!showExplain)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            {showExplain ? "Hide" : "Show"} how this was decided
          </button>
        </CardBody>
      </Card>

      {showExplain ? <ExplainPanel result={result} /> : null}
    </>
  );
}

/**
 * Transparency panel. This is the part a reviewer should read: it shows the two
 * AI steps and, crucially, that neither of them can change the decision.
 */
function ExplainPanel({ result }: { result: RefundRequestResult }) {
  const e = result.explain;
  return (
    <Card>
      <CardHeader
        title="How this was decided"
        description="Both AI steps ran after the policy rules had already decided."
      />
      <CardBody className="space-y-3">
        <div className="rounded-lg border border-border bg-background px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
            1. What the assistant read from your message
          </p>
          <dl className="mt-2 space-y-1 text-[11px]">
            <Row label="Source" value={e.extraction.source} />
            <Row label="Order found" value={e.extraction.orderNumber ?? "none"} />
            <Row label="Reason" value={e.extraction.reason} />
            <Row label="Amount asked for" value={usd(e.extraction.requestedAmountCents)} />
            {e.extraction.degradedReason ? (
              <Row label="Degraded because" value={e.extraction.degradedReason} />
            ) : null}
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-background px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
            2. Policy text retrieved from the knowledge base
          </p>
          {e.retrievalDegraded ? (
            <Alert tone="warning">
              Retrieval was unavailable, so the reply was written without policy context.
            </Alert>
          ) : e.retrievedContext.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted">
              No policy excerpt passed the relevance threshold.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {e.retrievedContext.map((c) => (
                <li
                  key={`${c.policyId}-${c.chunkIndex}`}
                  className="rounded-md border border-border bg-surface px-2.5 py-2"
                >
                  <p className="text-[10px] font-medium text-subtle">
                    {c.policyName} &middot; chunk {c.chunkIndex}
                  </p>
                  <p className="mt-1 max-h-24 overflow-y-auto text-[11px] leading-relaxed text-muted">
                    {c.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-subtle">
          Neither of the two panels above can change the outcome. The rules engine ran on the
          order's stored data before the assistant was asked to write anything, and its rule codes
          are shown above.
        </p>
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-subtle">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}
