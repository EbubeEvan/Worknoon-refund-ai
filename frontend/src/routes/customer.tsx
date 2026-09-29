import { createFileRoute } from "@tanstack/react-router";

import { CustomerPage } from "@/features/customer/customer-page.js";

export const Route = createFileRoute("/customer")({
  component: CustomerPage,
});
