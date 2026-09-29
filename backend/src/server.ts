import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { auth } from "./modules/auth/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { createLogger } from "./lib/logger.js";
import { runMigrations } from "./db/migrate.js";
import { ordersRouter } from "./modules/orders/routes.js";
import { customersRouter } from "./modules/customers/routes.js";
import { refundsRouter } from "./modules/refunds/routes.js";
import { policiesRouter } from "./modules/policies/routes.js";
import { adminRouter } from "./modules/admin/routes.js";

const log = createLogger("server");

const app = express();

// Behind nginx / compose, so rate limiting and secure cookies see the real client.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    // The SPA is served by a different origin (nginx :80) than the API (:4000).
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);

// Refund messages are small JSON bodies. File uploads use multer separately.
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "256kb" }));

/* -------------------------------------------------------------------------- */
/* Health                                                                      */
/* -------------------------------------------------------------------------- */

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "refund-ai-api",
    env: env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

// Better Auth handles its own CSRF and cookie handling.
// Express 5 uses path-to-regexp v8, which requires a *named* wildcard: `*splat`
// rather than the bare `*` that worked in Express 4.
app.all("/api/auth/{*splat}", toNodeHandler(auth));

/* -------------------------------------------------------------------------- */
/* Global rate limit                                                           */
/* -------------------------------------------------------------------------- */

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: { code: "RATE_LIMITED", message: "Too many requests, slow down" },
    },
  }),
);

/* -------------------------------------------------------------------------- */
/* Modules                                                                     */
/* -------------------------------------------------------------------------- */
// Each module owns its guard. `requireRole("ADMIN")` lives on the admin routers
// so a new admin endpoint is protected by default, not by remembering a check.

app.use("/api/orders", ordersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/refunds", refundsRouter);
app.use("/api/policies", policiesRouter);
app.use("/api/admin", adminRouter);

/* -------------------------------------------------------------------------- */

app.use(notFoundHandler);
app.use(errorHandler);

async function main(): Promise<void> {
  await runMigrations();

  if (env.SEED_ON_BOOT) {
    const { seedIfEmpty } = await import("./db/seed.js");
    await seedIfEmpty();
  }

  const server = app.listen(env.API_PORT, "0.0.0.0", () => {
    log.info(`API listening on http://0.0.0.0:${env.API_PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    log.info(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  log.error("fatal boot error", err);
  process.exit(1);
});

export { app };
