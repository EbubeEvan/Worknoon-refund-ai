/** Display helpers. Money is integer cents everywhere; never a float. */

export function usd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "-";
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function shortDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function dateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Turn a rule code into something a human can read.
 *
 * Rule codes are an internal vocabulary ("AMOUNT_OVER_AUTO_APPROVAL_LIMIT").
 * Customers should never meet one raw, and admins read faster with plain
 * language too — the exact codes are still preserved in the audit trail.
 * Unknown codes fall back to Title Case so nothing ever renders as SNAKE_CASE.
 */
const FRIENDLY_RULES: Record<string, string> = {
  ORDER_NUMBER_MISSING: "No order number given",
  ORDER_NOT_FOUND: "Order not found",
  DAMAGED_ITEM_NEEDS_REVIEW: "Damaged item, line to confirm",
  OTHER_REASON_NEEDS_REVIEW: "Needs an agent's review",
  ADMIN_APPROVE: "Approved by an agent",
  ADMIN_DENY: "Denied by an agent",
  INJECTION_SUSPECTED: "Flagged for review",
  ORDER_CANCELLED: "Order was cancelled",
  ALREADY_REFUNDED: "Already refunded",
  FINAL_SALE: "Final sale item",
  OUTSIDE_REFUND_WINDOW: "Outside the refund window",
  ORDER_NOT_DELIVERED: "Not delivered yet",
  CONFLICTING_DUPLICATE_REQUEST: "Duplicate request",
  // Retired rules; kept so historical decisions still render.
  INVALID_AMOUNT: "Invalid amount",
  AMOUNT_EXCEEDS_ORDER_TOTAL: "More than the order total",
  AMOUNT_OVER_AUTO_APPROVAL_LIMIT: "Over the instant-approval amount",
  ELIGIBLE_DAMAGED: "Damaged item",
  ELIGIBLE_INCORRECT_ITEM: "Wrong item received",
  CHANGE_OF_MIND_NOT_ELIGIBLE: "Change of mind",
  // Extraction reasons share the same vocabulary shape.
  damaged: "Damaged",
  incorrect_item: "Wrong item",
  other: "Other",
};

export function humanRule(code: string): string {
  const friendly = FRIENDLY_RULES[code];
  if (friendly) return friendly;
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
