import { createRootRoute } from "@tanstack/react-router";

import { NotFound } from "@/components/not-found.js";
import { RootLayout } from "@/components/root-layout.js";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});
