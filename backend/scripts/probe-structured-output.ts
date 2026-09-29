import { z } from "zod";
import { getChatModel } from "../src/ai/gemini.js";

/**
 * Proves which Zod shapes Gemini will accept for structured output.
 *   npx tsx scripts/probe-structured-output.ts
 */

const nullable = z.object({
  intent: z.enum(["refund_request", "other"]),
  orderId: z.string().nullable(),
  requestedAmount: z.number().positive().nullable(),
});

const sentinel = z.object({
  intent: z.enum(["refund_request", "other"]),
  orderId: z.string(),
  requestedAmount: z.number(),
});

async function probe(label: string, schema: z.ZodType, message: string) {
  try {
    const m = getChatModel().withStructuredOutput(schema, { name: "probe" });
    const out = await m.invoke([
      { role: "system", content: "Extract the fields. Empty string and 0 mean 'not stated'." },
      { role: "user", content: message },
    ]);
    console.log(`[OK]   ${label}:`, JSON.stringify(out));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[FAIL] ${label}:`, msg.slice(0, 180));
  }
}

const message =
  "My kettle from order ORD-1001 arrived cracked. I'd like a refund of $120 please.";

await probe("nullable fields", nullable, message);
await probe("sentinel fields", sentinel, message);
process.exit(0);
