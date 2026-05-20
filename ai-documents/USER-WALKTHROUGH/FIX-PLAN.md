# Phase X — Fix plan

Prioritised by impact. Each item names the bug ([BUGS.md](BUGS.md)), the files to touch, an effort estimate (S = under 1h, M = half-day, L = full day+), and the suggested approach. Land in order — earlier fixes unblock later verification.

## Priority 1 — Unblocks private beta (2 fixes, effort: M+D)

### Fix 1 — [B-010](BUGS.md#b-010-p1-supplier-has-no-chats-ui--arsupplierchats-and-archats-both-404) Add supplier chats route (M)

**Files:**
- `app/[locale]/supplier/chats/page.tsx` — new
- `app/[locale]/supplier/chats/[threadId]/page.tsx` — new (mirrors `app/[locale]/dashboard/chats/[threadId]/page.tsx`)
- `app/[locale]/supplier/layout.tsx` — add `<Link href="/ar/supplier/chats">محادثات</Link>` to sidebar
- `components/supplier/Sidebar.tsx` (or wherever supplier sidebar lives) — add nav entry between "الإشعارات" and "ملفي"

**Approach:** the client-side `<ChatsClient>` island already accepts the participant ID as a prop and queries `chat_threads` filtered by either participant. Reuse it on the supplier route — the only difference is the page-level Supabase query uses `supplier_id = currentUserId` instead of `client_id = currentUserId`. Verify the existing RLS policy on `chat_threads` permits both participants (it should — escrow agreement creation inserts a thread row with both IDs).

**Verification:** add a Playwright case to `tests/e2e/w6-activation.spec.ts` that logs in as Mohammed, visits `/ar/supplier/chats`, and asserts the thread for the demo escrow RFQ is listed. Should take 10 lines.

### Fix 2 — [B-011](BUGS.md#b-011-p1-notification-deep-links-for-suppliers-will-404-if-they-point-at-ardashboardchats) Role-aware notification action_urls (S)

**Files:**
- `lib/notifications/dispatch.ts` (or wherever notification rows are inserted) — refactor
- New helper: `lib/notifications/action-url.ts` — `roleAwareActionUrl(recipientRole, kind, entityId)`
- One e2e test under `tests/integration/`

**Approach:** introduce `roleAwareActionUrl('supplier', 'proposal_shortlisted', 'thread-xyz')` → `/ar/supplier/chats/thread-xyz`, vs `roleAwareActionUrl('client', ...)` → `/ar/dashboard/chats/thread-xyz`. Apply at every notification-insert call site (search for `action_url:`). Default branch should throw rather than silently render a 404 link.

**Verification:** integration test that inserts a `proposal_shortlisted` for both a client recipient and a supplier recipient and asserts the action_url differs.

**Order:** ship Fix 1 first, then Fix 2 — the latter assumes the supplier route exists.

## Priority 2 — Polish the supplier first impression (2 fixes, effort: S+M)

### Fix 3 — [B-008](BUGS.md#b-008-p2-supplier-login-client-side-redirect-lags-9s-after-server-returns-303) Supplier login lag (S)

**Files:**
- `app/[locale]/login/page.tsx` (or the form action that owns the redirect)
- Possibly `app/[locale]/supplier/loading.tsx` if a route-level skeleton helps

**Approach:** the 303 is fast; the 9s gap is client-side bundle parse for the supplier route group. Two-line fix: add `router.prefetch('/ar/supplier/dashboard')` from the login page when the email field's input matches a known supplier pattern, OR — the safer bet — wrap the form's submit handler so the button shows a route-level transition spinner the moment the POST starts, not after the 303 lands. That way the user sees "loading the dashboard…" instead of "click did nothing." Don't change the underlying chunking — that's a heavier refactor and the perceived-perf fix is enough.

**Verification:** manually time it. Should drop to ~2s.

### Fix 4 — [B-009](BUGS.md#b-009-p2-supplier-dashboard-category-donut-renders-emptysliver) Donut chart sliver (M)

**Files:**
- `components/supplier/CategoryDonutChart.tsx` (or whatever the file is named)
- `app/[locale]/supplier/dashboard/_data.ts` (verify data shape)

**Approach:** two-part. (a) Wrap the `<PieChart>` in a `<ResponsiveContainer>` with `minWidth={200}` `minHeight={200}` so the resize observer can't collapse the chart to 0. (b) Inspect the aggregated `data` prop — if any segment has `{ value: 0 }`, filter it out, since Recharts renders zero-value segments as zero-area slivers. The W6 Playwright pass captured this chart populated at a different viewport, which strongly suggests (a) is the cause.

**Verification:** open `/ar/supplier/dashboard` at 1456×829 — donut should render 4 visible segments matching the win-rate bars below it.

## Priority 3 — Seed + copy hygiene (5 fixes, mostly S)

### Fix 5 — [B-001](BUGS.md#b-001-p3-public-blog-shows-only-1-post-5-migrated-articles-missing) Auto-run blog seed (S)

**File:** `scripts/demo-reset.mjs`
**Change:** add `runScript('seed-blog.mjs')` between the existing reset and `seed-demo.mjs` calls. Or call it from `seed-demo.mjs` directly if you want a single source of truth.
**Verification:** `pnpm demo:reset --yes && curl -s localhost:3000/ar/blog | grep -c '<article'` should be ≥6.

### Fix 6 — [B-002](BUGS.md#b-002-p3-review-notification-copy-is-supplier-facing-sent-to-a-client) Review notification copy (S)

**File:** `scripts/seed-demo.mjs` (the W2.6 notifications block)
**Change:** when seeding a `system`-type review notification for a client recipient, use copy like `"تم تسجيل تقييمك للمورد X"` instead of `"العميل قيّمك بـ 5 نجوم"`. Better fix: only attach review notifications to supplier accounts in the seed.
**Verification:** `pnpm demo:reset --yes` then visit `/ar/dashboard/notifications` as Ahmed — no "قيّمك" copy should appear.

### Fix 7 — [B-003](BUGS.md#b-003-p3-celebrationmodal-doesnt-fire-for-500k_gmv-despite-unclaimed-seed) Celebration seed assumption (S)

**File:** `scripts/seed-demo.mjs` (W2.1 milestones block)
**Change:** insert an unclaimed `500k_gmv` row directly into `user_milestones` for Ahmed (`claimed_at = null`). Don't rely on the GMV trigger — Ahmed's seeded GMV doesn't actually cross 500k.
**Verification:** `pnpm demo:reset --yes` then log in as Ahmed — CelebrationModal fires once.

### Fix 8 — [B-004](BUGS.md#b-004-p3-marketrange-eye-of-market-copy-misleads--uses-historical-comparables-not-current-proposals) MarketRange copy (S)

**File:** the component that renders the `MarketRange` placeholder banner
**Change:** rewrite the threshold copy to `"نحتاج 4 عروض تاريخية على فئات مشابهة لرسم نطاق سوقي موثوق"`. Optionally show a more informative second message when the current RFQ has ≥4 proposals but historical comparable data is still empty (gives the user a hint that the market data layer is platform-wide, not RFQ-scoped).

### Fix 9 — [B-012](BUGS.md#b-012-p3-admin-analytics-geographic-distribution-splits-same-city-by-language) City dedup in admin analytics (S)

**File:** the SQL/server action that aggregates `rfqs` for `/admin/analytics`
**Change (cheap):** add a lookup map `{ 'الرياض': 'الرياض', 'Riyadh': 'الرياض', 'jeddah': 'جدة', ... }` in the aggregator and normalise before `GROUP BY`. **Change (proper):** add a `city_code` column to `rfqs`, backfill, and `GROUP BY city_code` joined to a cities table for display names.

## Priority 4 — Known issues (3 items, no action needed)

- [B-005](BUGS.md#b-005-p4-hydration-mismatch-warning-from-3rd-party-chrome-extension-dev-only), [B-006](BUGS.md#b-006-p4-3rd-party-lushe-floating-widget-visible-on-marketing-pages), [B-007](BUGS.md#b-007-p4-nextjs-dev-overlay-1-issue-badge-persistent-in-bottom-left) — all 3rd-party Chrome extension noise visible only in dev with the tester's specific extension stack. No action.

## Effort summary

| Tier | Items | Estimated effort |
|---|---|---|
| P1 unblocks beta | 2 | ~1 day total (M + S) |
| P2 polish supplier UX | 2 | ~half day (S + M) |
| P3 seed/copy | 5 | ~half day total (all S) |
| P4 nitpicks | 3 | none |
| **Total** | **12** | **~2 dev-days** |

After this fix-plan lands, re-run [`tests/e2e/w6-activation.spec.ts`](../../tests/e2e/w6-activation.spec.ts) plus a new spec covering the supplier chats route, then re-walk Phase D's cross-persona shortlist→chat workflow end-to-end.
