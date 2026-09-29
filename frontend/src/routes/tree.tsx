import { createRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { rootRoute, FullPageSpinner } from "./root.js";
import { useAuth } from "@/lib/auth.js";
import { LoginPage } from "@/pages/login.js";
import { CustomerPage } from "@/pages/customer.js";
import { AdminDashboardPage } from "@/pages/admin-dashboard.js";
import { AdminPoliciesPage } from "@/pages/admin-policies.js";
import { AdminAuditPage } from "@/pages/admin-audit.js";

/**
 * Route definitions, written by hand.
 *
 * No file-based routing plugin, so `docker compose up` has no codegen step and
 * no generated route tree that can drift from the source.
 */

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRedirect,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const customerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer",
  component: CustomerPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminDashboardPage,
});

const adminPoliciesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/policies",
  component: AdminPoliciesPage,
});

const adminAuditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/audit",
  component: AdminAuditPage,
});

/**
 * Send signed-in users to the surface their role grants them.
 *
 * Navigates from an effect rather than `throw redirect(...)` during render:
 * a redirect thrown from a component body is not reliably distinguished from a
 * render error, and lands in the error boundary instead of navigating.
 */
function IndexRedirect() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    void router.navigate({ to: !user ? "/login" : isAdmin ? "/admin" : "/customer" });
  }, [isLoading, user, isAdmin, router]);

  return <FullPageSpinner />;
}

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  customerRoute,
  adminRoute,
  adminPoliciesRoute,
  adminAuditRoute,
]);
