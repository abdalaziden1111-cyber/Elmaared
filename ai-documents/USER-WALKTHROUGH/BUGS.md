# Phase X — User-walkthrough bugs

**Walkthrough started:** 2026-05-20 (running)
**Personas:** ahmed.client.test / m.supplier.test / sara.admin.test
**Environment:** dev DB on `apxuqcvhcfornjlowibj.supabase.co`, `FF_AI_REAL=false`

Bugs are added as discovered. Format per entry:

```
### B-NNN [P-rio] Short title
- **Persona:** client/supplier/admin/cross
- **URL:** /ar/...
- **Steps:** 1. … 2. … 3. …
- **Expected:** …
- **Actual:** …
- **Screenshot:** SCREENSHOTS/...
- **Console:** (if relevant)
- **Suggested fix:** …
```

## P0 — Blocking (app unusable)

_(none found)_

## P1 — Critical (feature broken)

### B-010 [P1] Supplier has no chats UI — `/ar/supplier/chats` and `/ar/chats` both 404
- **Persona:** supplier
- **URL:** `/ar/supplier/chats`, `/ar/chats`
- **Steps:** 1. Login as supplier 2. Navigate to either URL
- **Expected:** Supplier sees a list of chat threads for shortlisted proposals (mirror of client `/ar/dashboard/chats`)
- **Actual:** Next.js 404 page renders ("الصفحة غير موجودة. ربما تم نقلها أو حذفها"). Supplier sidebar nav doesn't include a "محادثات" link either, so the route was never created for the supplier role.
- **Impact:** Suppliers cannot reach chat threads from inside the app. When a client shortlists their proposal, the client gets a chat link but the supplier has no inbound nav path — they can only land in a thread via direct URL or notification deep-link. This breaks the core marketplace negotiation loop.
- **Cause:** W4.2 wired the supplier notifications mirror at `app/[locale]/supplier/notifications/` but the parallel `app/[locale]/supplier/chats/` route was not added. Client uses `app/[locale]/dashboard/chats/` which is gated to the `client` role.
- **Suggested fix:** create `app/[locale]/supplier/chats/page.tsx` that reuses the same `<ChatsClient>` island as the client side, scoped by supplier_id. Add "محادثات" link to `components/supplier/Sidebar.tsx`. Verify thread RLS allows both participants.

### B-011 [P1] Notification deep-links for suppliers will 404 if they point at `/ar/dashboard/chats/...`
- **Persona:** supplier
- **URL:** any supplier notification with action_url under `/ar/dashboard/...`
- **Steps:** 1. As supplier, click a notification whose action_url is set by the client-side dispatcher (e.g. `proposal_shortlisted` → `/ar/dashboard/chats/<thread-id>`)
- **Expected:** Navigates to the supplier chat thread
- **Actual:** Lands on `/ar/dashboard/chats/<id>` which is a client-only route → either 404 or RLS-denied empty state for a supplier session
- **Cause hypothesis:** the notification dispatcher (`lib/notifications/dispatch.ts` or similar) builds a single action_url per notification regardless of recipient role. Once B-010 is fixed, the dispatcher needs to route suppliers to `/ar/supplier/chats/<id>` and clients to `/ar/dashboard/chats/<id>`.
- **Suggested fix:** introduce a `roleAwareActionUrl(recipientRole, kind, entityId)` helper and use it everywhere notifications are inserted. Add an e2e test that confirms a `proposal_shortlisted` notification points at the right path per role.


## P2 — Major (UX degraded)

### B-008 [P2] Supplier login: client-side redirect lags ~9s after server returns 303
- **Persona:** supplier
- **URL:** `/ar/login`
- **Steps:** 1. Fill m.supplier.test@example.com + TestSupplier2026! 2. Click "تسجيل الدخول"
- **Expected:** Within ~1–2s, page transitions to `/ar/supplier/dashboard` (per Phase A this is what happens for the client persona)
- **Actual:** POST /ar/login returns 303 immediately, supplier route chunks (`app_[locale]_supplier_layout_tsx_*.js`, `_loading_tsx`, `_page_tsx`) begin downloading right after — but the button stays in pending state with a spinner for ~9 seconds before the URL bar actually flips to `/ar/supplier/dashboard`. During the wait the user sees no feedback that anything is happening server-side; appears frozen.
- **Network trace (Chrome MCP):**
  ```
  POST /ar/login → 303 (server-side redirect)
  GET  /_next/static/chunks/app_[locale]_supplier_layout_tsx_*.js → 200
  GET  /_next/static/chunks/app_[locale]_supplier_loading_tsx_*.js → 200
  GET  /_next/static/chunks/app_[locale]_supplier_page_tsx_*.js → 200
  ```
- **Cause hypothesis:** the supplier dashboard layout/page chunks weren't preloaded (unlike client `/ar/dashboard` which is hit much more often during dev). First load of the supplier bundle is a cold transfer + parse, which dominates the post-303 transition. May also include Recharts client bundle (used by KPI dashboard) which is heavy.
- **Suggested fix:** add the supplier-area chunks to the login page's prefetch list (or use `router.prefetch('/ar/supplier/dashboard')` on the login page when the email field receives an `@example.com` matching a supplier pattern). Alternatively, render the loading skeleton from `<form>` action onSubmit so the user sees a route-level skeleton instead of the disabled button.

### B-009 [P2] Supplier dashboard category donut renders empty/sliver
- **Persona:** supplier
- **URL:** `/ar/supplier/dashboard`
- **Steps:** 1. Login as supplier 2. Scroll down past KPI cards
- **Expected:** "توزّع العروض حسب الفئة" donut chart shows 4 segments (أجنحة / فعاليات / مطبوعات / هدايا), matching the W6 verified screenshot
- **Actual:** Only a tiny stacked sliver of pixels (~50px wide) appears at the chart center. Legend labels (أجنحة / فعاليات / مطبوعات / هدايا) render below but no real donut. Other 3 charts on the same dashboard render correctly (revenue bars, satisfaction line, win-rate bars).
- **Hypothesis:** Recharts `<PieChart>` may be receiving `{ value: 0 }` for all segments (counts not aggregating, denominator 0) — or `outerRadius` is set in % and the container's flex-basis is collapsing to 0 width before resize observer fires. The W6 Playwright run captured a populated donut, so this is likely a viewport-dependent rendering race rather than a data bug.
- **Suggested fix:** wrap the donut in a `<ResponsiveContainer minWidth={200} minHeight={200}>` and verify `data` aggregation in `app/[locale]/supplier/dashboard/_data.ts`. Compare against the working W6 snapshot.

## P3 — Minor (cosmetic / misleading copy / seed gap)

### B-001 [P3] Public blog shows only 1 post (5 migrated articles missing)
- **Persona:** client + anonymous
- **URL:** `/ar/blog`
- **Steps:** 1. Visit /ar/blog after `pnpm demo:reset --yes`
- **Expected:** ≥6 posts (1 W2 demo published + 5 from migrated static articles)
- **Actual:** Only 1 post visible (the W2 demo)
- **Cause:** `pnpm blog:seed` (one-time migration of the 5 static articles) wasn't run as part of `demo:reset`. README documents it as a separate command but a first-time tester will see an empty-looking blog.
- **Suggested fix:** add `runScript('seed-blog.mjs')` to `scripts/demo-reset.mjs` OR call it from inside `seed-demo.mjs` so a single command produces the full demo state.

### B-002 [P3] Review notification copy is supplier-facing, sent to a client
- **Persona:** client
- **URL:** `/ar/dashboard/notifications`
- **Steps:** 1. Visit notifications page as Ahmed
- **Expected:** Review notification copy should be client-appropriate (e.g. "العميل قيّم مورد …" if it's a record-keeping ping, or omit entirely if reviews are supplier-side)
- **Actual:** Row reads "تقييم جديد وصلك — العميل قيّمك بـ 5 نجوم" — uses "قيّمك" (you were rated). Ahmed is a client and doesn't receive ratings.
- **Cause:** W2.6 seed inserted `type: 'system'` notifications with supplier-facing copy for Ahmed (since `notification_type` enum has no `review_received` value, the seed used `system` and the copy was modeled after a supplier perspective).
- **Suggested fix:** seed: only attach review notifications to supplier accounts, OR adjust copy to "العميل قيّم مورداً على طلبك" when the recipient is a client.

### B-003 [P3] CelebrationModal doesn't fire for `500k_gmv` despite unclaimed seed
- **Persona:** client
- **URL:** `/ar/dashboard`
- **Steps:** 1. Login as Ahmed first time after `demo:reset` 2. W2.1 seed left 500k_gmv NOT inserted (expecting modal to fire on next visit)
- **Expected:** CelebrationModal fires with `500k_gmv` celebration copy
- **Actual:** No modal fires. Dashboard renders directly.
- **Cause:** Two-layer issue:
  (a) The CelebrationGate likely checks `user_milestones` table for an unclaimed row, but a row only exists post-trigger (V2.1 fires `maybeFireMilestone` server-side on escrow release). Ahmed's GMV from released escrows doesn't actually reach 500k SAR (he has 1 released escrow worth 48k SAR via the demo:seed flow). So no insert was ever triggered → no row → no modal.
  (b) Plan's W2.1 assumption was wrong: it expected "unclaimed = absent row" but the modal logic expects "row exists + claimed_at IS NULL".
- **Suggested fix:** either INSERT an unclaimed `500k_gmv` row (with `claimed_at=null`) explicitly in the W2.1 seed, or update the plan to remove this expectation and instead seed a `first_proposal_received` row (which has a meaningful path).

### B-012 [P3] Admin analytics geographic distribution splits same city by language
- **Persona:** admin
- **URL:** `/admin/analytics`
- **Steps:** 1. Login as admin 2. Scroll to "التوزّع الجغرافي (RFQs حسب المدينة)"
- **Expected:** All RFQs in Riyadh aggregate under one row regardless of how the city name was stored
- **Actual:** Two rows: "الرياض — 2" and "Riyadh — 1". RFQs created with English city names bucket separately from Arabic ones, so admin sees inflated city counts and a partial picture of geographic concentration.
- **Cause:** the analytics aggregator likely does `GROUP BY city_name` on the raw `rfqs.city` column without normalisation. RFQ form stores the user-typed string verbatim.
- **Suggested fix:** add a canonical `city_code` column to RFQs (e.g. `RUH` for Riyadh) and either backfill or apply a normalisation lookup when aggregating. Cheap interim fix: case-insensitive Arabic↔English city alias table in the aggregator.

### B-004 [P3] MarketRange "Eye of Market" copy misleads — uses historical comparables, not current proposals
- **Persona:** client
- **URL:** `/ar/dashboard/rfqs/<open-rfq>/compare`
- **Steps:** 1. Open compare page for an RFQ that already has 5 proposals
- **Expected (per copy):** Banner "سنعرض النطاق فور تجمّع 4 عروض أو أكثر" implies the threshold counts current RFQ proposals, so with 5 proposals the range should show
- **Actual:** Banner still says "لا توجد بيانات سوقية كافية بعد لهذه الفئة" — because the threshold checks historical comparable proposals across the platform (last 12 months, same service_type), which is empty in the demo
- **Suggested fix:** rewrite the copy to be honest: "نحتاج 4 عروض تاريخية على فئات مشابهة لرسم نطاق سوقي موثوق" — and consider showing a different message when current RFQ has ≥4 proposals but historical data is empty.

## P4 — Nitpick (polish opportunity)

### B-005 [P4] Hydration mismatch warning from 3rd-party Chrome extension (dev-only)
- **Persona:** all
- **URL:** any page
- **Steps:** 1. Open dev console
- **Actual:** React logs hydration mismatch for `data-yd-content-ready="true"` attribute injected by a browser extension before React hydrates
- **Cause:** Chrome extension (likely YouTube Downloader or similar) injects DOM before React. Not our bug.
- **Suggested fix:** none — document in known-issues. Production users without such extensions won't see this.

### B-006 [P4] 3rd-party "Lushe" floating widget visible on marketing pages
- **Persona:** anonymous
- **URL:** `/ar/for-suppliers`, `/ar/how-it-works`, `/ar/pricing`, `/ar/contact`, `/ar/blog`, `/ar/legal/*`
- **Actual:** A "Lushe" floating widget appears on the right side of these pages
- **Cause:** Either intentional 3rd-party customer-support widget OR another Chrome extension injection
- **Suggested fix:** verify if intentional. If yes, document. If no, isolate the extension or block the script.

### B-007 [P4] Next.js dev-overlay "1 Issue" badge persistent in bottom-left
- **Persona:** all (dev only)
- **URL:** any page
- **Actual:** "1 Issue" red pill in bottom-left throughout the walkthrough
- **Cause:** Next.js dev overlay reflecting the hydration mismatch from B-005
- **Suggested fix:** none — dev-only, will disappear in `pnpm build && pnpm start`.

## Phase A summary

Walked 12 public + 8 authed surfaces as Ahmed. No P0/P1/P2 bugs. 7 P3/P4 findings — mostly seed-data gaps + misleading copy + 3rd-party extension noise. Headline V1.2 risky-clauses panel and W4.3 badge both work as designed. Login flow + validation + tab filtering + RFQ list all green.

## Phase B summary

Walked 9 supplier surfaces as Mohammed. **2 P1 findings (supplier chats route 404 + role-blind notification deep-links)**, 2 P2 (login lag + donut chart broken), no P3/P4 new findings. KPI dashboard renders (33 proposals / 58.3% acceptance / 4.8★ / ~1M SAR GMV) but the W6 Playwright pass was apparently captured at a viewport that hid B-009. The supplier role's notifications mirror works, proposals/projects/earnings/profile all render with W2.9 seed data visible.

## Phase C summary

Walked 13 admin surfaces as Sara. 1 P3 new finding (B-012 geographic dedup). All other surfaces healthy: leads (20 sorted hot→warm→cold with [mock] narratives), analytics (PostHog blocks gracefully degrade), users / suppliers / RFQs / agreements pending / chats / escrow ledger (1,082,495 SAR / 23,445 SAR platform revenue / 10 deals) / panics / disputes / activity log / settings / blog admin / Tiptap new-post editor / field-visits placeholder — all green. Status badges show a small consistency gap: "active" agreement status is in English while sibling badges are Arabic.

## Phase D summary (abbreviated)

Cross-persona shortlist→chat workflow blocked by B-010 (supplier has no chats UI). Two-tab realtime test deferred — would require both client and supplier sessions and the workflow that fires a self-notification cannot be exercised when the chat surface is missing on the supplier side. Language consistency sweep deferred — no English↔Arabic leaks observed during the persona walks themselves; the only mixed-language strings found are intentional (action_type slugs in `/admin/activity`, `evidence-only` enum value in `/admin/settings`).

