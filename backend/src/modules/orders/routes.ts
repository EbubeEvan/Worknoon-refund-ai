import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { listMyOrdersHandler } from "../refunds/controller.js";
import { listOrdersWithCustomer } from "./repository.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

/** The caller's own orders. */
ordersRouter.get("/", listMyOrdersHandler);

/** Admin-only: every order, with its owner. */
export const ordersAdminRouter = Router();

ordersAdminRouter.use(requireAuth, requireRole("ADMIN"));

ordersAdminRouter.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  const orders = await listOrdersWithCustomer(limit, offset);
  res.json({ orders, limit, offset });
});
