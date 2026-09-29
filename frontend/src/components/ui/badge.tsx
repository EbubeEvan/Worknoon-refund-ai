import type { ReactNode } from "react";

import { cn } from "@/lib/cn.js";

export type BadgeTone = "neutral" | "success" | "danger" | "warning" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted ring-1 ring-border/80 ring-inset",
  success: "bg-approved-surface text-approved ring-1 ring-approved/25 ring-inset",
  danger: "bg-denied-surface text-denied ring-1 ring-denied/25 ring-inset",
  warning: "bg-escalated-surface text-escalated ring-1 ring-escalated/25 ring-inset",
  info: "bg-info-surface text-info ring-1 ring-info/25 ring-inset",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: Readonly<{
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  /** A leading status dot. Reads faster in a dense list than colour alone. */
  dot?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/** Maps a refund decision to its colour. */
export function decisionTone(decision: string): BadgeTone {
  switch (decision) {
    case "APPROVED":
      return "success";
    case "DENIED":
      return "danger";
    case "ESCALATED":
      return "warning";
    default:
      return "neutral";
  }
}
