import { createFileRoute } from "@tanstack/react-router";

import { AdminAuditPage } from "@/features/admin/audit/admin-audit-page.js";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAuditPage,
});
