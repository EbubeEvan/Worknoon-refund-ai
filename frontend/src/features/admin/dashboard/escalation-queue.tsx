import { FlagIcon, InboxIcon, UsersIcon } from "@/components/icons.js";
import { Badge, decisionTone } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { Card, CardHeader } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import type { ResolveDecision } from "@/features/admin/dashboard/resolve-confirm-dialog.js";
import type { RefundRequest } from "@/lib/api.js";
import { cn } from "@/lib/cn.js";
import { humanRule, shortDate, usd } from "@/lib/format.js";

/* -------------------------------------------------------------------------- */
/* Line selection. The server enforces the same rules; these only shape the UI. */
/* -------------------------------------------------------------------------- */

/** Policy §3.1: on a multi-item damage claim the agent must name the damaged line. */
function needsLinePick(r: RefundRequest): boolean {
  return r.decisionReasons.includes("DAMAGED_ITEM_NEEDS_REVIEW");
}

/** Every returnable line, or none when the agent has to choose (§3.1). */
export function defaultLines(r: RefundRequest): number[] {
  if (needsLinePick(r)) return [];
  return r.items.flatMap((item, i) => (item.finalSale ? [] : [i]));
}

/** What an approval of these lines pays, in cents. */
export function linesAmountCents(r: RefundRequest, lines: number[]): number {
  return lines.reduce((sum, i) => {
    const item = r.items[i];
    return item ? sum + item.unitAmountCents * item.quantity : sum;
  }, 0);
}

/** Requests the engine would not decide on its own, waiting for an agent. */
export function EscalationQueue({
  escalations,
  notes,
  onNoteChange,
  lines,
  onLinesChange,
  pending,
  onResolve,
}: Readonly<{
  escalations: RefundRequest[];
  notes: Record<string, string>;
  onNoteChange: (id: string, note: string) => void;
  lines: Record<string, number[]>;
  onLinesChange: (id: string, lines: number[]) => void;
  pending: boolean;
  onResolve: (id: string, decision: ResolveDecision) => void;
}>) {
  return (
    <Card>
      <CardHeader
        icon={<UsersIcon size="size-[18px]" />}
        title="Escalation queue"
        description="Requests that need a human decision."
      />
      {escalations.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size="size-5" />}
          title="Queue is clear"
          description="Nothing is waiting on a human right now."
        />
      ) : (
        <ul className="space-y-3 p-5">
          {escalations.map((r) => (
            <EscalationItem
              key={r.id}
              request={r}
              note={notes[r.id] ?? ""}
              onNoteChange={(value) => onNoteChange(r.id, value)}
              lines={lines[r.id] ?? defaultLines(r)}
              onLinesChange={(value) => onLinesChange(r.id, value)}
              pending={pending}
              onResolve={(decision) => onResolve(r.id, decision)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function EscalationItem({
  request: r,
  note,
  onNoteChange,
  lines,
  onLinesChange,
  pending,
  onResolve,
}: Readonly<{
  request: RefundRequest;
  note: string;
  onNoteChange: (note: string) => void;
  lines: number[];
  onLinesChange: (lines: number[]) => void;
  pending: boolean;
  onResolve: (decision: ResolveDecision) => void;
}>) {
  const isOpen = r.status === "SUBMITTED";
  const multiLine = r.items.length > 1;

  function toggleLine(i: number) {
    onLinesChange(
      lines.includes(i) ? lines.filter((x) => x !== i) : [...lines, i].sort((a, b) => a - b),
    );
  }

  return (
    <li
      className={cn(
        "rounded-2xl border p-4 transition duration-200",
        r.injectionDetected
          ? "border-escalated/40 bg-escalated-surface/45"
          : isOpen
            ? "border-info/30 bg-info-surface/35"
            : "border-border/70 bg-surface-muted/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface-muted text-subtle ring-1 ring-border/70 ring-inset">
            <UsersIcon size="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] font-medium text-foreground">
                {r.orderNumber}
              </span>
              <Badge tone={decisionTone(r.decision)} dot>
                {r.decision}
              </Badge>
              {isOpen ? <Badge tone="info">Open</Badge> : <Badge tone="neutral">Resolved</Badge>}
              {r.injectionDetected ? (
                <Badge tone="warning">
                  <FlagIcon size="size-3" />
                  Injection flagged
                </Badge>
              ) : null}
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{r.message}</p>
            <p className="mt-1.5 text-[12px] text-subtle">
              {r.decisionReasons.map(humanRule).join(" / ")}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-subtle">{shortDate(r.createdAt)}</p>
          {r.approvedAmountCents ? (
            <p className="nums mt-1 text-[13px] font-semibold text-foreground">
              {usd(r.approvedAmountCents)}
            </p>
          ) : null}
        </div>
      </div>

      {isOpen && multiLine ? (
        <fieldset className="mt-4 border-t border-border/60 pt-4">
          <legend className="text-[12px] font-medium text-foreground">
            {needsLinePick(r) ? "Which item arrived damaged?" : "Lines to refund"}
          </legend>
          <ul className="mt-2 space-y-1.5">
            {r.items.map((item, i) => (
              <li key={`${item.sku}-${i}`}>
                <label
                  className={cn(
                    "flex items-center gap-2.5 text-[13px]",
                    item.finalSale ? "text-subtle" : "cursor-pointer text-foreground",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={lines.includes(i)}
                    disabled={item.finalSale || pending}
                    onChange={() => toggleLine(i)}
                  />
                  <span className="min-w-0 flex-1">
                    {item.name}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    {item.finalSale ? " · final sale, not refundable" : ""}
                  </span>
                  <span className="nums text-muted">
                    {usd(item.unitAmountCents * item.quantity)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      {isOpen ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border/60 pt-4">
          <div className="min-w-[200px] flex-1">
            <Label htmlFor={`note-${r.id}`}>Note for the record (optional)</Label>
            <Input
              id={`note-${r.id}`}
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Why you decided this way"
            />
          </div>
          <Button
            size="md"
            onClick={() => onResolve("APPROVE")}
            disabled={pending || (multiLine && lines.length === 0)}
          >
            Approve
          </Button>
          <Button size="md" variant="danger" onClick={() => onResolve("DENY")} disabled={pending}>
            Deny
          </Button>
        </div>
      ) : null}
    </li>
  );
}
