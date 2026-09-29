import { createFileRoute } from "@tanstack/react-router";

import { AdminPoliciesPage } from "@/features/admin/policies/admin-policies-page.js";

export const Route = createFileRoute("/admin/policies")({
  component: AdminPoliciesPage,
});
