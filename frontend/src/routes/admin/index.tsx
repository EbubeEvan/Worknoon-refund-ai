import { createFileRoute } from "@tanstack/react-router";

import { AdminDashboardPage } from "@/features/admin/dashboard/admin-dashboard-page.js";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});
