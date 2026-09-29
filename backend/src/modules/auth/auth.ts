import { admin } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import { accounts, sessions, users, verifications } from "../../db/schema/index.js";

/**
 * Better Auth owns authentication: password hashing, session cookies, CSRF
 * and the `users` / `sessions` / `accounts` / `verifications` tables.
 *
 * The `admin()` plugin supplies the `role` column used for RBAC. Its role
 * values are plain strings compared against `adminRoles`, so we use the same
 * vocabulary as the rest of the app: CUSTOMER / ADMIN.
 *
 * The adapter is name-driven - it only ever looks up these four models, so it
 * never touches the domain tables or the pgvector column.
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  database: drizzleAdapter(db, {
    provider: "pg",
    // Better Auth looks models up by singular key; our Drizzle table objects are
    // plural. This mapping is the entire "integration".
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  /**
   * The SPA is served by nginx on :5173 while the API runs on :4000, so every
   * browser request arrives with `Origin: http://localhost:5173`. Better Auth
   * defaults to trusting only `baseURL`, which would reject those as
   * "Invalid origin" and break login in the browser. CORS_ORIGIN is the single
   * source of truth for both the CORS middleware and this list.
   */
  trustedOrigins: env.CORS_ORIGIN.split(",").map((s) => s.trim()),

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  plugins: [
    admin({
      defaultRole: "CUSTOMER",
      adminRoles: ["ADMIN"],
    }),
  ],

  advanced: {
    // Must stay false for the plain-HTTP Docker demo; see env.COOKIE_SECURE.
    // Flip to true behind TLS.
    useSecureCookies: env.COOKIE_SECURE,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
