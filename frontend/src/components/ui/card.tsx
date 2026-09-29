import type { ReactNode } from "react";

import { cn } from "@/lib/cn.js";

export function Card({
  className,
  interactive = false,
  children,
}: Readonly<{
  className?: string;
  /** Lifts on hover. Only for cards that are actually clickable. */
  interactive?: boolean;
  children: ReactNode;
}>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-surface shadow-card",
        interactive &&
          "transition duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return (
    <div className={cn("border-t border-border/70 bg-surface-muted/50 px-6 py-3.5", className)}>
      {children}
    </div>
  );
}
