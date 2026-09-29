import { cn } from "@/lib/cn.js";

export function Spinner({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current",
        className,
      )}
      aria-label="Loading"
    />
  );
}
