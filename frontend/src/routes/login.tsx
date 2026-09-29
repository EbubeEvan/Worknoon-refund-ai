import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "@/features/auth/login-page.js";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
