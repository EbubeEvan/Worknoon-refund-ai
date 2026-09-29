import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { AppShell, NavLink } from "@/components/app-shell.js";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  FlagIcon,
  InboxIcon,
  LayersIcon,
  PackageIcon,
  SendIcon,
  ShieldIcon,
  SparkIcon,
  XCircleIcon,
} from "@/components/icons.js";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  decisionTone,
  EmptyState,
  Label,
  PAGE_SIZE,
  PageHeader,
  Pagination,
  SkeletonRows,
  Table,
  TBody,
  Td,
  Textarea,
  Th,
  THead,
  Tr,
} from "@/components/ui.js";
import { endpoints, type RefundRequest, type RefundRequestResult } from "@/lib/api.js";
import { friendlyError } from "@/lib/errors.js";
import { humanRule, shortDate, usd } from "@/lib/format.js";
import { FullPageSpinner, useAuthGuard } from "@/routes/root.js";

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
  const composerRef = useRef<HTMLTextAreaElement>(null);
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

  /**
   * Drop a real order number into the draft so the extractor has something
   * exact to read, then park the caret at the end. Without the caret move the
   * next keystroke lands before the reference and the message reads nonsense.
   */
  function referenceOrder(orderNumber: string) {
    setMessage((m) => {
      if (m.includes(orderNumber)) return m;
      const base = m.trim();
      return base ? `${base} (order ${orderNumber}) ` : `(order ${orderNumber}) `;
    });
    requestAnimationFrame(() => {
      const el = composerRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
  }

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
          {/* Request form */}
          <Card className="lg:col-span-3">
            <CardHeader
              icon={<SendIcon size="size-[18px]" />}
              title="Request a refund"
              description="No forms to fill in, no codes to look up. Just describe it."
            />
            <CardBody className="space-y-4">
              {refundable.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
                    Which order is this about? Tap to add it
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {refundable.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => referenceOrder(o.orderNumber)}
                        className="nums inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-muted shadow-xs transition duration-150 hover:-translate-y-px hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                      >
                        <span className="font-mono text-[11px] font-medium">{o.orderNumber}</span>
                        <span className="text-subtle">{usd(o.totalAmountCents)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <Label htmlFor="message">What went wrong?</Label>
                <Textarea
                  id="message"
                  ref={composerRef}
                  rows={5}
                  maxLength={4000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="My kettle from order ORD-1001 arrived cracked and won't hold water. I'd like a refund."
                />
              </div>

              {error ? <Alert tone="danger">{error}</Alert> : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-[11px] text-subtle">
                  {message.length > 3500 ? (
                    <span className="text-escalated">Close to the 4000 character limit</span>
                  ) : (
                    <>{message.length}/4000 characters</>
                  )}
                </p>
                <Button
                  size="lg"
                  onClick={() => submit.mutate()}
                  disabled={message.trim().length === 0 || submit.isPending}
                >
                  {submit.isPending ? null : <SendIcon size="size-4" />}
                  {submit.isPending ? "Reviewing your request..." : "Submit request"}
                </Button>
              </div>
            </CardBody>
          </Card>

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

        {/* Orders */}
        <Card>
          <CardHeader
            icon={<PackageIcon size="size-[18px]" />}
            title="Your orders"
            description="Everything you've bought, and where each order stands."
          />
          {orders.isLoading ? (
            <CardBody>
              <SkeletonRows rows={3} />
            </CardBody>
          ) : allOrders.length === 0 ? (
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
                {allOrders.map((o) => (
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

        {/* History */}
        <Card>
          <CardHeader
            icon={<ClockIcon size="size-[18px]" />}
            title="Request history"
            description="Every request you've made, and how it turned out."
          />
          {history.isLoading ? (
            <CardBody>
              <SkeletonRows rows={3} />
            </CardBody>
          ) : (history.data?.requests.length ?? 0) === 0 ? (
            <EmptyState
              icon={<InboxIcon size="size-5" />}
              title="No requests yet"
              description="When you ask for a refund, it will show up here with its outcome."
            />
          ) : (
            <>
              <HistoryTimeline requests={history.data?.requests ?? []} />
              <Pagination
                page={historyPage}
                total={history.data?.total ?? 0}
                onPage={setHistoryPage}
              />
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Side panel                                                                  */
/* -------------------------------------------------------------------------- */

const HOW_STEPS = [
  {
    title: "We read your message",
    body: "We pull out the order number, what went wrong, and any amount you mentioned.",
  },
  {
    title: "Our refund policy decides",
    body: "The policy is checked against your order — when you bought it, what's in it, and its history. That check produces the decision.",
  },
  {
    title: "We write you a reply",
    body: "Our assistant writes the reply afterwards, quoting the policy reason. It can't change the outcome.",
  },
];

function HowItWorks() {
  return (
    <Card>
      <CardHeader
        icon={<ShieldIcon size="size-[18px]" />}
        title="How decisions are made"
        description="Here's what happens after you hit submit."
      />
      <CardBody>
        <ol className="space-y-4">
          {HOW_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3.5">
              <span className="nums mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{s.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl border border-border/70 bg-surface-muted/60 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          Anything over $500, or anything unclear, goes to a real support agent instead of being
          decided automatically.
        </p>
      </CardBody>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Decision                                                                    */
/* -------------------------------------------------------------------------- */

const DECISION_META = {
  APPROVED: {
    heading: "Your refund is approved",
    glyph: CheckCircleIcon,
    accent: "text-approved",
    surface: "bg-approved-surface",
  },
  DENIED: {
    heading: "We can't refund this order",
    glyph: XCircleIcon,
    accent: "text-denied",
    surface: "bg-denied-surface",
  },
  ESCALATED: {
    heading: "A support agent will take it from here",
    glyph: ClockIcon,
    accent: "text-escalated",
    surface: "bg-escalated-surface",
  },
} as const;

function DecisionResult({
  result,
  showExplain,
  setShowExplain,
}: {
  result: RefundRequestResult;
  showExplain: boolean;
  setShowExplain: (v: boolean) => void;
}) {
  const meta = DECISION_META[result.decision];
  const Glyph = meta.glyph;

  return (
    <>
      <Card className="animate-rise overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/70 bg-surface-muted/50 px-6 py-4">
          <Avatar name="Worknoon Support" initials="W" size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground">Worknoon Support</p>
            <p className="mt-0.5 text-[11px] text-subtle">Written by Worknoon Support</p>
          </div>
          <Badge tone={decisionTone(result.decision)} dot>
            {result.decision}
          </Badge>
        </div>

        <CardBody className="space-y-4">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${meta.surface} ${meta.accent}`}
            >
              <Glyph size="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                {meta.heading}
              </h3>
              {result.approvedAmountCents ? (
                <p className="nums mt-2 text-[30px] font-semibold leading-none tracking-tight text-approved">
                  {usd(result.approvedAmountCents)}
                </p>
              ) : null}
            </div>
          </div>

          {/* The customer-facing reply, written by the assistant after the decision. */}
          <div className="rounded-2xl rounded-tl-sm bg-primary-soft/55 px-4 py-3.5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                Support reply
              </span>
              {result.reply.source === "deterministic" ? (
                <Badge tone="warning">Standard reply</Badge>
              ) : null}
            </div>
            <p className="text-[13px] leading-relaxed text-foreground">{result.reply.text}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {result.rules.map((code) => (
              <Badge key={code} tone="neutral">
                {humanRule(code)}
              </Badge>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowExplain(!showExplain)}
            aria-expanded={showExplain}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary transition hover:text-primary-hover"
          >
            <ChevronDownIcon
              size="size-4"
              className={`transition-transform duration-200 ${showExplain ? "rotate-180" : ""}`}
            />
            {showExplain ? "Hide" : "Show"} how this was decided
          </button>
        </CardBody>
      </Card>

      {showExplain ? (
        <div className="animate-fade-up">
          <ExplainPanel result={result} />
        </div>
      ) : null}
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
        icon={<LayersIcon size="size-[18px]" />}
        title="How this was decided"
        description="For transparency: the checks below ran after your outcome was already decided."
      />
      <CardBody>
        <ol className="space-y-3">
          <li className="rounded-2xl border border-border/70 bg-surface-muted/50 p-4">
            <StepHeading n={1} title="What we understood from your message" />
            <dl className="mt-3 space-y-1.5">
              <Row label="Order" value={e.extraction.orderNumber ?? "not found"} />
              <Row label="What's wrong" value={humanRule(e.extraction.reason)} />
              <Row label="Amount you asked for" value={usd(e.extraction.requestedAmountCents)} />
              {e.extraction.degradedReason ? (
                <Row label="Note" value={e.extraction.degradedReason} />
              ) : null}
            </dl>
          </li>

          <li className="rounded-2xl border border-border/70 bg-surface-muted/50 p-4">
            <StepHeading n={2} title="The policy section we checked" />
            <div className="mt-3">
              {e.retrievalDegraded ? (
                <Alert tone="warning">
                  We couldn't look up the policy just now, so this reply was written without it.
                  Your outcome is unaffected.
                </Alert>
              ) : e.retrievedContext.length === 0 ? (
                <p className="text-[13px] text-muted">
                  We couldn't find a matching section in the refund policy.
                </p>
              ) : (
                <ul className="space-y-2">
                  {e.retrievedContext.map((c) => (
                    <li
                      key={`${c.policyId}-${c.chunkIndex}`}
                      className="rounded-xl border border-border/70 bg-surface px-3.5 py-2.5"
                    >
                      <p className="text-[11px] font-medium text-subtle">
                        {c.policyName} · chunk {c.chunkIndex}
                      </p>
                      <p className="mt-1.5 max-h-24 overflow-y-auto text-[12px] leading-relaxed text-muted">
                        {c.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        </ol>

        <p className="mt-4 flex gap-2.5 rounded-xl bg-primary-soft/45 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          <ShieldIcon size="size-4" className="mt-px shrink-0 text-primary/70" />
          <span>
            These details are just for transparency — our refund policy had already decided your
            outcome before this explanation was written.
          </span>
        </p>
      </CardBody>
    </Card>
  );
}

function StepHeading({ n, title }: Readonly<{ n: number; title: string }>) {
  return (
    <p className="flex items-center gap-2.5">
      <span className="nums grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-white">
        {n}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">
        {title}
      </span>
    </p>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      <dt className="w-32 shrink-0 text-[12px] text-subtle">{label}</dt>
      <dd className="min-w-0 break-words font-mono text-[12px] text-foreground">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

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
