# AGENTS.md

Working notes for coding agents (and humans) changing this repo.

## After every change, run the linter and the build

This is the rule. Do not batch verification to the end of a task, and do not
report a change as done without it.

```bash
npm run lint    # eslint, correctness only
npm run build   # tsc for both packages, then vite
```

Both must exit 0. A change that only "looks right" is not finished:

- `npm run lint` catches unused imports, stray `any`, and broken React hook
  usage. The hook rules here are compiler-backed and have caught real bugs in
  this repo.
- `npm run build` typechecks `backend/src`, `backend/scripts`, and
  `frontend/src`. `backend/scripts` includes the seed and the 49-check e2e
  suite, which are easy to break silently.

If you changed formatting or imports, also run:

```bash
npm run format  # prettier --write; harmless on already-formatted files
```

### Full gate

```bash
npm run verify   # lint + format:check + typecheck + unit tests + build
```

Use this before handing work back, and whenever a change touches more than a
couple of files. It runs in well under a minute. It deliberately does **not**
include the e2e suite — see below.

### Tests

`npm test` runs 58 unit tests in under a second. They cover every policy rule
code, so they are the fastest possible signal that the money-moving logic is
still correct. The husky `pre-push` hook runs them, but run them yourself rather
than assuming the hook fired.

`npm run e2e` is a live HTTP suite against a running stack. It needs
`npm run up` and takes minutes, and it spends a rate-limited Gemini quota, which
is why it is not in any hook. Run it when you change controllers, the refund
service, the repository, or anything that moves money. `npm run reset:demo`
first, or scenarios collide on orders an earlier run consumed.

## Rules specific to this repo

- **The policy engine decides; the model does not.** Any change that lets model
  output influence `APPROVED` / `DENIED` / `ESCALATED` is wrong by definition.
  `backend/src/domain/refund-policy.service.ts` must stay free of I/O and of its
  own clock.
- **Money is integer cents.** No floats on an amount, ever.
- **`requested_amount_cents` and `approved_amount_cents` are different things.**
  They diverge by design; see `seed/policies/refund-policy.md` section 3.
- **Order lookups are always scoped to the session customer.** Never trust a
  client-supplied customer id.
- **Never add to `backend/seed/`.** It is deliberately in `.prettierignore`:
  that markdown is embedded into the vector store, so reformatting it would
  silently change what the RAG pipeline ingests.
- **Authorization is server-side.** The `useAuthGuard` in
  `frontend/src/routes/root.tsx` is UX only and must never become the only
  check.

## Commit messages

Conventional Commits, enforced by the `commit-msg` hook:

```
feat(backend): add approved amount column
fix(frontend): resolve session on mount
chore(deps): pin eslint to v10
```

Types: `feat fix docs style refactor perf test build ci chore revert`.
