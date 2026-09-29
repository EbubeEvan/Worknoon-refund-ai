import { Router } from "express";
import multer from "multer";

import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  deletePolicyHandler,
  getPolicyHandler,
  listPoliciesHandler,
  updatePolicyHandler,
  uploadPolicyHandler,
} from "./controller.js";

/** Multipart parser, kept local so the JSON body parser is unaffected. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export const policiesRouter = Router();

policiesRouter.use(requireAuth, requireRole("ADMIN"));

policiesRouter.get("/", listPoliciesHandler);
policiesRouter.post("/", upload.single("file"), uploadPolicyHandler);
policiesRouter.get("/:id", getPolicyHandler);
policiesRouter.patch("/:id", updatePolicyHandler);
policiesRouter.delete("/:id", deletePolicyHandler);
