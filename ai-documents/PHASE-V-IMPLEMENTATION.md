# Phase V — Implementation report

Consolidated summary of the 9 Phase V commits (V1.1 → V6.1 + V2.2) and
the 8-task Phase W activation layer that made them visible in the live
UI. Read this as the single landing doc for the post-Phase-U work.

## Status overview

| Phase | Status | Test count after | Commit |
|---|---|---|---|
| V2.1 — Milestones 4→10 | ✅ shipped | 1050 | `df90b0e` |
| V1.1 — AI cost + cache + rate-limit | ✅ shipped | 1082 | `3ee6fad` |
| V1.2 — Saudi legal templates + risky clauses | ✅ shipped | 1096 | `3407f1c` |
| V1.3 — AI Lead Scoring | ✅ shipped | 1110 | `aa4665f` |
| V3.1 + V3.2 — PostHog + admin analytics | ✅ shipped | 1120 | `1c3ad34` |
| V4.1 + V4.2 — Notifications rebuild + prefs + dispatcher | ✅ shipped | 1153 | `ebc479d` |
| V5.1–V5.3 — Blog CMS (Tiptap) | ✅ shipped | 1165 | `2115ee6` |
| V6.1 — Supplier KPI dashboard | ✅ shipped | 1175 | `5632c60` |
| V2.2 — Tag-invalidatable blog cache (cacheComponents deferred) | ✅ shipped | 1175 | `f2e3ca4` |
| W1 — Apply Phase V migrations | ✅ applied 2026-05-20 13:14 UTC via Management API | 1175 | bundle in `ai-documents/W-apply-all.sql`; log in `W1-MIGRATIONS-APPLIED.md` |
| W2 — Seed Phase V demo data | ✅ applied — `pnpm demo:reset --yes` produced clean state, 9 sections + 8 reviews | 1175 | extends `scripts/seed-demo.mjs` |
| W3 — `FF_AI_REAL` flag + guide | ✅ shipped | 1175 | bundled in W1 commit |
| W4 — Nav gaps + supplier notif mirror + agreement badge | ✅ shipped | 1175 | (W4 commit) |
| W5 — Trigger wiring verification | ✅ demo seed exercises every trigger path; all 4 Phase V mutations land cleanly | — | doc in `W5-TRIGGER-VERIFY.md` |
| W6 — Browser verification + 12 screenshots | ✅ 12/12 Playwright tests passed in 40.3s, screenshots in `ai-documents/W6-SCREENSHOTS/` | — | spec in `tests/e2e/w6-activation.spec.ts` |
| W7 — `pnpm demo:reset` Phase V-aware | ✅ shipped + verified end-to-end | 1175 | (W7 commit) |
| W8 — This document | ✅ updated post-activation | — | — |

## Per-phase summaries

### V1.1 — Per-user AI daily budget cap + scoring cache

Wraps the existing real-Anthropic `scoreProposal()` path with three
missing production layers:
- `ai_usage_log` (table, RLS admin-read) — one row per gateway call
  (user_id, op, tokens, cost_usd NUMERIC(10,6), model, request_id,
  cache_hit). Partial index `(user_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '7 days'`
  keeps the rate-limit lookup hot.
- `ai_score_cache` (SHA-256 keyed JSONB cache, 30-day TTL).
- `lib/ai/rate-limit.ts:assertDailyBudget(userId)` throws `RateLimitError`
  at `$1/user/day` (configurable via `AI_DAILY_BUDGET_USD`).
- New `AIFallback reason='rate_limited'` UI variant + Arabic copy.

### V1.2 — Saudi legal templates + risky-clause detection

Extends `analyzeAgreement()` to flag clauses deviating from Saudi
commercial-law norms. Adds:
- 5 Arabic templates in `lib/ai/legal-templates.ts` (escrow, payment
  terms, force majeure, Najiz dispute resolution, ZATCA VAT), marked
  `// TODO: legal-review`.
- `ai_risky_clauses JSONB` column on `agreements` (default `'[]'`).
- `<RiskyClauses>` panel in client agreement page with severity-coded
  chips (red/amber/blue).
- Cache key includes `TEMPLATE_VERSION` so a templates edit forces
  re-score.

### V1.3 — AI Lead Scoring

CRM-style "temperature" (`hot 🔥` / `warm 🟡` / `cold ❄`) per user.
Deterministic base score (0–100) from a rubric over `lead-signals.ts`;
AI narrative is opt-in and only runs on admin recompute (keeps batch
cost predictable). Includes:
- `lead_scores` table + `lead_category` enum.
- `/admin/leads` page with sortable table, signal chips, narrative
  tooltips, per-row "Recompute" button.
- `scripts/score-leads-nightly.mjs` (`pnpm score:leads`) — walks every
  non-admin profile, fires Resend email to admins on cold→hot
  transitions with 7-day debounce.

### V2.1 — Milestone celebrations 4 → 10

Adds 6 new `milestone_type` enum values (`first_proposal_received`,
`first_chat_opened`, `first_agreement_signed`, `first_escrow_funded`,
`first_project_completed`, `500k_gmv`, `1m_gmv`). Legacy `first_deal`
retained for back-compat. Wires server-side `safeAfter` triggers in
every relevant action path so milestones fire on real user flows, not
just on dashboard polling. GMV-tier fanout fires on escrow release.

### V2.2 — Tag-invalidatable blog cache

Wraps `lib/blog/queries.ts:{listPublishedPosts,getPostBySlug}` in
`unstable_cache` with the `blog-list` tag — the `revalidateTag('blog-list')`
already in `app/actions/blog.ts` (V5) now actually invalidates them.
**Deferred:** flipping `cacheComponents: true` globally. After
auditing 30+ authed pages that read `cookies` via the Supabase server
client, full adoption needs 5–7 days of dedicated effort. Design doc:
[`Phases/V2.2-caching.md`](./Phases/V2.2-caching.md).

### V3 — PostHog wiring + admin analytics dashboard

Two-file SDK split (`posthog-server.ts` + `posthog-browser.ts`) so the
client bundle never pulls `node:fs`/`node:async_hooks`. Reverse proxy
at `/api/posthog` dodges ad-blockers. `bucketAndCapture()` bridges the
FNV-1a A/B bucketer to PostHog with sessionStorage dedup. New
`/admin/analytics` page with funnel (visitor → first RFQ → first
milestone → escrow), 30-day DAU bar, top categories + city distribution.
PostHog blocks gracefully degrade to "configure" hints when no API key.

### V4 — Notifications rebuild + preferences + dispatcher

- New `/dashboard/notifications` page with 8 filter tabs (All /
  Unread / RFQs / Proposals / Chats / Payments / Reviews / System),
  Realtime `postgres_changes` subscription, bulk-select actions, sound
  ping (toggle).
- `notification_preferences` table — per-type email/in-app opt-out
  arrays, quiet-hours window (UTC), digest frequency, sound toggle.
  RLS owner-only.
- `lib/notifications/dispatch.ts` — SINGLE entry point that wraps
  `buildNotification` + prefs lookup + in-app insert + email send.
  Honors all prefs; supports `forceEmail` for urgent events.
- W4.2 added supplier-side mirror page at `/supplier/notifications`.

### V5 — Blog CMS (Tiptap)

- `blog_posts` table (bilingual ar/en title/excerpt/content + Tiptap
  HTML, cover_image storage path, GIN-indexed tags, status enum,
  computed reading_time). RLS: anon read published; admin write.
- `blog-images` Storage bucket (public read, admin write, 5 MB cap).
- `/admin/blog` list + new/edit pages. Bilingual side-by-side Tiptap
  editor (RTL Arabic + LTR English), cover image upload, tag chips,
  SEO accordion, draft/scheduled/published toggle.
- Public blog rewritten — pagination, tag filter, share buttons
  (X/LinkedIn/WhatsApp/copy), related posts (tag overlap), reading
  time, SEO metadata from new fields.
- `scripts/seed-blog.mjs` (`pnpm blog:seed`) migrates the 5 hardcoded
  articles into the table.

### V6 — Supplier KPI dashboard

`/supplier/dashboard` replaces the bare redirect-to-RFQs as the
approved-supplier landing. 6 KPI cards (total proposals lifetime +
month, acceptance rate, active projects, revenue YoY + delta%,
average rating, last-month revenue) + 4 recharts (monthly revenue
bars, category pie, win-rate-by-category bars, satisfaction line
chart). All 7 KPI queries fan out via `Promise.all`. RTL-aware
(reversed X axis when locale=ar).

### W3 — `NEXT_PUBLIC_FF_AI_REAL` flag

Single new flag added. When `false` (default), `scoreProposal()` +
`analyzeAgreement()` short-circuit and write clearly-marked `[mock]`
summaries instead of hitting the gateway. W2 seed pre-populates the
relevant cache + summary fields so the UI still renders meaningful
content. Flip to `true` once `AI_GATEWAY_API_KEY` is configured to
enable real Anthropic Claude Sonnet 4.6 spend (capped at $1/user/day
via V1.1). The 5 other flags proposed in the W plan were intentionally
NOT added — see [`PHASE-V-FLAG-GUIDE.md`](./PHASE-V-FLAG-GUIDE.md) for
why each was dropped.

## Migration apply log

| Migration | File | Applied at |
|---|---|---|
| V2.1 milestones_expand | `supabase/migrations/20260520000005_milestones_expand.sql` | ✅ 2026-05-20 13:14 UTC |
| V1.1 ai_usage_log | `20260520000006_ai_usage_log.sql` | ✅ 2026-05-20 13:14 UTC |
| V1.1 ai_score_cache | `20260520000007_ai_score_cache.sql` | ✅ 2026-05-20 13:14 UTC |
| V1.2 agreement_risky_clauses | `20260520000008_agreement_risky_clauses.sql` | ✅ 2026-05-20 13:14 UTC |
| V1.3 lead_scores | `20260520000009_lead_scores.sql` | ✅ 2026-05-20 13:14 UTC |
| V4.1 notification_filters | `20260520000010_notification_filters.sql` | ✅ 2026-05-20 13:14 UTC |
| V4.2 notification_preferences | `20260520000011_notification_preferences.sql` | ✅ 2026-05-20 13:14 UTC |
| V5.1 blog_posts | `20260520000012_blog_posts.sql` | ✅ 2026-05-20 13:14 UTC |
| V5.1 blog_images_bucket | `20260520000013_blog_images_bucket.sql` | ✅ 2026-05-20 13:14 UTC |
| V6.1 supplier_kpi_indexes | `20260520000014_supplier_kpi_indexes.sql` | ✅ 2026-05-20 13:14 UTC |

**Apply path:** add `SUPABASE_MANAGEMENT_TOKEN=sbp_...` to `.env.local`
(generated at <https://supabase.com/dashboard/account/tokens>) then
`pnpm exec node scripts/apply-phase-v-migrations.mjs`. Verifier:
`pnpm exec node scripts/verify-pending-migrations.mjs` — should turn
all 15 Phase V probes green + show 10 rows in the `_w_migrations_applied`
tracker.

Manual fallback: paste `ai-documents/W-apply-all.sql` (~430 lines, all
idempotency-guarded) into the Supabase SQL Editor → Run.

## Demo data composition (after W2 seed)

| Table | Row count | Marker |
|---|---|---|
| `user_milestones` | 7 (ahmed) | seed cleared `500k_gmv` to demo modal |
| `ai_usage_log` | 50 | `model = 'mock-seed'` |
| `ai_score_cache` | 10 | `hash LIKE 'mock-seed-%'` |
| `agreements.ai_risky_clauses` | 3 clauses on demo-esc agreement | seeded JSONB |
| `lead_scores` | 20 (3 hot / 8 warm / 9 cold) | `narrative LIKE '[mock]%'` for hot+warm; cold have null |
| `profiles` (synthetic for leads) | 15 | id pattern `00000000-0000-4000-8000-1234XXXX` |
| `notifications` (for ahmed) | 30 (9 unread) | timestamps spread back 7 days |
| `notification_preferences` | 3 (ahmed, supplier, admin) | one with quiet hours, one with digest |
| `blog_posts` (new from W2) | 3 (1 published / 1 scheduled / 1 draft) | `slug LIKE 'demo-w2-%'` |
| `blog_posts` (existing migrated) | 5 | from `pnpm blog:seed` |
| `rfqs` (W2.9 KPI history) | 30 | `rfq_number LIKE 'RFQ-W29-%'` |
| `proposals` (W2.9) | 30 (12 accepted) | `description LIKE '[w2.9-mock]%'` |
| `escrow_transactions` (released) | 8 | linked to W2.9 agreements |
| `reviews` (W2.9) | 25, avg ~4.6 stars | `written_review LIKE '[w2.9-mock]%'` |

## Outstanding decisions

1. **Real Anthropic API key** — when ready to flip `NEXT_PUBLIC_FF_AI_REAL=true`,
   add `AI_GATEWAY_API_KEY=...` to `.env.local`. The $1/user/day cap is
   in place. The hot-lead alert email will then be real text instead
   of the seeded `[mock]` narratives.
2. **V1.2 legal-templates review** — `// TODO: legal-review` tagged in
   `lib/ai/legal-templates.ts`. Need MoCI-licensed lawyer sign-off
   before production. Mocked seed data is fine for demo.
3. **V4.2 digest cron endpoint** — daily/weekly digest needs a Vercel
   Cron route at `/api/cron/notification-digest` (route shell exists
   but isn't wired to `vercel.json`). Per W plan, ask before adding.
4. **PostHog DSN** — `/admin/analytics` PostHog blocks degrade to
   "configure" hints until `POSTHOG_PROJECT_ID` + `POSTHOG_API_KEY` are
   set. Local-DB sections work without PostHog.
5. **V1.3 nightly batch runner** — `pnpm score:leads` is manual today.
   Vercel Cron or a GH Action would automate it. Default: manual until
   we have a real cron requirement.
6. **W6 real-time tab test** — Playwright + Supabase Realtime in CI is
   flaky. The W6 spec doesn't try it; manual verification documented
   in [`W6-PHASE-V-VERIFIED.md`](./W6-PHASE-V-VERIFIED.md).

## Test users (seeded by `pnpm exec node scripts/seed-test-users.mjs`)

| Email | Password | Role |
|---|---|---|
| `ahmed.client.test@example.com` | `TestClient2026!` | client |
| `m.supplier.test@example.com` | `TestSupplier2026!` | supplier |
| `sara.admin.test@example.com` | `TestAdmin2026!` | admin |

## Quick-start URLs (after W1 + W2 land)

| Persona | URL | Surface |
|---|---|---|
| client | `/ar/dashboard` | CelebrationModal fires for `500k_gmv` |
| client | `/ar/dashboard/notifications` | V4.1 — 8 tabs, real-time, 30 seeded |
| client | `/ar/dashboard/notifications/preferences` | V4.2 |
| client | `/ar/dashboard/rfqs/<demo-esc>/agreement` | V1.2 + W4.3 |
| client | `/ar/blog` | V5.3 — 5 migrated + 1 W2 demo published |
| supplier | `/ar/supplier/dashboard` | V6 — 6 KPIs + 4 charts |
| supplier | `/ar/supplier/notifications` | W4.2 mirror |
| admin | `/admin/leads` | V1.3 — 20 leads, hot→cold |
| admin | `/admin/analytics` | V3 — funnel + DAU + categories |
| admin | `/admin/blog` | V5.2 — Tiptap editor |
| admin | `/admin/blog/new` | V5.2 |

## Known limitations

- **AI surfaces run on mocks** until `NEXT_PUBLIC_FF_AI_REAL=true` +
  gateway key. The risky-clauses panel, leaderboard narratives, and
  score-cache entries are all pre-populated; live scoring on new
  proposals writes `[mock]` summaries in this mode.
- **PostHog charts** degrade to "configure" placeholders without an
  API key (page itself still renders, local-DB sections work).
- **Sentry** stays no-op without DSN (existing behavior).
- **Resend** stays in dev-mode log without `RESEND_API_KEY` (existing).
- **Notification ping** is a 11 KB inline-generated WAV (250 ms
  two-tone). Replace at `public/sounds/notification.wav` if a
  custom asset is needed.

## Recommended next steps (post-W activation)

1. **Apply migrations** — provide `SUPABASE_MANAGEMENT_TOKEN`, run
   `pnpm exec node scripts/apply-phase-v-migrations.mjs`, then
   `pnpm db:types && pnpm demo:reset --yes`.
2. **Walk every surface as each persona** (~30 min) using the URL
   matrix above. Run `pnpm exec playwright test tests/e2e/w6-activation.spec.ts`
   to capture 12 screenshots into `ai-documents/W6-SCREENSHOTS/`.
3. **Provision real services** in order of impact:
   - Anthropic API key → flip `FF_AI_REAL=true`.
   - PostHog project + API key → `/admin/analytics` becomes real-time.
   - Verified Resend domain → email fanout becomes real.
4. **Legal review** on `lib/ai/legal-templates.ts` before production.
5. **V2.2 follow-up sprint** — full `cacheComponents: true` adoption.
   Estimate 5–7 days; doc in `Phases/V2.2-caching.md`.

## Cross-links

- Migration apply: [`W1-MIGRATIONS-APPLIED.md`](./W1-MIGRATIONS-APPLIED.md) (created at apply time)
- Flag guide: [`PHASE-V-FLAG-GUIDE.md`](./PHASE-V-FLAG-GUIDE.md)
- Trigger verify: [`W5-TRIGGER-VERIFY.md`](./W5-TRIGGER-VERIFY.md)
- Browser verify: [`W6-PHASE-V-VERIFIED.md`](./W6-PHASE-V-VERIFIED.md)
- Migration bundle: [`W-apply-all.sql`](./W-apply-all.sql)
- V2.2 design doc: [`Phases/V2.2-caching.md`](./Phases/V2.2-caching.md)
- Phase U U6 verified (pre-V state): [`UI-ACTIVATION-VERIFIED.md`](./UI-ACTIVATION-VERIFIED.md)
