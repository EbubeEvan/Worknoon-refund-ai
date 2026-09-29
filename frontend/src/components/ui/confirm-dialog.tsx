import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { Button } from "./button.js";
import { Dialog } from "./dialog.js";
import { Spinner } from "./spinner.js";

/**
 * Confirmation for destructive or consequential actions: policy deletion,
 * escalation approve/deny. The preview slot shows what is about to happen
 * (amount, order, agent note) so the click is informed, not habitual.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  preview,
  confirmLabel,
  tone = "danger",
  pending = false,
  onConfirm,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  preview?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {preview ? (
        <div className="mb-4 rounded-xl border border-border/70 bg-surface-muted/50 px-4 py-3 text-[13px] leading-relaxed text-muted">
          {preview}
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogPrimitive.Close asChild>
          <Button variant="secondary" disabled={pending}>
            Cancel
          </Button>
        </DialogPrimitive.Close>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? <Spinner className="size-3.5" /> : null}
          {pending ? "Working..." : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
