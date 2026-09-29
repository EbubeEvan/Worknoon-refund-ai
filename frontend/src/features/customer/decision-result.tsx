import { CheckCircleIcon, ChevronDownIcon, ClockIcon, XCircleIcon } from "@/components/icons.js";
import { Avatar } from "@/components/ui/avatar.js";
import { Badge, decisionTone } from "@/components/ui/badge.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { ExplainPanel } from "@/features/customer/explain-panel.js";
import type { RefundRequestResult } from "@/lib/api.js";
import { humanRule, usd } from "@/lib/format.js";

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

export function DecisionResult({
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
