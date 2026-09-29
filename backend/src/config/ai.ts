import { env } from "./env.js";

/**
 * Model configuration, kept in one place so the README and the code can never
 * silently disagree.
 *
 * The ID is a pinned dated snapshot rather than `-latest` aliases: an alias
 * can retarget under you, and a reviewer re-running this demo next month should
 * reproduce the same behaviour.
 */

/** Structured extraction + customer-facing explanations. */
export const CHAT_MODEL = env.CHAT_MODEL;

/**
 * Do NOT set `thinkingBudget: 0` on gemini-3.5-flash-lite.
 *
 * Verified against the live API: it returns HTTP 400 "Request contains an
 * invalid argument". The model is a thinking model and a zero budget is
 * rejected. Omitting `thinkingConfig` entirely uses the default and works.
 */
export const CHAT_LIMITS = {
  temperature: 0,
  maxOutputTokens: 2048,
} as const;
