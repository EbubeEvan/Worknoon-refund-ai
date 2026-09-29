import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  createRefundRequestHandler,
  getRefundRequestHandler,
  listRefundRequestsHandler,
  refundStatsHandler,
} from "./controller.js";

/**
 * Refund routes.
 *
 * Every handler is behind `requireAuth`. Authorization for a specific refund is
 * applied inside the controller, where the request is filtered to the session's
 * customer.
 */
export const refundsRouter = Router();

refundsRouter.use(requireAuth);

refundsRouter.post("/requests", createRefundRequestHandler);
refundsRouter.get("/requests", listRefundRequestsHandler);
refundsRouter.get("/requests/:id", getRefundRequestHandler);

/* Admin-only. Kept on a separate mount so the guard is impossible to forget. */
export const refundAdminRouter = Router();

refundAdminRouter.use(requireAuth, requireRole("ADMIN"));

refundAdminRouter.get("/stats", refundStatsHandler);
