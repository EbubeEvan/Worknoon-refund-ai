import { type Dispatch, type SetStateAction, useRef } from "react";

import { SendIcon } from "@/components/icons.js";
import { Alert } from "@/components/ui/alert.js";
import { Button } from "@/components/ui/button.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { Label } from "@/components/ui/label.js";
import { Textarea } from "@/components/ui/textarea.js";
import type { Order } from "@/lib/api.js";
import { usd } from "@/lib/format.js";

/**
 * The free-text refund request form, with one-tap chips that drop a real order
 * number into the draft.
 */
export function RefundComposer({
  refundable,
  message,
  setMessage,
  error,
  pending,
  onSubmit,
}: Readonly<{
  refundable: Order[];
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  error: string | null;
  pending: boolean;
  onSubmit: () => void;
}>) {
  const composerRef = useRef<HTMLTextAreaElement>(null);

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

  return (
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
            onClick={() => onSubmit()}
            disabled={message.trim().length === 0 || pending}
          >
            {pending ? null : <SendIcon size="size-4" />}
            {pending ? "Reviewing your request..." : "Submit request"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
