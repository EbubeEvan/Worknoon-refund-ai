import { type InjectionScan, scanForInjection } from "./prompt-injection.js";

/**
 * The deterministic refund policy engine.
 *
 * This module is the authoritative decision layer. It is a pure function: no
 * database, no network, no LLM, no clock reads of its own (`now` is injected).
 * That is what makes the "AI-assisted, not AI-controlled" claim structural
 * rather than aspirational - the decision cannot depend on anything the model
 * could influence, because the model is not in this call path at all.
 *
 * The LLM's only contribution to an outcome is the *extracted reason* and
 * *requested amount*, both of which are untrusted inputs to this function and
 * are re-validated here.
 */

export type Decision = "APPROVED" | "DENIED" | "ESCALATED";

export type RefundReason = "damaged" | "incorrect_item" | "changed_mind" | "other";

export type OrderStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type RefundStatus = "NONE" | "REQUESTED" | "REFUNDED";

/** Stable machine-readable rule codes, persisted on every decision. */
export type PolicyRuleCode =
  | "ORDER_NOT_FOUND"
  | "INJECTION_SUSPECTED"
  | "ORDER_CANCELLED"
  | "ALREADY_REFUNDED"
  | "FINAL_SALE"
  | "OUTSIDE_REFUND_WINDOW"
  | "ORDER_NOT_DELIVERED"
  | "CONFLICTING_DUPLICATE_REQUEST"
  | "INVALID_AMOUNT"
  | "AMOUNT_EXCEEDS_ORDER_TOTAL"
  | "AMOUNT_OVER_AUTO_APPROVAL_LIMIT"
  | "ELIGIBLE_DAMAGED"
  | "ELIGIBLE_INCORRECT_ITEM"
  | "CHANGE_OF_MIND_NOT_ELIGIBLE"
  | "DEFAULT_DENY";

export interface PolicyOrderSnapshot {
  id: string;
  orderNumber: string;
  totalAmountCents: number;
  isFinalSale: boolean;
  purchasedAt: Date;
  refundStatus: RefundStatus;
  status: OrderStatus;
}

export interface PolicyFacts {
  /** null when no order matched. Never populated from client input alone. */
  order: PolicyOrderSnapshot | null;
  reason: RefundReason;
  requestedAmountCents: number | null;
  /** Another unresolved request already exists for this order. */
  hasOpenRequest: boolean;
  /** Pre-computed deterministic scan of the raw message. */
  injection: InjectionScan;
  /** Injected for testability. */
  now: Date;
}

export interface PolicyOutcome {
  decision: Decision;
  /** Every rule code that contributed, in evaluation order. */
  rules: PolicyRuleCode[];
  requiresHumanReview: boolean;
  /** Only set when APPROVED. */
  approvedAmountCents: number | null;
  /** Deterministic, customer-safe explanation. The LLM only rephrases this. */
  summary: string;
}

/* -------------------------------------------------------------------------- */
/* Thresholds - every business constant in one place                           */
/* -------------------------------------------------------------------------- */

export const POLICY_THRESHOLDS = {
  /** Refunds are only accepted within this many days of purchase. */
  refundWindowDays: 30,
  /** Above this, a human must approve. 500 USD expressed in cents. */
  autoApprovalLimitCents: 50_000,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/* -------------------------------------------------------------------------- */
/* The rule ladder                                                             */
/*                                                                             */
/* Evaluated top to bottom, first match wins. Ordering is a security property:  */
/* INJECTION_SUSPECTED sits above every APPROVED rule, so no amount of         */
/* manipulation in the message can produce an approval.                         */
/* -------------------------------------------------------------------------- */

interface Rule {
  code: PolicyRuleCode;
  /** Returns an outcome when this rule matches, or null to fall through. */
  evaluate(f: PolicyFacts): PolicyOutcome | null;
}

const deny = (
  code: PolicyRuleCode,
  summary: string,
  extra?: Partial<PolicyOutcome>,
): PolicyOutcome => ({
  decision: "DENIED",
  rules: [code],
  requiresHumanReview: false,
  approvedAmountCents: null,
  summary,
  ...extra,
});

const escalate = (code: PolicyRuleCode, summary: string): PolicyOutcome => ({
  decision: "ESCALATED",
  rules: [code],
  requiresHumanReview: true,
  approvedAmountCents: null,
  summary,
});

const approve = (code: PolicyRuleCode, amountCents: number, summary: string): PolicyOutcome => ({
  decision: "APPROVED",
  rules: [code],
  requiresHumanReview: false,
  approvedAmountCents: amountCents,
  summary,
});

const RULES: Rule[] = [
  {
    code: "ORDER_NOT_FOUND",
    evaluate: (f) =>
      f.order
        ? null
        : deny(
            "ORDER_NOT_FOUND",
            "We could not find an order matching that request on your account.",
          ),
  },

  // Placed immediately after ORDER_NOT_FOUND and above every approval rule.
  // A message that tries to manipulate the system never reaches APPROVED.
  {
    code: "INJECTION_SUSPECTED",
    evaluate: (f) =>
      f.injection.detected
        ? escalate(
            "INJECTION_SUSPECTED",
            "Your request was flagged for manual review by a support agent.",
          )
        : null,
  },

  {
    code: "ORDER_CANCELLED",
    evaluate: (f) =>
      f.order?.status === "CANCELLED"
        ? deny("ORDER_CANCELLED", "This order was cancelled, so no refund is required.")
        : null,
  },

  {
    code: "ALREADY_REFUNDED",
    evaluate: (f) =>
      f.order?.refundStatus === "REFUNDED"
        ? deny("ALREADY_REFUNDED", "A refund has already been issued for this order.")
        : null,
  },

  {
    code: "FINAL_SALE",
    evaluate: (f) =>
      f.order?.isFinalSale
        ? deny(
            "FINAL_SALE",
            "This order contains final sale items, which are not eligible for refund.",
          )
        : null,
  },

  {
    code: "OUTSIDE_REFUND_WINDOW",
    evaluate: (f) => {
      if (!f.order) return null;
      const age = daysBetween(f.order.purchasedAt, f.now);
      if (age <= POLICY_THRESHOLDS.refundWindowDays) return null;
      return deny(
        "OUTSIDE_REFUND_WINDOW",
        `This order was purchased ${age} days ago, outside our ${POLICY_THRESHOLDS.refundWindowDays}-day refund window.`,
      );
    },
  },

  {
    code: "ORDER_NOT_DELIVERED",
    evaluate: (f) => {
      if (!f.order) return null;
      // "Arrived damaged" is incoherent for an order that never arrived.
      const claimsArrival = f.reason === "damaged" || f.reason === "incorrect_item";
      if (!claimsArrival) return null;
      if (f.order.status === "DELIVERED") return null;
      return deny(
        "ORDER_NOT_DELIVERED",
        `This order is still ${f.order.status.toLowerCase()}, so a delivery-related refund cannot be processed yet.`,
      );
    },
  },

  {
    code: "CONFLICTING_DUPLICATE_REQUEST",
    evaluate: (f) =>
      f.hasOpenRequest
        ? escalate(
            "CONFLICTING_DUPLICATE_REQUEST",
            "You already have an open request for this order. A support agent will review it to avoid duplicate refunds.",
          )
        : null,
  },

  {
    code: "INVALID_AMOUNT",
    evaluate: (f) => {
      if (f.requestedAmountCents === null) return null;
      if (f.requestedAmountCents <= 0) {
        return deny("INVALID_AMOUNT", "The requested refund amount is not valid.");
      }
      return null;
    },
  },

  {
    code: "AMOUNT_EXCEEDS_ORDER_TOTAL",
    evaluate: (f) => {
      if (!f.order || f.requestedAmountCents === null) return null;
      if (f.requestedAmountCents <= f.order.totalAmountCents) return null;
      return escalate(
        "AMOUNT_EXCEEDS_ORDER_TOTAL",
        `The requested amount (${usd(f.requestedAmountCents)}) is higher than the order total (${usd(f.order.totalAmountCents)}), so a support agent must review it.`,
      );
    },
  },

  {
    code: "AMOUNT_OVER_AUTO_APPROVAL_LIMIT",
    evaluate: (f) => {
      if (f.requestedAmountCents === null || !f.order) return null;
      if (f.requestedAmountCents <= POLICY_THRESHOLDS.autoApprovalLimitCents) return null;
      return escalate(
        "AMOUNT_OVER_AUTO_APPROVAL_LIMIT",
        `The requested amount (${usd(f.requestedAmountCents)}) is above our automatic approval limit of ${usd(POLICY_THRESHOLDS.autoApprovalLimitCents)}, so it needs manual approval.`,
      );
    },
  },

  {
    code: "ELIGIBLE_DAMAGED",
    evaluate: (f) =>
      f.reason === "damaged" && f.order
        ? approve(
            "ELIGIBLE_DAMAGED",
            f.order.totalAmountCents,
            "Your order arrived damaged, which is covered by our refund policy.",
          )
        : null,
  },

  {
    code: "ELIGIBLE_INCORRECT_ITEM",
    evaluate: (f) =>
      f.reason === "incorrect_item" && f.order
        ? approve(
            "ELIGIBLE_INCORRECT_ITEM",
            f.order.totalAmountCents,
            "You received an item that was not what you ordered, which is covered by our refund policy.",
          )
        : null,
  },

  {
    code: "CHANGE_OF_MIND_NOT_ELIGIBLE",
    evaluate: (f) =>
      f.reason === "changed_mind"
        ? deny(
            "CHANGE_OF_MIND_NOT_ELIGIBLE",
            "Change of mind returns are not eligible for a refund under our policy.",
          )
        : null,
  },
];

/**
 * Apply the refund policy to a set of already-resolved facts.
 *
 * @param facts  Normalised, server-resolved facts. `order` must have been
 *               looked up in PostgreSQL and ownership already verified - this
 *               function is never handed a client-supplied customer id.
 */
export function evaluateRefundPolicy(facts: PolicyFacts): PolicyOutcome {
  for (const rule of RULES) {
    const outcome = rule.evaluate(facts);
    if (outcome) return outcome;
  }

  // Unclassified requests are never auto-approved. A reason of "other" with no
  // supporting evidence is exactly the case a human should see.
  return {
    decision: "DENIED",
    rules: ["DEFAULT_DENY"],
    requiresHumanReview: false,
    approvedAmountCents: null,
    summary: "We could not match your request to an eligible refund reason under our policy.",
  };
}

/**
 * Convenience wrapper for callers holding only the raw customer message.
 * Runs the injection scan, which must happen before any approval rule.
 */
export function buildFacts(params: {
  order: PolicyOrderSnapshot | null;
  reason: RefundReason;
  requestedAmountCents: number | null;
  hasOpenRequest: boolean;
  message: string;
  now?: Date;
}): PolicyFacts {
  return {
    order: params.order,
    reason: params.reason,
    requestedAmountCents: params.requestedAmountCents,
    hasOpenRequest: params.hasOpenRequest,
    injection: scanForInjection(params.message),
    now: params.now ?? new Date(),
  };
}
