import { ApiError } from "./api.js";

/**
 * Turn a failure into something a human can act on.
 *
 * Backend messages are written for developers and logs; most of them mean
 * nothing to a customer ("Request failed validation", "INTERNAL_ERROR").
 * This maps error codes to plain language per audience. Messages the backend
 * already phrases well (validation hints, specific not-found messages) pass
 * through untouched.
 */

export type ErrorAudience = "customer" | "admin";

export function friendlyError(err: unknown, audience: ErrorAudience = "customer"): string {
  if (err instanceof ApiError) {
    if (err.isAuth) {
      return "Your session has expired. Please sign in again.";
    }
    if (err.isForbidden) {
      return "You don't have permission to do that.";
    }

    switch (err.code) {
      // Already human: zod field hints, "Refund request not found", and the
      // like are written for display, so keep them verbatim.
      case "VALIDATION_ERROR":
      case "NOT_FOUND":
      case "CONFLICT":
        return err.message;
      case "PAYLOAD_TOO_LARGE":
        return "That file is too big. Please keep uploads under 5 MB and try again.";
      case "UNSUPPORTED_MEDIA_TYPE":
        return "That file type isn't supported. Please use a PDF, Markdown, or text file.";
      case "AI_UNAVAILABLE":
        return audience === "customer"
          ? "Our assistant is having trouble right now. Your request was still checked against the refund policy — please try again in a moment."
          : "The model call failed. The request still received a deterministic decision; try again in a moment.";
      case "RATE_LIMITED":
        return "Too many tries in a short time. Please wait a moment and try again.";
      default:
        return "Something went wrong on our end. Please try again.";
    }
  }

  // Not an API error at all: the request never reached the server.
  return "We couldn't reach the server. Check your connection and try again.";
}
