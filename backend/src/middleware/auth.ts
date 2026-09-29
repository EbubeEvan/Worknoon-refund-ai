import type { NextFunction, Request, Response } from "express";
import { forbidden, unauthenticated } from "../lib/errors.js";
import { auth } from "../modules/auth/auth.js";
import { db } from "../db/client.js";
import { customers } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

/**
 * The authenticated principal, derived exclusively from the session cookie.
 *
 * Note there is no `customerId` field the client can influence: it is looked up
 * from the session user on every request. Trusting a client-supplied customer id
 * is the single easiest way to build an IDOR, so it is never read from a body,
 * a query string, or a header.
 */
export interface Principal {
  userId: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
  customerId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

/** Resolve the session -> principal, including the customerId link. */
export async function resolvePrincipal(req: Request): Promise<Principal | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return null;

  const role = (session.user.role as Principal["role"]) ?? "CUSTOMER";

  // The customer row is the only place orders are anchored to an identity.
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    role: role === "ADMIN" ? "ADMIN" : "CUSTOMER",
    customerId: customer?.id ?? null,
  };
}

/** Requires a valid session. Attaches `req.principal`. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const principal = await resolvePrincipal(req);
    if (!principal) return next(unauthenticated());
    req.principal = principal;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Requires a role. Always applied on the server; the frontend does its own
 * checks for UX only and is never trusted for authorization.
 */
export function requireRole(...roles: Principal["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const principal = req.principal;
    if (!principal) return next(unauthenticated());
    if (!roles.includes(principal.role)) {
      return next(forbidden("This action requires elevated privileges"));
    }
    next();
  };
}

/** A logged-in user with no customer record cannot act as a shopper. */
export function requireCustomer(req: Request): string {
  const principal = req.principal;
  if (!principal) throw unauthenticated();
  if (!principal.customerId) {
    throw forbidden("No customer profile is linked to this account");
  }
  return principal.customerId;
}
