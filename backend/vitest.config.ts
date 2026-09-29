import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The policy engine is pure and needs no database or API key.
    globals: false,
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/ai/extraction.ts"],
      reporter: ["text", "html"],
    },
  },
});
