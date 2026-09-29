import { LayersIcon, ShieldIcon } from "@/components/icons.js";
import { Alert } from "@/components/ui/alert.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import type { RefundRequestResult } from "@/lib/api.js";
import { humanRule, usd } from "@/lib/format.js";

/**
 * Transparency panel. This is the part a reviewer should read: it shows the two
 * AI steps and, crucially, that neither of them can change the decision.
 */
export function ExplainPanel({ result }: { result: RefundRequestResult }) {
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
