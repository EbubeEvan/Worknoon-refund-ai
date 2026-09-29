# Architecture notes

Design decisions that are not obvious from the code, and the reasoning behind them.
Setup, commands, layout and the data model are in the [README](../README.md).

## The model is a parser and a writer, nothing more

Two Gemini calls bracket a decision made entirely without it:

1. **Extraction** turns a customer's message into `{ orderNumber, reason, requestedAmountCents }`.
   Only the order number (to find the order) and the reason (to pick a rule)
   reach the decision; the amount is stored for the record and nothing more.
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
injected), and is a first-match-wins ladder. Each rule implements a clause of
`backend/seed/policies/refund-policy.md`, and every outcome carries that clause
(`PolicyOutcome.clause`) so a denial can cite it, as §8 requires:

| #   | Rule                              | Outcome                                           | Clause |
| --- | --------------------------------- | ------------------------------------------------- | ------ |
| 1   | `ORDER_NUMBER_MISSING`            | DENIED, asks for the order number                 | §9     |
| 2   | `ORDER_NOT_FOUND`                 | DENIED                                            | §9     |
| 3   | `ORDER_CANCELLED`                 | DENIED                                            | §6     |
| 4   | `ALREADY_REFUNDED`                | DENIED                                            | §6     |
| 5   | `FINAL_SALE`                      | DENIED (every line is final sale)                 | §2     |
| 6   | `OUTSIDE_REFUND_WINDOW`           | DENIED (more than 30 days)                        | §1     |
| 7   | `ORDER_NOT_DELIVERED`             | DENIED (damage or wrong-item claim only)          | §6     |
| 8   | `CHANGE_OF_MIND_NOT_ELIGIBLE`     | DENIED                                            | §3.3   |
| 9   | `INJECTION_SUSPECTED`             | ESCALATED                                         | §7     |
| 10  | `CONFLICTING_DUPLICATE_REQUEST`   | ESCALATED                                         | §5     |
| 11  | `AMOUNT_OVER_AUTO_APPROVAL_LIMIT` | ESCALATED (order total above $500)                | §4     |
| 12  | `DAMAGED_ITEM_NEEDS_REVIEW`       | ESCALATED (damage claim, more than one line)      | §3.1   |
| 13  | `ELIGIBLE_DAMAGED`                | APPROVED at the line's value                      | §3.1   |
| 14  | `ELIGIBLE_INCORRECT_ITEM`         | APPROVED at the order total less final-sale lines | §3.2   |
| 15  | `OTHER_REASON_NEEDS_REVIEW`       | ESCALATED                                         | §3.4   |
| 16  | `DEFAULT_DENY`                    | DENIED (unreachable backstop)                     | —      |

The thresholds live in `POLICY_THRESHOLDS` in the same file. Approval and
escalation summaries also quote the §8 timelines: 5-10 business days for a
refund to appear, two business days for a review.

### Why every denial comes before the injection check

§1 and §2 say an agent cannot extend the refund window or lift final-sale
status. If the injection check sat above those denials, an attack on a
final-sale order would become an escalation, and an agent could then approve
it. So every denial is evaluated first and is final. `INJECTION_SUSPECTED`
still sits above every approval rule, so manipulation can at most force a
human decision (§7) and can never produce an approval or reopen a closed
request. The attempt is recorded on the request (`injection_detected`) either
way.

Consequences worth the cost:

- 45 unit tests cover it without a database, including one per rule code.
- Replaying a historical decision is a pure function call, which is what makes
  the audit trail meaningful.
- Two code paths that reach the same outcome must agree. The engine and the
  admin resolve path share `returnableCents` and `lineCents`, so an agent's
  approval pays what the engine would have: every returnable line by default,
  or the lines the agent picks. The server refuses a final-sale line (§2) and,
  on a multi-item damage claim, requires the agent to name the damaged line
  (§3.1). Diverging there would let a queue of human reviewers quietly hand
  out different amounts than the policy says.

The ladder stays closed: every refund reason has a rule, and `DEFAULT_DENY`
catches anything unmatched rather than waving it through.

## Order of operations in the refund service

`evaluateRefundRequest` in `backend/src/modules/refunds/service.ts` is the one
place this flow is written down, matching the diagram in the README:

1. Injection scan on the raw message.
2. Gemini extraction, with a regex fallback.
3. Order lookup scoped to the session customer.
4. Deterministic policy evaluation. Building the facts re-runs the injection scan
   on the raw message and checks for an open request on the same order.
5. Reply generation, falling back to the engine's own summary.
6. Transactional persistence plus audit event.

The injection scan runs twice on purpose. The first pass records the attempt
before the message reaches a model that might be steered by it. The second is the
value the engine actually reads, computed from the raw message rather than from
anything the model returned, so a model's output cannot clear the flag.

Nothing after step 4 can change the decision: the reply and the write both
receive it as fixed input.

## When Gemini is unavailable

Both model calls fail safe rather than failing the request:

- **Extraction** falls back to a regex that reads the order number and sets the
  reason to `other`. The hard denials still apply. Anything that survives them
  is escalated as `OTHER_REASON_NEEDS_REVIEW` (§3.4), so an outage fills the
  review queue but can never approve anything.
- **Reply** falls back to the engine's own `summary`, word for word.

The admin dashboard counts fallback extractions, so an outage is visible rather
than silent.

## Money handling

All amounts are integer cents. `requested_amount_cents` and
`approved_amount_cents` are separate columns because they frequently differ: the
policy pays from the order's lines (the damaged line, or the order total less
final-sale lines), whatever the customer asked for. Conflating them would misreport refunds and make the
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

It covers the §7 risk signals that can be read from the text alone: attempts to
alter the system or bypass policy, prompt extraction, claims of special
authority, and demands to refund every order. The last signal, contradictions
between the stated reason and the order contents, is automated only where the
order data proves it: a damage or wrong-item claim on an undelivered order
(`ORDER_NOT_DELIVERED`). Detecting the rest would mean letting model output
decide what gets escalated, so those are left to the reviewing agent.

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

- **Unit (63 tests, no I/O).** Every policy rule code, the clause and timeline
  on each outcome, injection patterns, and the extraction wire-schema mapping.
- **E2E (58 checks, live HTTP).** Every policy rule except
  `OTHER_REASON_NEEDS_REVIEW` (whether a message reads as "other" depends on
  the model, so it is unit tested) and the unreachable `DEFAULT_DENY`. Also
  cross-customer isolation, replay protection, duplicate suppression, the
  ignored typed amount, the mixed final-sale payout, admin surfaces, and manual
  escalation resolution: its double-resolution guard and line picking.
- **Browser verification.** The customer and admin surfaces were driven manually
  to confirm the rendered flows, not just the API contracts.

The E2E suite paces refund submissions. Gemini's free tier allows 15
requests/minute and each refund costs two, so an unpaced burst exhausts the quota
and silently pushes extraction onto the fallback path. Extraction source is
reported as an observation rather than an assertion for the same reason: a
quota-exhausted run still exercises every deterministic path, and treating the
fallback as a failure would mask real regressions behind infrastructure noise.
