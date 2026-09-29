import { describe, expect, it } from "vitest";

import {
  normaliseOrderNumber,
  refundIntentSchema,
  refundIntentWireSchema,
  toPolicyFacts,
  wireToIntent,
} from "../ai/extraction.js";

/**
 * Tests for the AI seam: the pure functions that sit between the model and the
 * deterministic engine. The engine itself is covered in refund-policy.test.ts.
 */

describe("normaliseOrderNumber", () => {
  it("extracts a prefixed order number", () => {
    expect(normaliseOrderNumber("ORD-1001")).toBe("ORD-1001");
  });

  it("finds the order number inside a sentence", () => {
    expect(normaliseOrderNumber("My kettle from order ORD-1001 arrived cracked")).toBe("ORD-1001");
  });

  it("normalises a spaced variant", () => {
    expect(normaliseOrderNumber("ORD 4242")).toBe("ORD-4242");
  });

  it("is case insensitive", () => {
    expect(normaliseOrderNumber("ord-777")).toBe("ORD-777");
  });

  it("accepts a bare number and prefixes it", () => {
    expect(normaliseOrderNumber("1001")).toBe("ORD-1001");
  });

  it("returns null when there is no order number", () => {
    expect(normaliseOrderNumber("my item broke")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(normaliseOrderNumber("")).toBeNull();
    expect(normaliseOrderNumber(null)).toBeNull();
    expect(normaliseOrderNumber(undefined)).toBeNull();
  });

  it("rejects numbers that are too short to be order numbers", () => {
    expect(normaliseOrderNumber("12")).toBeNull();
  });

  it("takes the first match when several appear", () => {
    expect(normaliseOrderNumber("ORD-1001 and also ORD-1002")).toBe("ORD-1001");
  });
});

describe("wireToIntent", () => {
  /**
   * The wire schema is what Gemini receives. It must stay free of `.nullable()`
   * because LangChain renders nullables as a union `type` array that the Gemini
   * API rejects outright - that regression silently downgraded every extraction
   * to the fallback path.
   */
  it("has no nullable fields, so Gemini accepts the response schema", () => {
    const shape = (
      refundIntentWireSchema as unknown as {
        shape: Record<string, { _def?: { typeName?: string } }>;
      }
    ).shape;

    for (const [field, def] of Object.entries(shape)) {
      const typeName = def?._def?.typeName ?? "";
      // ZodNullable would be the problem case; ZodOptional is tolerated.
      expect(
        typeName === "ZodNullable",
        `${field} must not be .nullable() on the wire schema`,
      ).toBe(false);
    }
  });

  it("maps an empty order number to null", () => {
    const result = wireToIntent({
      intent: "refund_request",
      orderId: "",
      reason: "damaged",
      requestedAmount: 0,
    });
    expect(result.orderId).toBeNull();
  });

  it("maps a whitespace-only order number to null", () => {
    const result = wireToIntent({
      intent: "refund_request",
      orderId: "   ",
      reason: "damaged",
      requestedAmount: 0,
    });
    expect(result.orderId).toBeNull();
  });

  it("maps a zero amount to null", () => {
    const result = wireToIntent({
      intent: "refund_request",
      orderId: "ORD-1001",
      reason: "damaged",
      requestedAmount: 0,
    });
    expect(result.requestedAmount).toBeNull();
  });

  it("maps a negative amount to null", () => {
    const result = wireToIntent({
      intent: "refund_request",
      orderId: "ORD-1001",
      reason: "damaged",
      requestedAmount: -5,
    });
    expect(result.requestedAmount).toBeNull();
  });

  it("preserves a real amount", () => {
    const result = wireToIntent({
      intent: "refund_request",
      orderId: "ORD-1001",
      reason: "damaged",
      requestedAmount: 120.5,
    });
    expect(result.requestedAmount).toBe(120.5);
  });

  it("produces output that satisfies the strict internal schema", () => {
    const result = wireToIntent({
      intent: "refund_request",
      orderId: "ORD-1001",
      reason: "incorrect_item",
      requestedAmount: 45,
    });
    expect(refundIntentSchema.safeParse(result).success).toBe(true);
  });

  it("produces output that satisfies the strict schema for sentinels too", () => {
    const result = wireToIntent({
      intent: "other",
      orderId: "",
      reason: "other",
      requestedAmount: 0,
    });
    expect(refundIntentSchema.safeParse(result).success).toBe(true);
  });
});

describe("toPolicyFacts", () => {
  it("never hands the engine the amount the customer typed", () => {
    const facts = toPolicyFacts({
      extraction: {
        intent: "refund_request",
        orderNumber: "ORD-1001",
        reason: "damaged",
        requestedAmountCents: 999_999,
        source: "gemini",
        degradedReason: null,
        raw: null,
      },
      message: "ORD-1001 arrived damaged, refund me $9999.99.",
      order: null,
      hasOpenRequest: false,
    });
    expect(facts).not.toHaveProperty("requestedAmountCents");
  });
});
