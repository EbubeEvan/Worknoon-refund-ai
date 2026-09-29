import { cn } from "@/lib/cn.js";

/**
 * Loading placeholder.
 *
 * A spinner tells the user something is happening; a skeleton tells them what is
 * about to arrive, and stops the layout jumping when data lands. Used wherever
 * a list or table loads, in preference to a centred spinner.
 */
export function Skeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-[length:220%_100%] bg-linear-to-r from-surface-muted via-surface-sunken to-surface-muted",
        className,
      )}
    />
  );
}

export function SkeletonRows({
  rows = 4,
  className,
}: Readonly<{ rows?: number; className?: string }>) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
