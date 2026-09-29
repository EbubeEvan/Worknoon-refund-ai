import type { ReactNode } from "react";

import { AlertIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from "@/components/icons.js";
import { cn } from "@/lib/cn.js";

export function Alert({
  tone = "info",
  title,
  children,
}: Readonly<{
  tone?: "info" | "success" | "danger" | "warning";
  title?: string;
  children: ReactNode;
}>) {
  const tones = {
    info: {
      box: "border-info/25 bg-info-surface",
      icon: "text-info",
      Glyph: InfoIcon,
    },
    success: {
      box: "border-approved/25 bg-approved-surface",
      icon: "text-approved",
      Glyph: CheckCircleIcon,
    },
    danger: {
      box: "border-denied/25 bg-denied-surface",
      icon: "text-denied",
      Glyph: XCircleIcon,
    },
    warning: {
      box: "border-escalated/30 bg-escalated-surface",
      icon: "text-escalated",
      Glyph: AlertIcon,
    },
  } as const;

  const { box, icon, Glyph } = tones[tone];

  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3.5", box)}>
      <Glyph size="size-[18px]" className={cn("mt-px shrink-0", icon)} />
      <div className="min-w-0 text-[13px] leading-relaxed">
        {title ? <p className={cn("font-semibold", icon)}>{title}</p> : null}
        <div
          className={cn(title ? "mt-1" : undefined, tone === "info" ? "text-foreground/80" : icon)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
