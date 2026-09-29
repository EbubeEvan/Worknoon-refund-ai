import { createRootRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { InboxIcon } from "@/components/icons.js";
import { Spinner } from "@/components/ui.js";
import type { SessionUser } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.js";

/**
 * Root route: layout, 404, and the shared auth guard.
 */

export const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}

function NotFound() {
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

/**
 * Gate a branch of the tree on authentication and role.
 *
 * UX only. Every protected endpoint authorizes server-side, so bypassing this
 * in the browser reveals nothing a signed-in user could not already fetch.
 *
 * Returns state rather than JSX so pages can call their data hooks
 * unconditionally: a hook that sometimes returns an element and sometimes an
 * object would force every caller to re-narrow the result.
 */
export interface AuthGuardState {
  user: SessionUser | null;
  isAdmin: boolean;
  /** False while the session is loading, or while a redirect is in flight. */
  isReady: boolean;
}

export function useAuthGuard(
  opts: { requireAdmin?: boolean; requireCustomer?: boolean } = {},
): AuthGuardState {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  const needsRedirect =
    !isLoading && (!user || (opts.requireAdmin && !isAdmin) || (opts.requireCustomer && isAdmin));

  useEffect(() => {
    if (!needsRedirect) return;
    void router.navigate({
      to: !user ? "/login" : opts.requireCustomer && isAdmin ? "/admin" : "/customer",
    });
  }, [needsRedirect, user, isAdmin, opts.requireCustomer, router]);

  // While a redirect is pending `needsRedirect` is already true, so this stays
  // false and the page keeps showing a spinner until the new route renders.
  const isReady = !isLoading && !needsRedirect && Boolean(user);

  return { user, isAdmin, isReady };
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted">
      <Spinner className="size-6" />
    </div>
  );
}
