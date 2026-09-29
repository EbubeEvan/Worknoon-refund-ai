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

| Account                | Role     | Scenario it demonstrates          |
| ---------------------- | -------- | --------------------------------- |
| `ada@worknoon.test`    | CUSTOMER | damaged item, approved outright   |
| `grace@worknoon.test`  | CUSTOMER | request above the $500 auto limit |
| `marcus@worknoon.test` | CUSTOMER | final sale, denied                |
| `admin@worknoon.test`  | ADMIN    | escalation queue, audit           |

The seed creates 15 customers and 17 orders, each shaped to trigger a different
policy outcome.

## Commands

```bash
npm run up            # build and start db + api + web
npm run down          # stop
npm run logs          # tail the API
npm run lint          # eslint, correctness only
npm run lint:fix      # eslint --fix
npm run format        # prettier --write
npm run format:check  # prettier --check
npm run typecheck     # tsc: backend/src, backend/scripts, frontend
npm test              # 57 unit tests (policy engine + AI seam)
npm run e2e           # 48-check live end-to-end suite
npm run reset:demo    # wipe orders/requests and re-seed
npm run build         # compile both packages
npm run verify        # lint + format:check + typecheck + test + build
```

**Run `npm run lint` and `npm run build` after every change**, not once at the
end. Both must exit 0. `npm run verify` bundles the full gate and runs in well
under a minute; it deliberately leaves out the e2e suite.

`npm run e2e` needs a freshly seeded database. Run `npm run reset:demo` first, or
scenarios will collide on orders an earlier run already consumed.

### Tooling

ESLint owns correctness, Prettier owns formatting. `eslint.config.mjs` ends with
`eslint-config-prettier`, which switches off every stylistic rule that would
contradict the formatter — so add new rules _above_ that line, never below it.

Import and export order is enforced by `eslint-plugin-simple-import-sort` across
every `.ts` and `.tsx` file. It is far more reliable here than
`import/order`, which needs a type-aware resolver to sort TypeScript correctly,
and it autofixes both import and export declarations. The convention it produces:

```
side-effect imports, then node builtins, then packages, then relative
```

with a blank line between groups and specifiers sorted within each list.

If you run `eslint --fix` yourself, follow it with `npm run format`. Sorting
rewrites specifier lists and its output is not Prettier-formatted — on its own it
produces `import { createRouter,RouterProvider }`. The two settle after one pass
and do not then fight each other; `lint-staged` in the `pre-commit` hook already
runs them in that order.

`backend/seed/` is in `.prettierignore` on purpose: `refund-policy.md` is the
authoritative written policy and is kept verbatim. Nothing reads it at runtime —
the rules live in `refund-policy.service.ts` — so the two must change together.

### Git hooks

Installed by husky via `npm run prepare`; they need no manual `git config`.

| Hook         | Runs                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| `pre-commit` | `lint-staged` — eslint `--fix` + prettier `--write`, staged files only |
| `pre-push`   | lint, format:check, typecheck, unit tests, build                       |
| `commit-msg` | commitlint, Conventional Commits                                       |

Unit tests are in `pre-push` because they run in under a second and are the
cheapest signal that the policy engine still decides correctly. The e2e suite is
not in any hook: it needs the Docker stack up, takes minutes, and spends a
rate-limited Gemini quota. That belongs in CI, not a local hook.

Both hooks start with `set -e`, which is load-bearing — without it a failure
early in the script is swallowed and the hook exits with the last command's
status. Bypass deliberately with `git commit --no-verify` or
`git push --no-verify`, not reflexively.

## Layout

```
backend/    Express + Drizzle + PostgreSQL
  src/ai/         Gemini extraction and reply generation
  src/domain/     the policy engine and injection detector (no I/O)
  src/modules/    auth, customers, orders, refunds, admin, audit
  seed/           the written refund policy (spec only; not read at runtime)
  scripts/        seed, reset, e2e suite
frontend/   React + Vite + TanStack Router/Query
  src/lib/        typed API client, auth context, formatting
  src/routes/     file-based routes (createFileRoute only; tree is generated)
  src/features/   auth, customer workspace, admin dashboard/audit
  src/components/ app shell, icons, and ui/ primitives (one per file)
```

Backend modules follow a consistent shape: `routes.ts` (wiring) ->
`controller.ts` (HTTP) -> `service.ts` (orchestration) -> `repository.ts` (SQL).
`src/domain/` is deliberately free of database and network calls so the policy
engine can be unit tested in isolation.

## Data model

Money is stored as integer cents everywhere. No floats touch an amount.

| Table             | Notes                                                             |
| ----------------- | ----------------------------------------------------------------- |
| `users`           | Better Auth; carries the `CUSTOMER`/`ADMIN` role                  |
| `customers`       | one per user                                                      |
| `orders`          | `refund_status` and `status` gate what the engine will allow      |
| `refund_requests` | `requested_amount_cents` and `approved_amount_cents` are separate |
| `audit_logs`      | append-only; no update or delete path exists                      |

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
  are re-screened before the policy engine runs.
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
