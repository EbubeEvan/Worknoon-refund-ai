# WORKNOON AI Refund Desk

A customer-support refund system where an LLM reads the request, but never decides
the outcome. Gemini extracts structured facts from a customer's free-text message
and drafts the reply; a deterministic rule engine applies the merchant's actual
refund policy against the order's real data and makes the call. Anything the
engine refuses to decide alone is escalated to a human.

## Why it is built this way

The tempting design is "ask the model whether to refund." That is not shippable:
model output is non-deterministic, unauditable, and impossible to hold to a
merchant's policy. Here the model is confined to two jobs it is good at —
reading messy text and writing it back — and every money-moving decision is a
pure function over database state.

```
customer message
      |
      v
  prompt-injection scan          deterministic, before any model call
      |
      v
  Gemini extraction              -> order number, reason, requested amount
      |
      v
  order lookup (scoped to session customer)
      |
      v
  POLICY ENGINE                  -> APPROVED | DENIED | ESCALATED   <-- decides
      |
      v
  pgvector retrieval             policy grounding for the explanation
      |
      v
  Gemini reply                   words only, given the fixed decision
      |
      v
  transaction + audit log
```

If Gemini is unavailable, a regex extractor and the engine's own summary take
over. The decision is identical either way, which is the point.

## Quick start

Requires Docker. You need a Gemini API key; everything else is seeded.

```bash
cp .env.example .env.local     # then put your GEMINI_API_KEY in it
docker compose up -d --build
```

- App: <http://localhost:5173>
- API health: <http://localhost:4000/api/health>
- Postgres: `localhost:5433` (inside the network it is `db:5432`)

Migrations and the demo seed run automatically on API start.

### Demo accounts

All seeded accounts use the password `password123`. The login page can fill these
in for you.

| Account                   | Role    | Scenario it demonstrates          |
| ------------------------- | ------- | --------------------------------- |
| `ada@worknoon.test`       | CUSTOMER| damaged item, approved outright   |
| `grace@worknoon.test`     | CUSTOMER| request above the $500 auto limit |
| `marcus@worknoon.test`    | CUSTOMER| final sale, denied                |
| `admin@worknoon.test`     | ADMIN   | escalation queue, policies, audit |

The seed creates 15 customers and 17 orders, each shaped to trigger a different
policy outcome.

## Commands

```bash
npm run up            # build and start db + api + web
npm run down          # stop
npm run logs          # tail the API
npm run typecheck     # backend + frontend
npm test              # 58 unit tests (policy engine + AI seam)
npm run e2e           # 49-check live end-to-end suite
npm run reset:demo    # wipe orders/requests/policies and re-seed
npm run build         # compile both packages
```

`npm run e2e` needs a freshly seeded database. Run `npm run reset:demo` first, or
scenarios will collide on orders an earlier run already consumed.

## Layout

```
backend/    Express + Drizzle + pgvector
  src/ai/         Gemini extraction, embeddings, reply generation
  src/rag/        document extraction, chunking, indexing, retrieval
  src/domain/     the policy engine and injection detector (no I/O)
  src/modules/    auth, customers, orders, refunds, policies, admin, audit
  seed/           the source policy document
  scripts/        seed, reset, retrieval smoke test, e2e suite
frontend/   React + Vite + TanStack Router/Query
  src/lib/        typed API client, auth context, formatting
  src/routes/     code-based route tree and the auth guard
  src/pages/      login, customer workspace, admin dashboard/policies/audit
```

Backend modules follow a consistent shape: `routes.ts` (wiring) ->
`controller.ts` (HTTP) -> `service.ts` (orchestration) -> `repository.ts` (SQL).
`src/domain/` is deliberately free of database and network calls so the policy
engine can be unit tested in isolation.

## Data model

Money is stored as integer cents everywhere. No floats touch an amount.

| Table          | Notes                                                        |
| -------------- | ------------------------------------------------------------ |
| `users`        | Better Auth; carries the `CUSTOMER`/`ADMIN` role            |
| `customers`    | one per user                                                 |
| `orders`       | `refund_status` and `status` gate what the engine will allow |
| `refund_requests` | `requested_amount_cents` and `approved_amount_cents` are separate |
| `policies`     | uploaded or seeded documents, one active at a time           |
| `policy_chunks`| embedded text for retrieval                                  |
| `audit_logs`   | append-only; no update or delete path exists                 |

`approved_amount_cents` is deliberately distinct from what the customer asked
for, because they often differ — a damaged-item refund settles at the full value
of the order line regardless of the figure in the message.

## Security

- **The model does not decide.** Every outcome comes from `refund-policy.service.ts`.
- **The order is always scoped to the signed-in customer.** Client-supplied
  customer IDs are never trusted; another customer's order resolves to
  `ORDER_NOT_FOUND`, which reveals nothing.
- **The browser guard is UX only.** All authorization is enforced server-side, so
  bypassing the client guard exposes nothing a signed-in user could not fetch.
- **Prompt injection is screened before the model sees the text**, and the facts
  are re-screened before the policy engine runs. Retrieval queries are built from
  normalized policy vocabulary, never from the raw customer message.
- **Approvals are atomic.** The order row is locked `FOR UPDATE` and re-checked
  inside the transaction, so two concurrent approvals cannot both succeed; the
  loser is downgraded to `ALREADY_REFUNDED`. Resolving an escalation twice
  returns `409`.
- **The policy engine is closed.** A default-deny rule terminates the ladder, so an
  unrecognized request is denied rather than waved through.
- Secrets live in `.env.local` (gitignored) and never reach the browser bundle.

## Known limits

- **Gemini free tier is 15 requests/minute** and a refund costs two calls. Under
  load the system falls back to regex extraction, which cannot always read an
  amount out of free text. The E2E suite paces submissions to stay under the cap;
  a production deployment needs a paid tier or a queue.
- Audit logs are append-only in application code only — there is no database
  trigger preventing a direct `UPDATE`.
- The frontend session is read once on load; there is no token refresh, so a
  session expiring mid-use requires a re-login.
