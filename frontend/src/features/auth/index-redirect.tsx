import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { FullPageSpinner } from "@/components/full-page-spinner.js";
import { useAuth } from "@/lib/auth.js";

/**
 * Send signed-in users to the surface their role grants them.
 *
 * Navigates from an effect rather than `throw redirect(...)` during render:
 * a redirect thrown from a component body is not reliably distinguished from a
 * render error, and lands in the error boundary instead of navigating.
 */
export function IndexRedirect() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    void router.navigate({ to: !user ? "/login" : isAdmin ? "/admin" : "/customer" });
  }, [isLoading, user, isAdmin, router]);

  return <FullPageSpinner />;
}
