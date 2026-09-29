import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import type { RefundRequest } from "@/lib/api.js";
import { humanRule, usd } from "@/lib/format.js";

export type ResolveDecision = "APPROVE" | "DENY";

export function ResolveConfirmDialog({
  request,
  decision,
  note,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: {
  request: RefundRequest | null;
  decision: ResolveDecision | null;
  note: string;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const approving = decision === "APPROVE";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={approving ? "Approve this refund?" : "Deny this refund?"}
      description={
        approving
          ? "This approves the refund and writes your decision to the audit trail."
          : "This denies the refund and writes your decision to the audit trail."
      }
      preview={
        request ? (
          <>
            <span className="font-medium text-foreground">{request.orderNumber}</span>
            {request.approvedAmountCents ? (
              <span className="nums"> · {usd(request.approvedAmountCents)}</span>
            ) : null}
            <br />
            <span>{request.decisionReasons.map(humanRule).join(" / ")}</span>
            {note.trim() ? (
              <>
                <br />
                <span className="mt-1 block border-t border-border/60 pt-1.5 italic">
                  “{note.trim()}”
                </span>
              </>
            ) : null}
          </>
        ) : null
      }
      confirmLabel={approving ? "Approve refund" : "Deny refund"}
      tone={approving ? "primary" : "danger"}
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}
