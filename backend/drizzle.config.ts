import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      // Host-side only. Inside compose the API reaches the DB at db:5432.
      "postgres://refund:refund_local_dev@localhost:5433/refund_ai",
  },
  verbose: true,
  strict: true,
});
