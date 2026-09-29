import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  auditSummaryHandler,
  dashboardHandler,
  getCustomerHandler,
  listAuditHandler,
  listCustomersHandler,
  listEscalationsHandler,
  listOrdersHandler,
  resolveEscalationHandler,
} from "./controller.js";

/**
 * Admin routes.
 *
 * The role guard is applied to the whole router, so a new admin endpoint is
 * protected by default rather than by remembering to add a check per route.
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/dashboard", dashboardHandler);

adminRouter.get("/escalations", listEscalationsHandler);
adminRouter.post("/escalations/:id/resolve", resolveEscalationHandler);

adminRouter.get("/customers", listCustomersHandler);
adminRouter.get("/customers/:id", getCustomerHandler);

adminRouter.get("/orders", listOrdersHandler);

adminRouter.get("/audit", listAuditHandler);
adminRouter.get("/audit/summary", auditSummaryHandler);
