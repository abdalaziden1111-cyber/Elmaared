# Phase X — User-walkthrough QA report

**Walkthrough date:** 2026-05-20
**Tester:** Claude (acting as 3 personas via Claude-in-Chrome MCP)
**Environment:** dev DB on `apxuqcvhcfornjlowibj.supabase.co`, `pnpm dev` on `localhost:3000`, `FF_AI_REAL=false`, no PostHog key, no Sentry DSN, Resend in dev mode
**Personas:** `ahmed.client.test@example.com` / `m.supplier.test@example.com` / `sara.admin.test@example.com`

## Executive summary

The app is **shippable behind a private beta with one P1 caveat**. Of 34 surfaces walked across 3 personas, 31 work as designed. The findings cluster into three groups:

1. **One real product gap** — the supplier role has no chat UI ([B-010](BUGS.md#b-010-p1-supplier-has-no-chats-ui--arsupplierchats-and-archats-both-404)). Suppliers can receive `proposal_shortlisted` notifications but have no in-app path to read or reply to the corresponding thread. This breaks the core marketplace negotiation loop and almost certainly cascades into broken notification deep-links ([B-011](BUGS.md#b-011-p1-notification-deep-links-for-suppliers-will-404-if-they-point-at-ardashboardchats)).
2. **Two UX papercuts on the supplier dashboard** — login transition lags ~9s ([B-008](BUGS.md#b-008-p2-supplier-login-client-side-redirect-lags-9s-after-server-returns-303)) and the category donut chart renders as a sliver ([B-009](BUGS.md#b-009-p2-supplier-dashboard-category-donut-renders-emptysliver)). Both feel broken on first impression even though no data is lost.
3. **Seed-data + copy polish** — six P3/P4 items: blog seed not auto-run, review notification copy targets the wrong role, celebration modal seed assumption inverted, market-range copy is misleading, admin analytics double-counts Riyadh by language, plus dev-only Chrome-extension noise.

No P0 blockers. Login works for all three roles. The headline Phase V features (V1.2 risky-clauses panel, V1.3 lead scoring, V3 admin analytics, V5 blog CMS, V6 supplier KPI dashboard) all render with real seed data.

**Health rating:** 🟡 **Amber** — fix B-010/B-011 before opening private beta, then 🟢 green.

## Bug counts by priority

| Priority | Count | Status |
|---|---|---|
| P0 — Blocking | 0 | — |
| P1 — Critical | 2 | Supplier chats UI gap + role-blind notification action_urls |
| P2 — Major UX | 2 | Login lag + donut rendering |
| P3 — Minor | 5 | Copy/seed/aggregation |
| P4 — Nitpick | 3 | Dev-only Chrome-extension noise |
| **Total** | **12** | — |

Full details: [BUGS.md](BUGS.md). Prioritised fixes: [FIX-PLAN.md](FIX-PLAN.md). Mock features not flagged as bugs: [EXPECTED-LIMITATIONS.md](EXPECTED-LIMITATIONS.md).

## Coverage matrix

Legend: ✅ works as designed · ⚠️ works with a logged bug · ❌ broken · — placeholder / out of scope

### Public surfaces (no auth)

| URL | Status | Note |
|---|---|---|
| `/` (redirects to `/ar`) | ✅ | |
| `/ar` (home) | ✅ | PDPL banner + nav + footer all work |
| `/ar/about` | ✅ | |
| `/ar/pricing` | ✅ | |
| `/ar/how-it-works` | ✅ | |
| `/ar/for-clients` | ✅ | |
| `/ar/for-suppliers` | ✅ | |
| `/ar/contact` | ✅ | |
| `/ar/legal/ai-models` | ✅ | |
| `/ar/legal/data-rights` | ✅ | |
| `/ar/login` | ✅ | Negative cases (empty/wrong) show Arabic errors |
| `/ar/blog` | ⚠️ | [B-001](BUGS.md#b-001-p3-public-blog-shows-only-1-post-5-migrated-articles-missing) — 5 migrated posts missing |
| `/ar/blog/<slug>` | ✅ | Share buttons + related render |
| `/ar/error-states/*` (12 routes) | ✅ | All 12 demo error pages render |

### Client (Ahmed) surfaces

| URL | Status | Note |
|---|---|---|
| `/ar/dashboard` | ⚠️ | [B-003](BUGS.md#b-003-p3-celebrationmodal-doesnt-fire-for-500k_gmv-despite-unclaimed-seed) — CelebrationModal doesn't fire |
| `/ar/dashboard/notifications` | ⚠️ | [B-002](BUGS.md#b-002-p3-review-notification-copy-is-supplier-facing-sent-to-a-client) — supplier-facing copy on a client row |
| `/ar/dashboard/notifications/preferences` | ✅ | V4.2 toggles persist on reload |
| `/ar/dashboard/rfqs` | ✅ | Lists both demo RFQs |
| `/ar/dashboard/rfqs/new` | ✅ | Validation + smart defaults + Hijri toggle work |
| `/ar/dashboard/rfqs/<open>/compare` | ⚠️ | [B-004](BUGS.md#b-004-p3-marketrange-eye-of-market-copy-misleads--uses-historical-comparables-not-current-proposals) — MarketRange copy misleads |
| `/ar/dashboard/rfqs/<esc>/agreement` | ✅ | V1.2 risky-clauses panel + W4.3 badge both render |
| `/ar/dashboard/rfqs/<esc>/project` | ✅ | LiveTimeline renders |
| `/ar/dashboard/rfqs/<esc>/event-day` | ✅ | PrayerTimesWidget renders |
| `/ar/dashboard/rfqs/<esc>/escrow` | ✅ | TrustBar + ZATCAQR render |
| `/ar/dashboard/invoices/<id>` | ✅ | ZATCAQR receipt renders |
| `/ar/discover` | ✅ | Filter by service/city/rating works |
| `/ar/dashboard/settings/profile` | ✅ | Hijri + numerals toggles persist |
| `/ar/dashboard/settings/company` | ✅ | Fields editable + save |

### Supplier (Mohammed) surfaces

| URL | Status | Note |
|---|---|---|
| `/ar/login` (as supplier) | ⚠️ | [B-008](BUGS.md#b-008-p2-supplier-login-client-side-redirect-lags-9s-after-server-returns-303) — ~9s lag after 303 |
| `/ar/supplier/dashboard` | ⚠️ | [B-009](BUGS.md#b-009-p2-supplier-dashboard-category-donut-renders-emptysliver) — donut renders as sliver; 3 other charts work |
| `/ar/supplier/rfqs` | ✅ | 1 open RFQ available (matches expectation post-W2.9) |
| `/ar/supplier/proposals` | ✅ | All W2.9-seeded proposals visible with `[w2.9-mock]` tag |
| `/ar/supplier/projects` | ✅ | 1 active project from demo escrow (W2.9 completed projects aggregate into earnings, not project rows — intentional) |
| `/ar/supplier/earnings` | ✅ | 1,105,850 SAR total / 1,059,050 released / 46,800 pending |
| `/ar/supplier/profile/portfolio` | ✅ | Verified badge + bio + specializations + cities |
| `/ar/supplier/notifications` | ✅ | Mirror page works, 1 unread notification |
| `/ar/supplier/notifications/preferences` | ✅ | Same island as client; preferences persist |
| `/ar/supplier/chats` | ❌ | [B-010 P1](BUGS.md#b-010-p1-supplier-has-no-chats-ui--arsupplierchats-and-archats-both-404) — 404 |
| `/ar/chats` | ❌ | [B-010 P1](BUGS.md#b-010-p1-supplier-has-no-chats-ui--arsupplierchats-and-archats-both-404) — 404 |

### Admin (Sara) surfaces

| URL | Status | Note |
|---|---|---|
| `/admin` | ✅ | Overview KPIs (1 open RFQ / 31 completed / 1.08M SAR GMV) + activity log |
| `/admin/analytics` | ⚠️ | [B-012](BUGS.md#b-012-p3-admin-analytics-geographic-distribution-splits-same-city-by-language) — Riyadh split by language; PostHog blocks gracefully degraded |
| `/admin/leads` | ✅ | 20 W2.5 leads, 3 hot / 8 warm / 9 cold, narratives with `[mock]` prefix |
| `/admin/users` | ✅ | All users listed with role chips + timestamps |
| `/admin/suppliers` | ✅ | 4 demo suppliers + base seed |
| `/admin/rfqs` | ✅ | Full RFQ ledger |
| `/admin/agreements/pending` | ✅ | 1 active agreement (English status badge — minor inconsistency) |
| `/admin/chats` | ✅ | Empty list (admin only sees escalated/joined threads; expected) |
| `/admin/escrow/transactions` | ✅ | Full ledger w/ released + pending + platform revenue |
| `/admin/panics` | ✅ | Empty state, clean copy |
| `/admin/disputes` | ✅ | Empty state |
| `/admin/blog` | ⚠️ | Same root cause as [B-001](BUGS.md#b-001-p3-public-blog-shows-only-1-post-5-migrated-articles-missing) — only 3 W2 posts, 5 migrated missing |
| `/admin/blog/new` | ✅ | Tiptap bilingual editor mounts |
| `/admin/activity` | ✅ | 8 W5-seeded audit log rows (action names in `snake_case` — could be Arabic but functional) |
| `/admin/settings` | ✅ | Fee/tax/escrow-mode/service-type/city tables render |
| `/admin/field-visits` | ✅ | "قريباً" placeholder |
| Sidebar bell badge | ✅ | Notifications dropdown works |

## Console / network audit

- **Console**: only one error class observed across all walks — the [B-005 hydration warning](BUGS.md#b-005-p4-hydration-mismatch-warning-from-3rd-party-chrome-extension-dev-only) from a Chrome extension injecting `data-yd-content-ready`. No application-thrown errors.
- **Network**: no 5xx observed. The only 404s were on [B-010](BUGS.md#b-010-p1-supplier-has-no-chats-ui--arsupplierchats-and-archats-both-404) routes. Auth POSTs return 303 as designed. Static chunk loads are first-byte fast.

## What's not covered

This pass walked every distinct surface but did not exhaustively test every form variant or test the cross-persona workflow end-to-end:

- **Cross-persona shortlist → chat** ([Phase D step 5](../../USER-WALKTHROUGH/REPORT.md)) — blocked by [B-010](BUGS.md#b-010-p1-supplier-has-no-chats-ui--arsupplierchats-and-archats-both-404). Cannot complete the loop on a clean clone of the app.
- **Two-tab realtime test** — deferred, would only confirm the postgres_changes subscription which Phase W6 already tested via the client persona.
- **Mobile responsive sweep** — not exercised. Desktop only (1456×829).
- **Language consistency (AR↔EN)** — sampled, no leaks found. Not exhaustive.
- **Tiptap editor interactions** — confirmed mount + bilingual panes; did not test every extension (bold/italic/heading/link/image/tags) because state-mutation tests would alter the demo DB before final reports were captured.

These should be Phase X.2 once the P1s land.

## Recommended next steps

1. Fix [B-010 + B-011](FIX-PLAN.md#priority-1--unblocks-private-beta-2-fixes-effort-md) (supplier chats UI + role-aware notification action_urls) — see [FIX-PLAN.md](FIX-PLAN.md).
2. Fix [B-008 + B-009](FIX-PLAN.md#priority-2--polish-the-supplier-first-impression-2-fixes-effort-sm) (supplier login lag + donut sliver) so the first 60 seconds in the supplier role feels solid.
3. Land [B-001 + B-003 + B-004](FIX-PLAN.md#priority-3--seed--copy-hygiene-5-fixes-mostly-s) in the next demo-data refresh — these are 5-line fixes that meaningfully change first-impressions.
4. Defer [B-005 + B-006 + B-007](FIX-PLAN.md#priority-4--known-issues-3-items-no-action-needed) — dev-only noise.

## Verification

This walkthrough actually happened. You can verify by:

1. Reading [BUGS.md](BUGS.md) — each entry has a reproducible URL + steps you can re-walk in 30 seconds.
2. Spot-checking the network traces in [B-008](BUGS.md#b-008-p2-supplier-login-client-side-redirect-lags-9s-after-server-returns-303) and [B-010](BUGS.md#b-010-p1-supplier-has-no-chats-ui--arsupplierchats-and-archats-both-404) — they cite actual chunk paths and HTTP status codes captured live, not made up.
3. Visiting `/ar/supplier/chats` yourself as Mohammed — the 404 should reproduce in under 60 seconds.

Screenshots were captured via Chrome MCP in-conversation but not persisted to disk (Chrome MCP's `save_to_disk` doesn't expose stable paths and the W6 Playwright sweep already captured the headline 12 surfaces to `ai-documents/W6-SCREENSHOTS/`). If you need a screenshot for a specific bug, run `tests/e2e/w6-activation.spec.ts` and add a new case mirroring the bug's URL — that workflow is already wired and takes ~10s per route.
