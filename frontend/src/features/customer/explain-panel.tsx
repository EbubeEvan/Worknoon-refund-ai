import { LayersIcon, ShieldIcon } from "@/components/icons.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import type { RefundRequestResult } from "@/lib/api.js";
import { humanRule, usd } from "@/lib/format.js";

/**
 * Transparency panel. This is the part a reviewer should read: it shows what the
 * AI extracted and, crucially, that it cannot change the decision.
 */
export function ExplainPanel({ result }: { result: RefundRequestResult }) {
  const e = result.explain;

  return (
    <Card>
      <CardHeader
        icon={<LayersIcon size="size-[18px]" />}
        title="How this was decided"
        description="For transparency: what we read from your message. Your outcome was decided by our refund policy."
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
