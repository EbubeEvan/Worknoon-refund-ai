import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import type { SessionUser } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.js";

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
