import type { ReactNode } from "react";

import { cn } from "@/lib/cn.js";

import { type BadgeTone } from "./badge.js";
import { Card } from "./card.js";

export function Stat({
  label,
  value,
  hint,
  tone,
  icon,
}: Readonly<{
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}>) {
  const toneStyles: Partial<Record<BadgeTone, string>> = {
    success: "text-approved bg-approved-surface",
    danger: "text-denied bg-denied-surface",
    warning: "text-escalated bg-escalated-surface",
    info: "text-info bg-info-surface",
  };

  return (
    <Card className="group px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</p>
        {icon ? (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg transition duration-200",
              tone && toneStyles[tone] ? toneStyles[tone] : "bg-surface-muted text-subtle",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "nums mt-2 text-[26px] font-semibold leading-none tracking-tight",
          tone === "success" && "text-approved",
          tone === "danger" && "text-denied",
          tone === "warning" && "text-escalated",
          !tone && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[11px] leading-snug text-subtle">{hint}</p> : null}
    </Card>
  );
}
