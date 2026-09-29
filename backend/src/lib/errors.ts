/**
 * Application error taxonomy.
 *
 * Controllers throw these; a single error middleware turns them into responses.
 * Nothing else in the codebase calls `res.status(...).json(...)` for an error, so
 * every failure the client sees has the same shape.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "AI_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (m: string, d?: unknown) => new AppError(400, "VALIDATION_ERROR", m, d);
export const unauthenticated = (m = "Authentication required") =>
  new AppError(401, "UNAUTHENTICATED", m);
export const forbidden = (m = "You do not have access to this resource") =>
  new AppError(403, "FORBIDDEN", m);
export const notFound = (m = "Resource not found") => new AppError(404, "NOT_FOUND", m);
export const conflict = (m: string) => new AppError(409, "CONFLICT", m);
export const tooLarge = (m: string) => new AppError(413, "PAYLOAD_TOO_LARGE", m);
export const badMedia = (m: string) => new AppError(415, "UNSUPPORTED_MEDIA_TYPE", m);
export const aiUnavailable = (m: string) => new AppError(503, "AI_UNAVAILABLE", m);
