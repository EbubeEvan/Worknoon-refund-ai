import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { XIcon } from "@/components/icons.js";
import { cn } from "@/lib/cn.js";

/**
 * Modal dialog, built on Radix.
 *
 * Radix owns the hard parts — focus trap, ESC to close, click-outside to
 * close, aria labelling, portal — while the visuals stay in this file's warm
 * language. Never use `confirm()` or `alert()`: they block the tab, ignore the
 * theme, and are invisible to screen readers.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}>) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border/80 bg-surface shadow-pop",
            "animate-dialog-in focus:outline-none",
            wide ? "max-w-lg" : "max-w-md",
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-[16px] font-semibold tracking-tight text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              <XIcon size="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="px-6 py-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
