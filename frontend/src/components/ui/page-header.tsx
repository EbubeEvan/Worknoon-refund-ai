import type { ReactNode } from "react";

/**
 * Page title block. Every route used to repeat the same `h1` + `p` pair at four
 * different sizes; this is the single version of it.
 */
export function PageHeader({
  title,
  description,
  icon,
  action,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}>) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-primary to-accent text-white shadow-sm">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}
