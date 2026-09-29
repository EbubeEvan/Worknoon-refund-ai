import { createFileRoute } from "@tanstack/react-router";

import { IndexRedirect } from "@/features/auth/index-redirect.js";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});
