import { cn } from "@/lib/cn.js";

import { Button } from "./button.js";

export const PAGE_SIZE = 10;

/**
 * Prev/next pager for server- or client-paginated lists.
 *
 * Renders nothing for a single page so short lists don't gain chrome they
 * don't need. Page state lives in the caller (URL or useState); this is
 * presentation plus bounds.
 */
export function Pagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  onPage,
  className,
}: Readonly<{
  /** 1-based current page. */
  page: number;
  /** Total item count across all pages. */
  total: number;
  pageSize?: number;
  onPage: (page: number) => void;
  className?: string;
}>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-surface-muted/40 px-6 py-3.5",
        className,
      )}
    >
      <p className="nums text-[12px] text-muted" aria-live="polite">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
