# E2E Tests

Two tiers of Playwright specs live here:

| Tier | Specs | Needs |
|---|---|---|
| **smoke** | [route-smoke.spec.ts](./route-smoke.spec.ts) | Just a running build. ~75 cases, no DB. Runs in CI on every PR. |
| **journeys** | [journeys/*.spec.ts](./journeys/) | Seeded Supabase + service-role key. Tagged `@needs-db` and skipped without the env vars. ~25 cases. |

## Run locally

### Smoke only (fast, no DB)
```bash
pnpm test:e2e:no-db
```

### All specs (including journeys)
First seed the personas once:
```bash
pnpm node scripts/seed-test-users.mjs
```
That creates 3 users in your Supabase project: `ahmed.client.test@example.com`, `m.supplier.test@example.com`, `sara.admin.test@example.com`. Credentials are in [fixtures/personas.ts](./fixtures/personas.ts).

Then:
```bash
pnpm test:e2e
```

The auth fixture caches each persona's storage state in `tests/e2e/.auth/{role}.json` so subsequent runs skip the login form. Delete that folder to force a fresh login.

### Run a single journey
```bash
pnpm test:e2e tests/e2e/journeys/admin-oversight-flow.spec.ts
```

## CI

`.github/workflows/ci.yml` runs `e2e-smoke` (route-smoke + health endpoint contract) on every PR. The `@needs-db` journeys are skipped — they require a staging Supabase, which we don't expose to CI yet. Add a `preview-e2e` job pointing at a deployed staging URL with seeded personas when staging is ready.

## What each journey covers

- **[client-rfq-flow](./journeys/client-rfq-flow.spec.ts)** — login → dashboard → RFQs list → RFQ creator wizard step 1 + bell renders.
- **[supplier-discovery-flow](./journeys/supplier-discovery-flow.spec.ts)** — login → sidebar has 5 links → my-proposals filter visible → profile → edit (with documents section) → earnings summary cards.
- **[admin-oversight-flow](./journeys/admin-oversight-flow.spec.ts)** — login → sidebar 7 links → RFQs paginated → disputes 3 tabs → chats 4 filter tabs → bell on every page.
- **[role-guard-flow](./journeys/role-guard-flow.spec.ts)** — each persona tries the other roles' pages and gets bounced via middleware.
- **[notification-bell-flow](./journeys/notification-bell-flow.spec.ts)** — bell opens, dropdown shows, Escape closes, footer link present, renders in all 3 layouts.

## Adding new specs

1. New journey spec → `tests/e2e/journeys/`. Import from `../fixtures/auth` and tag the describe block `@needs-db`.
2. Smoke-style spec (no auth) → `tests/e2e/`.
3. If your spec mutates DB state, call the relevant `reset*` helper from [fixtures/db-reset.ts](./fixtures/db-reset.ts) in `beforeAll` so the test is rerunnable.

## Sentry — ready to activate

The error-capture scaffolding is in place. To turn it on:

1. **Provision a Sentry project** and add the DSN to `.env.local`:
   ```bash
   SENTRY_DSN=https://...@sentry.io/...
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```
2. **Install the package**:
   ```bash
   pnpm add @sentry/nextjs
   ```
3. **CI source-map upload** (optional): add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to GitHub Actions secrets.

No code changes after that. The instrumentation hooks pick up Sentry dynamically:

| File | Runs at | Behavior |
|---|---|---|
| [`instrumentation.ts`](../../instrumentation.ts) | server boot | If `SENTRY_DSN` + package installed → init Sentry + rewire `lib/utils/logger` so every `log.error()` / `log.warn()` forwards to Sentry. Otherwise no-op. |
| [`instrumentation-client.ts`](../../instrumentation-client.ts) | first browser render | If `NEXT_PUBLIC_SENTRY_DSN` + package installed → init client-side Sentry. Otherwise no-op. |

When the package is missing (current default), both hooks short-circuit and the app uses the console-based logger. Local dev needs zero setup.

Health endpoint [`/api/health`](../../app/api/health/route.ts) feeds Sentry uptime checks + Vercel monitors out of the box.
