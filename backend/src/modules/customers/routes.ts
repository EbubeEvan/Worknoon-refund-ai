import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { getMyProfileHandler } from "./controller.js";

export const customersRouter = Router();

customersRouter.use(requireAuth);

customersRouter.get("/me", getMyProfileHandler);
