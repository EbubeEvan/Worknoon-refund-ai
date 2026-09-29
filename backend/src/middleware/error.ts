import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, type ErrorCode } from "../lib/errors.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("error");

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND" satisfies ErrorCode,
      message: `No route for ${req.method} ${req.path}`,
    },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR" satisfies ErrorCode,
        message: "Request failed validation",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Multer surfaces upload problems with these codes.
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE" satisfies ErrorCode, message: "File is too large" },
    });
    return;
  }

  // Never leak internals to the client; log the full error server-side.
  log.error("unhandled error", err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR" satisfies ErrorCode,
      message: "Something went wrong on our side",
    },
  });
}
