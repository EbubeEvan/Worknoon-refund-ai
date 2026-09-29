import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

/**
 * Load the repo-root `.env` when running outside Docker.
 *
 * Inside Docker the variables already arrive from `env_file` in
 * docker-compose.yml, so `loadEnvFile` must not clobber them - hence the
 * "only fill gaps" guard.
 */
function loadRootEnv(): void {
  if (process.env.GEMINI_API_KEY && process.env.BETTER_AUTH_SECRET) return;
  for (const candidate of [
    resolve(process.cwd(), "../.env.local"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../.env"),
    resolve(process.cwd(), ".env"),
  ]) {
    if (!existsSync(candidate)) continue;
    try {
      // Node >= 21 builtin. `.env` values never override real environment vars.
      process.loadEnvFile(candidate);
      return;
    } catch {
      // A malformed or unreadable file should not crash boot; validation below
      // will produce a precise error if a required value is genuinely missing.
    }
  }
}

loadRootEnv();

/**
 * Build a connection string from the discrete POSTGRES_* parts.
 *
 * Compose does not interpolate variables out of `.env.local`, so the api
 * service is given `POSTGRES_HOST=db` / `POSTGRES_PORT=5432` and assembles the
 * URL here. Local development uses the published port instead. Either way the
 * credentials only ever exist in one place.
 */
function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = process.env.POSTGRES_USER ?? "refund";
  const pass = process.env.POSTGRES_PASSWORD ?? "refund_local_dev";
  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? "5433";
  const name = process.env.POSTGRES_DB ?? "refund_ai";
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}`;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (postgres://user:pass@host:5432/db)"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  CHAT_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  EMBED_MODEL: z.string().min(1).default("gemini-embedding-2"),
  EMBED_DIM: z.coerce.number().int().positive().default(1536),

  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET must be at least 16 chars"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  /**
   * Marks session cookies `Secure`, which means browsers only send them over
   * HTTPS. The Docker demo is served over plain HTTP, so this defaults to false
   * - otherwise login appears to succeed and every later request is silently
   * unauthenticated. Set to true when deploying behind TLS.
   */
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /** Seed demo customers/orders/policy on boot when the database is empty. */
  SEED_ON_BOOT: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

process.env.DATABASE_URL ??= buildDatabaseUrl();

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  console.error("Copy .env.example to .env and fill in the values.\n");
  process.exit(1);
}

export const env = parsed.data;

/** The vector width baked into policy_chunks.embedding. Changing it needs a migration. */
export const EMBED_DIM = env.EMBED_DIM;
