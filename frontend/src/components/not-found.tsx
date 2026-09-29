import { Link } from "@tanstack/react-router";

import { InboxIcon } from "@/components/icons.js";

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-muted text-subtle ring-1 ring-border ring-inset">
        <InboxIcon size="size-5" />
      </span>
      <div>
        <p className="text-lg font-semibold tracking-tight">Page not found</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">That page does not exist.</p>
      </div>
      <Link to="/" className="text-[13px] font-medium text-primary hover:underline">
        Go back
      </Link>
    </main>
  );
}
