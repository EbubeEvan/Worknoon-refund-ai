import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: Readonly<{
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}>) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? (
        <span className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-subtle">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
