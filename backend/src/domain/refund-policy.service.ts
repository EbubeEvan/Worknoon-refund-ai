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
 * The LLM's only contribution to an outcome is the *extracted reason*, an
 * untrusted input that only selects among rules. Any amount the customer typed
 * is not a fact here at all: every amount comes from the order.
 *
 * Each rule implements a clause of seed/policies/refund-policy.md, and every
 * outcome names the clause it came from.
 */

export type Decision = "APPROVED" | "DENIED" | "ESCALATED";

export type RefundReason = "damaged" | "incorrect_item" | "changed_mind" | "other";

export type OrderStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type RefundStatus = "NONE" | "REQUESTED" | "REFUNDED";

/** Stable machine-readable rule codes, persisted on every decision. */
export type PolicyRuleCode =
  | "ORDER_NUMBER_MISSING"
  | "ORDER_NOT_FOUND"
  | "ORDER_CANCELLED"
  | "ALREADY_REFUNDED"
  | "FINAL_SALE"
  | "OUTSIDE_REFUND_WINDOW"
  | "ORDER_NOT_DELIVERED"
  | "CHANGE_OF_MIND_NOT_ELIGIBLE"
  | "INJECTION_SUSPECTED"
  | "CONFLICTING_DUPLICATE_REQUEST"
  | "AMOUNT_OVER_AUTO_APPROVAL_LIMIT"
  | "DAMAGED_ITEM_NEEDS_REVIEW"
  | "ELIGIBLE_DAMAGED"
  | "ELIGIBLE_INCORRECT_ITEM"
  | "OTHER_REASON_NEEDS_REVIEW"
  | "DEFAULT_DENY";

/** One order line, as recorded at purchase. */
export interface PolicyOrderLine {
  name: string;
  quantity: number;
  unitAmountCents: number;
  /** Absent means the line is returnable. */
  finalSale?: boolean;
}

export interface PolicyOrderSnapshot {
  id: string;
  orderNumber: string;
  totalAmountCents: number;
  isFinalSale: boolean;
  purchasedAt: Date;
  refundStatus: RefundStatus;
  status: OrderStatus;
  items: PolicyOrderLine[];
}

export interface PolicyFacts {
  /** Whether the message contained an order number at all (policy §9). */
  orderNumberProvided: boolean;
  /** null when no order matched. Never populated from client input alone. */
  order: PolicyOrderSnapshot | null;
  reason: RefundReason;
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
  /** The refund-policy.md clause this outcome applies, e.g. "§2 Final sale items". */
  clause: string;
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

/** Policy §8 timelines, quoted in customer-facing summaries. */
const APPROVED_TIMELINE = "It should appear on your statement within 5-10 business days.";
const REVIEW_TIMELINE = "A support agent will decide within two business days.";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/* -------------------------------------------------------------------------- */
/* Amounts - shared with the admin resolve path so both settle identically     */
/* -------------------------------------------------------------------------- */

export function lineCents(line: Pick<PolicyOrderLine, "quantity" | "unitAmountCents">): number {
  return line.unitAmountCents * line.quantity;
}

/**
 * The refundable value of an order: the full order value less any final-sale
 * lines, which policy §2 excludes and recalculates around.
 */
export function returnableCents(
  order: Pick<PolicyOrderSnapshot, "totalAmountCents" | "items">,
): number {
  const finalSaleCents = order.items
    .filter((i) => i.finalSale)
    .reduce((sum, i) => sum + lineCents(i), 0);
  return order.totalAmountCents - finalSaleCents;
}

function isWhollyFinalSale(order: PolicyOrderSnapshot): boolean {
  return order.isFinalSale || (order.items.length > 0 && order.items.every((i) => i.finalSale));
}

/* -------------------------------------------------------------------------- */
/* The rule ladder                                                             */
/*                                                                             */
/* Evaluated top to bottom, first match wins. Ordering is a policy property:   */
/*  - Every denial comes first. The window, final-sale status and the other    */
/*    §6 exclusions cannot be overridden by an agent (§1, §2), so a request    */
/*    they cover must never reach the escalation queue.                        */
/*  - INJECTION_SUSPECTED sits above every APPROVED rule, so no amount of      */
/*    manipulation in the message can produce an approval (§7).                */
/* -------------------------------------------------------------------------- */

interface Rule {
  code: PolicyRuleCode;
  /** Returns an outcome when this rule matches, or null to fall through. */
  evaluate(f: PolicyFacts): PolicyOutcome | null;
}

const deny = (code: PolicyRuleCode, clause: string, summary: string): PolicyOutcome => ({
  decision: "DENIED",
  rules: [code],
  requiresHumanReview: false,
  approvedAmountCents: null,
  clause,
  summary: `${summary} (Refund policy ${clause}.)`,
});

const escalate = (code: PolicyRuleCode, clause: string, summary: string): PolicyOutcome => ({
  decision: "ESCALATED",
  rules: [code],
  requiresHumanReview: true,
  approvedAmountCents: null,
  clause,
  summary: `${summary} ${REVIEW_TIMELINE}`,
});

const approve = (
  code: PolicyRuleCode,
  clause: string,
  amountCents: number,
  summary: string,
): PolicyOutcome => ({
  decision: "APPROVED",
  rules: [code],
  requiresHumanReview: false,
  approvedAmountCents: amountCents,
  clause,
  summary: `${summary} Your refund of ${usd(amountCents)} has been initiated. ${APPROVED_TIMELINE}`,
});

const CLAUSE = {
  window: "§1 Refund window",
  finalSale: "§2 Final sale items",
  damaged: "§3.1 Damaged on arrival",
  incorrect: "§3.2 Incorrect item received",
  changeOfMind: "§3.3 Change of mind",
  other: "§3.4 Other reasons",
  limit: "§4 Refund amounts requiring manual approval",
  duplicate: "§5 Multiple and duplicate requests",
  cannotRefund: "§6 Orders that cannot be refunded",
  suspicious: "§7 Suspicious and conflicting requests",
  orderNumber: "§9 Contacting support",
} as const;

const RULES: Rule[] = [
  /* ---- Denials: final, never sent to an agent --------------------------- */

  {
    code: "ORDER_NUMBER_MISSING",
    evaluate: (f) =>
      f.orderNumberProvided
        ? null
        : deny(
            "ORDER_NUMBER_MISSING",
            CLAUSE.orderNumber,
            "We couldn't find an order number in your message. Please send your request again with your order number (for example ORD-1001) so we can match it to your purchase.",
          ),
  },

  {
    code: "ORDER_NOT_FOUND",
    evaluate: (f) =>
      f.order
        ? null
        : deny(
            "ORDER_NOT_FOUND",
            CLAUSE.orderNumber,
            "We could not find an order matching that order number on your account.",
          ),
  },

  {
    code: "ORDER_CANCELLED",
    evaluate: (f) =>
      f.order?.status === "CANCELLED"
        ? deny(
            "ORDER_CANCELLED",
            CLAUSE.cannotRefund,
            "This order was cancelled and no payment was captured, so there is nothing to refund.",
          )
        : null,
  },

  {
    code: "ALREADY_REFUNDED",
    evaluate: (f) =>
      f.order?.refundStatus === "REFUNDED"
        ? deny(
            "ALREADY_REFUNDED",
            CLAUSE.cannotRefund,
            "A refund has already been issued for this order.",
          )
        : null,
  },

  {
    code: "FINAL_SALE",
    evaluate: (f) =>
      f.order && isWhollyFinalSale(f.order)
        ? deny(
            "FINAL_SALE",
            CLAUSE.finalSale,
            "Every item in this order is final sale, which is not eligible for a refund.",
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
        CLAUSE.window,
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
        CLAUSE.cannotRefund,
        `This order is still ${f.order.status.toLowerCase()}, so a delivery-related refund cannot be processed yet. Please contact us again after it arrives.`,
      );
    },
  },

  {
    code: "CHANGE_OF_MIND_NOT_ELIGIBLE",
    evaluate: (f) =>
      f.reason === "changed_mind"
        ? deny(
            "CHANGE_OF_MIND_NOT_ELIGIBLE",
            CLAUSE.changeOfMind,
            "Change of mind returns are not eligible for a refund under our policy.",
          )
        : null,
  },

  /* ---- Escalations: a human decides ------------------------------------- */

  // Below every denial, above every approval: manipulation can at most force a
  // human decision, and never reopens a request the policy has already closed.
  {
    code: "INJECTION_SUSPECTED",
    evaluate: (f) =>
      f.injection.detected
        ? escalate(
            "INJECTION_SUSPECTED",
            CLAUSE.suspicious,
            "Your request was flagged for manual review by a support agent.",
          )
        : null,
  },

  {
    code: "CONFLICTING_DUPLICATE_REQUEST",
    evaluate: (f) =>
      f.hasOpenRequest
        ? escalate(
            "CONFLICTING_DUPLICATE_REQUEST",
            CLAUSE.duplicate,
            "You already have an open request for this order, so a support agent will review this one to avoid a duplicate refund.",
          )
        : null,
  },

  {
    code: "AMOUNT_OVER_AUTO_APPROVAL_LIMIT",
    evaluate: (f) => {
      if (!f.order) return null;
      // Only reasons that would be approved pay out. "other" is escalated by its
      // own rule below; change of mind has already been denied.
      const wouldPay = f.reason === "damaged" || f.reason === "incorrect_item";
      if (!wouldPay) return null;
      if (f.order.totalAmountCents <= POLICY_THRESHOLDS.autoApprovalLimitCents) return null;
      return escalate(
        "AMOUNT_OVER_AUTO_APPROVAL_LIMIT",
        CLAUSE.limit,
        `This order's total (${usd(f.order.totalAmountCents)}) is above our automatic approval limit of ${usd(POLICY_THRESHOLDS.autoApprovalLimitCents)}, so your request has been sent for review.`,
      );
    },
  },

  // §3.1 refunds the damaged order line. With more than one line the engine
  // cannot know which one, so an agent picks it rather than guessing.
  {
    code: "DAMAGED_ITEM_NEEDS_REVIEW",
    evaluate: (f) =>
      f.reason === "damaged" && f.order && f.order.items.length > 1
        ? escalate(
            "DAMAGED_ITEM_NEEDS_REVIEW",
            CLAUSE.damaged,
            "Your order contains more than one item, so a support agent will confirm which item arrived damaged and refund it.",
          )
        : null,
  },

  /* ---- Approvals --------------------------------------------------------- */

  {
    code: "ELIGIBLE_DAMAGED",
    evaluate: (f) =>
      f.reason === "damaged" && f.order
        ? approve(
            "ELIGIBLE_DAMAGED",
            CLAUSE.damaged,
            returnableCents(f.order),
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
            CLAUSE.incorrect,
            returnableCents(f.order),
            "You received an item that was not what you ordered, which is covered by our refund policy.",
          )
        : null,
  },

  /* ---- Unclassified: a human decides ------------------------------------ */

  {
    code: "OTHER_REASON_NEEDS_REVIEW",
    evaluate: (f) =>
      f.reason === "other"
        ? escalate(
            "OTHER_REASON_NEEDS_REVIEW",
            CLAUSE.other,
            "Your reason isn't one we can decide automatically, so a support agent will review your request.",
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

  // Unreachable while every RefundReason has a rule above, but the ladder stays
  // closed: anything unmatched is refused, never waved through.
  return {
    decision: "DENIED",
    rules: ["DEFAULT_DENY"],
    requiresHumanReview: false,
    approvedAmountCents: null,
    clause: CLAUSE.other,
    summary: "We could not match your request to an eligible refund reason under our policy.",
  };
}

/**
 * Convenience wrapper for callers holding only the raw customer message.
 * Runs the injection scan, which must happen before any approval rule.
 */
export function buildFacts(params: {
  orderNumberProvided: boolean;
  order: PolicyOrderSnapshot | null;
  reason: RefundReason;
  hasOpenRequest: boolean;
  message: string;
  now?: Date;
}): PolicyFacts {
  return {
    orderNumberProvided: params.orderNumberProvided,
    order: params.order,
    reason: params.reason,
    hasOpenRequest: params.hasOpenRequest,
    injection: scanForInjection(params.message),
    now: params.now ?? new Date(),
  };
}
