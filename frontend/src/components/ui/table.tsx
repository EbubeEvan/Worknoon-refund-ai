import type { ReactNode } from "react";

import { cn } from "@/lib/cn.js";

/**
 * Table primitives.
 *
 * The scroll container lives here so every data table gets the same horizontal
 * overflow behaviour on a narrow screen, and rows get the same hover state.
 */
export function Table({
  className,
  children,
}: Readonly<{ className?: string; children: ReactNode }>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: Readonly<{ children: ReactNode }>) {
  return <thead className="bg-surface-muted/60">{children}</thead>;
}

export function Th({
  className,
  children,
}: Readonly<{ className?: string; children?: ReactNode }>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-subtle",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: Readonly<{ children: ReactNode }>) {
  return <tbody className="divide-y divide-border/70">{children}</tbody>;
}

export function Tr({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return (
    <tr className={cn("transition-colors hover:bg-surface-muted/50", className)}>{children}</tr>
  );
}

export function Td({
  className,
  children,
}: Readonly<{ className?: string; children?: ReactNode }>) {
  return <td className={cn("px-5 py-3 align-middle text-foreground", className)}>{children}</td>;
}
