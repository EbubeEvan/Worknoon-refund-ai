# Architecture notes

Design decisions that are not obvious from the code, and the reasoning behind them.

## The model is a parser and a writer, nothing more

Two Gemini calls bracket a decision made entirely without it:

1. **Extraction** turns a customer's message into `{ orderNumber, reason, requestedAmountCents }`.
2. **Reply** writes a response to a decision that has already been made.

The reply prompt is given the finished decision and is explicitly instructed not
to change it. It is a formatting pass, not a decision point.

This split exists because the failure modes are asymmetric. A bad extraction
degrades one request and is visible in the audit trail. A bad decision moves
money on an unreproducible basis. Only the first kind of failure is acceptable
from a model.

## The policy engine is a pure function

`backend/src/domain/refund-policy.service.ts` takes a `PolicyFacts` snapshot and
returns a `PolicyOutcome`. It performs no I/O, has no clock of its own (`now` is
injected), and is a first-match-wins ladder ending in a default-deny rule.

Consequences worth the cost:

- 35 unit tests cover it without a database, including one per rule code.
- Replaying a historical decision is a pure function call, which is what makes
  the audit trail meaningful.
- Two code paths that reach the same outcome must agree. Manual escalation
  approval therefore settles at the order total, exactly as the automatic
  damaged-item rule does, instead of using the amount the customer happened to
  type. Diverging there would let a queue of human reviewers quietly hand out
  different amounts than the policy says.

Ending the ladder with default-deny means an unrecognized request is refused.
That is deliberate: the cost of denying a legitimate refund is one support
ticket, and the cost of the alternative is unbounded.

## Order of operations in the refund service

1. Injection scan on the raw message.
2. Gemini extraction, with a regex fallback.
3. Order lookup scoped to the session customer.
4. Injection re-scan on the extracted facts.
5. Deterministic policy evaluation.
6. Reply generation, falling back to the engine's own summary.
7. Transactional persistence plus audit event.

Injection is checked twice on purpose. The first pass stops an attack before it
reaches a model that might be steered by it; the second protects the engine from
facts that arrived by some other route.

## Money handling

All amounts are integer cents. `requested_amount_cents` and
`approved_amount_cents` are separate columns because they frequently differ: the
policy issues a damaged-item refund at the full value of the order line, whatever
the customer asked for. Conflating them would misreport refunds and make the
audit trail lie. The requested amount is recorded but never reaches the engine:
`PolicyFacts` has no field for it, so every limit and payout comes from the order.

The approval transaction locks the order row and re-checks `refund_status`
before writing. Without the lock, two concurrent submissions on the same order
could both read `NONE` and both approve. The second one is downgraded to
`ALREADY_REFUNDED` rather than erroring, so the customer gets a truthful answer
instead of a 500.

## Nullability workaround for structured output

The current LangChain/Google adapter rejects nullable fields in a Zod schema for
structured output, so `requestedAmountCents: number | null` fails at the API with
a 400. `extraction.ts` therefore sends a non-nullable wire schema using `""` and
`0` as sentinels, then maps it back and validates against the strict nullable
schema. The wire schema is exported so the mapping is unit tested rather than
trusted.

## Prompt injection as a first-class input

`prompt-injection.ts` is deterministic and runs before any model call. It is not
a substitute for a model's own resistance, but it makes the common cases
predictable and testable, and it gives the engine a rule code
(`INJECTION_SUSPECTED`) to escalate on.

## The policy document is a spec, not an input

`backend/seed/policies/refund-policy.md` is the written refund policy. Nothing
reads it at runtime: the rules live in `refund-policy.service.ts`, and the reply
is phrased from the engine's own summary and rule codes. An earlier version
embedded the document for retrieval and let admins upload replacements, but an
uploaded document could change the explanation without changing the decision,
so the two could contradict each other. When the policy changes, change the
engine and the markdown together.

## Why Express and a single Postgres

No agent framework, no message broker, no vector database. The system is
two services and one database. The only genuinely non-trivial state is the
refund request, and it fits comfortably in a transactional table with a row
lock. Adding a queue or an agent runtime would add failure modes without
removing any that matter at this scale.

Where durability does matter, it is bought with Postgres: `FOR UPDATE` for
the approval race, and an append-only audit table in the same transaction as the
decision it records.

## Testing strategy

- **Unit (53 tests, no I/O).** Every policy rule code, injection patterns, and
  the extraction wire-schema mapping.
- **E2E (48 checks, live HTTP).** Every policy branch, cross-customer isolation,
  replay protection, duplicate suppression, admin surfaces, and now manual
  escalation resolution including its double-resolution guard.
- **Browser verification.** The customer and admin surfaces were driven manually
  to confirm the rendered flows, not just the API contracts.

The E2E suite paces refund submissions. Gemini's free tier allows 15
requests/minute and each refund costs two, so an unpaced burst exhausts the quota
and silently pushes extraction onto the fallback path. Extraction source is
reported as an observation rather than an assertion for the same reason: a
quota-exhausted run still exercises every deterministic path, and treating the
fallback as a failure would mask real regressions behind infrastructure noise.
