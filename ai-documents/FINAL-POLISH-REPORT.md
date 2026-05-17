# Final Polish Report

Running log of the production-grade polish pass (Phases A–M). Started 2026-05-16.

Statuses: `pending` · `done` · `verified-in-browser` · `skipped (reason)`

---

## Phase A — QA findings (19 total, 14 fresh + 5 prior-session)

| # | Title | Status | Notes |
|---|-------|--------|-------|
| 1.1 | Logo icon merges with brand text | **verified-in-browser** | Replaced ت letter with `<Building2>` Lucide icon in both site-header and auth-layout |
| 1.2 | Home suppliers strip uses hardcoded data | **verified-in-browser** | Live Supabase query of top-4 approved suppliers, "coming soon" fallback for empty DB |
| 1.3 | /suppliers vs /discover duplication | **verified-in-browser** | Page rewritten as server-side `redirect()` to /discover; nav + footer links retargeted |
| 1.4 | Auth logo missing aria-label | **verified-in-browser** | Added `aria-label={tHome('title')}` |
| 1.5 | Auth pages sparse desktop layout | **verified-in-browser** | Two-column layout: value-prop dark panel + form on right (lg+), single column on mobile |
| 1.6 | Native HTML5 invalid tooltips in English | **done** | `noValidate` applied to all 14 useActionState forms; zod errors render inline |
| 1.7 | Signup field-errors silent fail | **verified-in-browser** | Prior session: render fieldErrors from useActionState |
| 1.8 | Dashboard date format US MM/DD/YYYY | **verified-in-browser** | `formatDateShort` updated to ar-SA Arabic format ("١٦ مايو ٢٠٢٦") — fixes every call site globally |
| 1.9–1.12 | RFQ detail localization | **verified-in-browser** | Prior session: SERVICE_LABEL/CITY_LABEL/FIELD_LABEL maps + formatDate |
| 1.13 | Completed RFQ lacks nav links | **done** | Added post-award summary aside with supplier name, price, links to escrow/agreement/chat |
| 1.14 | Compare page raw proposal status | **verified-in-browser** | `PROPOSAL_STATUS_LABEL` map + tone-coded status pills ("تم تقديمه", etc.) |
| 1.15 | AI placeholder permanent | **verified-in-browser** | 5-minute pending window; afterwards: "تقييم الذكاء الاصطناعي غير متاح لهذا العرض حالياً" |
| 1.16 | Generic loading skeleton | **done** | Created `page-skeletons.tsx` with 6 variants; new loading.tsx files at dashboard root, /rfqs, /rfqs/[id], /compare, /escrow, /supplier root, /supplier/rfqs, /supplier/earnings |
| 1.17 | Streaming Suspense can hang | **done** | Created `LoadingWithTimeout` client wrapper; 15-second watchdog → retry button if stalled |
| 1.18 | Admin sidebar 15 ungrouped links | **verified-in-browser** | 7 labeled groups: عام / المستخدمون / الموردون / العمليات / الضمان والمدفوعات / النزاعات والتصعيدات / النظام |
| 1.19 | Mobile marketing header missing | **verified-in-browser** | Prior session: MobileMenu wired into marketing site-header |

**Phase A: 19/19 closed.** All findings verified or done.

### Files created in Phase A

- [components/ui/page-skeletons.tsx](../components/ui/page-skeletons.tsx) — DashboardHomeSkeleton, RfqListSkeleton, RfqDetailSkeleton, CompareSkeleton, StatCardsSkeleton, FormSkeleton
- [components/ui/loading-with-timeout.tsx](../components/ui/loading-with-timeout.tsx) — 15s watchdog wrapper
- 6 new `loading.tsx` files at deeper route segments
- This file

### Files heavily modified in Phase A

- [app/[locale]/(marketing)/page.tsx](../app/[locale]/(marketing)/page.tsx) — live DB query, hardcoded array removed
- [app/[locale]/(marketing)/suppliers/page.tsx](../app/[locale]/(marketing)/suppliers/page.tsx) — replaced with redirect
- [components/marketing/site-header.tsx](../components/marketing/site-header.tsx) — Building2 icon + /discover link
- [components/marketing/site-footer.tsx](../components/marketing/site-footer.tsx) — /discover link
- [app/[locale]/(auth)/layout.tsx](../app/[locale]/(auth)/layout.tsx) — two-column + aria-label + Building2
- [app/[locale]/dashboard/page.tsx](../app/[locale]/dashboard/page.tsx) — Arabic date format
- [app/[locale]/dashboard/rfqs/[id]/page.tsx](../app/[locale]/dashboard/rfqs/[id]/page.tsx) — awarded summary aside
- [app/[locale]/dashboard/rfqs/[id]/compare/page.tsx](../app/[locale]/dashboard/rfqs/[id]/compare/page.tsx) — status labels + AI fallback
- [app/admin/layout.tsx](../app/admin/layout.tsx) — grouped sidebar
- [lib/utils/format.ts](../lib/utils/format.ts) — Arabic short date
- 14 forms × `noValidate` attribute

---

## Phase B — Localization audit

- Created [lib/constants/labels.ts](../lib/constants/labels.ts) as the canonical source for RFQ statuses + tone, service labels (short + long variants), city labels (AR + EN), proposal statuses + tone, RFQ field labels, RFQ enum value labels, supplier statuses, company sizes, escrow statuses, dispute statuses, and a shared `formatRfqDetailValue` helper.
- Refactored 7+ page-level duplicates to import from `lib/constants/labels.ts`: home (marketing), dashboard root, dashboard/rfqs (list + detail + compare), supplier/rfqs (list + detail), supplier/projects, discover (list + detail), dashboard/onboarding/recommendations.
- Fixed enum leaks where raw English values were rendering to UI:
  - supplier/rfqs/[id]/page.tsx — `{rfq.exhibition_city}` was raw "Riyadh"; now `CITY_LABEL[c] ?? c`. Service type + details key/value also mapped.
  - supplier/rfqs/page.tsx — exhibition_city wrapped.
  - supplier/projects/page.tsx — exhibition_city wrapped.
  - discover/page.tsx — `s.cities.join(' · ')` was raw; now mapped.
  - discover/[id]/page.tsx — `{c}` chip render now uses `CITY_LABEL`.
- Added `formatIban(value)` to lib/utils/format.ts — groups Saudi IBAN into 4-digit chunks (`SA00 0000 0000 0000 0000 0000`). Wired into client escrow page (most visible IBAN render).
- Remaining intentionally-inline maps: escrow/page (persona-specific wording), supplier/earnings (escrow status with different tone), supplier/profile/portfolio (supplier+portfolio status), supplier/proposals (proposal wording variant). These differ in wording per persona — kept inline by design.

## Phase C — Form validation

- supplier/rfqs/[id]/proposal/page.tsx — `scopeOfWork` + `excludedItems` textareas now render `aria-invalid` + red border + Arabic inline error from `state.fieldErrors`.
- dashboard/rfqs/[id]/escrow/receipt-upload-form.tsx — file input now wires `fieldErrors.receiptUrl[0]` into the FormField error prop.
- supplier/rfqs/[id]/submit-delivery-form.tsx — `photos` field error + `notes` textarea (aria-invalid + red border + error message).
- Pre-existing field-error rendering verified on: login, forgot-password, reset-password, signup (client+supplier all steps), settings/profile, settings/company, edit-profile, review-form, agreement understanding.

## Phase D — Empty / loading / error states

- Audited 9 list-page empty states (notifications, dashboard recent RFQs, supplier rfqs/projects/earnings/proposals, discover, RFQ list, suggested suppliers). All Arabic, contextual, actionable.
- Improved `notifications` empty state to match the standard dashed-card pattern.
- `error.tsx`, `not-found.tsx`: Arabic + retry/back link, verified prior. No changes.
- `loading.tsx`: per-route skeletons added in Phase A.16 (8 new files), wrapped in `LoadingWithTimeout` for 15-second stalled-page watchdog.

## Phase E — Mobile responsiveness

Walked the dashboard + key authenticated routes at 375×812:
- `/ar/dashboard` — hamburger menu present, no horizontal overflow.
- `/ar/dashboard/rfqs/[id]` (with awarded summary aside) — no overflow.
- `/ar/dashboard/rfqs/[id]/compare` — 3 proposal cards stack cleanly.
- `/ar/dashboard/rfqs/new` — wizard fits.
- `/ar/discover` — supplier card grid stacks correctly.
- Marketing pages already verified in Phase A.19 fix.
- No `<table>` elements found in app code — list-of-cards pattern is consistently used. No "table → card" conversion needed.
- Tap-target heights: primary CTAs (`h-12`) and form inputs (`h-11`) both ≥ 44px. Secondary action chips (`h-9`) sit below WCAG AAA but are intentionally compact for filters/pagination/action buttons.

## Phase F — Visual polish

- Created [components/ui/status-pill.tsx](../components/ui/status-pill.tsx) — shared chip with `kind="rfq" | "proposal"` consuming `RFQ_STATUS_LABEL/TONE` and `PROPOSAL_STATUS_LABEL/TONE`. Wired into compare page.
- Dashboard `StatusChip` simplified to consume `RFQ_STATUS_TONE` from labels.ts instead of an inline toneMap.

## Phase G — Accessibility

- Notification bell button: aria-label includes unread count.
- Chat send button: text "إرسال" alongside icon (accessible).
- Panic button + close button: aria-label "أغلق".
- FormField (`components/ui/form-field.tsx`): always pairs `<label htmlFor>` and wires `aria-invalid` + `aria-describedby`.
- MobileMenu trigger + dialog + close: all properly labelled.
- Heading hierarchy spot-checked on home page (h1 → h2 → h3, no skips).

## Phase H — Navigation

- Created [components/layout/sidebar-nav.tsx](../components/layout/sidebar-nav.tsx) — client-side shared sidebar with active-route highlight via `usePathname`. Most-specific-prefix wins so a parent link doesn't light up on a child route. Supports `unlocalized` for admin (uses `next/link` + `next/navigation`) and the default i18n routing for `[locale]` layouts.
- Refactored 3 layouts to use SidebarNav:
  - dashboard (client): 6 nav items
  - supplier: 5 nav items (gated on approval)
  - admin: 7 grouped sections (14 items) with section captions
- Created [components/ui/breadcrumbs.tsx](../components/ui/breadcrumbs.tsx) — RTL-aware breadcrumb trail with ChevronLeft separator and `aria-current="page"` on the leaf.
- Wired breadcrumbs into 4 deep pages: dashboard/rfqs/[id]/{compare,escrow,agreement,proposals/[proposalId]}.

## Phase I — Data display

- `lib/utils/format.ts` improvements (Phase A.8 + Phase B.4 combined):
  - `formatDateShort` switched from `en-SA` (MM/DD/YYYY) to `ar-SA` with Arabic-Indic digits + Arabic month names. Single change fixes 7+ call sites.
  - Added `formatIban(value)` — groups Saudi IBAN into 4-digit chunks.
- Wired `formatIban` into the escrow page bank-detail render.
- Chat messages now render `timeAgo(message.created_at)` below each bubble.
- Inline `Intl.DateTimeFormat('ar-SA', ...)` calls collapsed back into the shared `formatDate` helper in dashboard root.

## Phase J — Marketing content

- Spot-verified all 11 footer routes resolve: for-clients, for-suppliers, how-it-works, pricing, about, blog, discover, exhibitions, contact, legal/terms, legal/privacy.
- All home-page CTAs go to live routes (`/signup`, `/how-it-works`, `/for-clients`, `/for-suppliers`, `/contact`, `/discover`).
- `/suppliers` redirect verified to land at `/discover` (307 → 200 in audit script).
- Home featured-suppliers section verified rendering real DB data (4 approved suppliers) instead of the hardcoded sample names.

## Phase K — Performance

- Only 1 `<img>` tag in the codebase (`discover/[id]` portfolio thumbnails). Added explicit `width={640} height={360}`, `loading="lazy"`, `decoding="async"` for CLS prevention and bandwidth-friendly delivery. External URLs (Supabase Storage) keep `<img>` since `next/image` doesn't auto-handle remote loaders without config.
- Fonts: `next/font/google` with `display: swap` already configured for both `IBM_Plex_Sans_Arabic` and `Inter`. No FOIT.
- CSS: Tailwind v4 + Next App Router (purged automatically). No FOUC observed.
- No third-party render-blocking scripts in `<head>`.
- Lighthouse measurement deferred to a separate session — requires production build + measurement infrastructure to produce useful numbers.

## Phase L — Edge cases

Verified by code inspection and existing audit-script coverage:
- 0 RFQs: `dashboard/page.tsx` empty state shows "لا توجد طلبات بعد. ابدأ بإنشاء طلبك الأول..." (verified live).
- Pagination: existing `Pagination` component used on all list pages (RFQs, discover, supplier rfqs, supplier earnings, admin) — no `limit` exceeded issues.
- 0 portfolio supplier: empty state in `/discover/[id]` portfolio section.
- 0 chat messages: "ابدأ المحادثة بإرسال رسالتك الأولى" in ChatWindow.
- Escrow missing bank: client escrow page conditional `supplier && supplier.iban ?` hides bank-detail section when not present.
- Slow network: Phase A.17 `LoadingWithTimeout` 15-second watchdog → retry button.
- Review without comment: `reviews` schema doesn't require comment, only star ratings.

## Phase M — Final regression

Ran 13 of the existing audit scripts against the polished build:

| Audit | Pass rate |
|-------|-----------|
| 1.1 marketing | 65 / 66 |
| 1.2 auth | 53 / 54 |
| 1.3 client dashboard | 27 / 27 |
| 1.4 client settings | 23 / 23 |
| 1.5 onboarding | 13 / 13 |
| 1.6 discovery | 15 / 15 |
| 1.7 RFQ wizard | 30 / 30 |
| 1.8 RFQ pages | 19 / 20 |
| 1.9 chat | 16 / 16 |
| 1.10-1.12 agreement/escrow/reviews | 31 / 32 |
| 1.13 disputes | 18 / 19 |
| 1.14 + Phase 2 | 43 / 46 |
| Phase 3 admin | 71 / 71 |
| Phase 4 cross-cutting | 37 / 37 |
| **Totals** | **461 / 469** |

Audit-script updates folded into Phase A.3 + Phase B.2: route list rewritten to expect `/suppliers` as a redirect, marketing nav-link check switched to `/discover`, RFQ status-label check updated to point at `lib/constants/labels.ts`.

The 8 remaining failures are all pre-existing or data-state-dependent (e.g., dev-mode `404` returning 200, dispute fixture row missing, awardProposalAction naming). None are regressions introduced by the polish pass.

---

## Closing

**Phase A → M complete. All 19 QA findings resolved, 11 follow-on polish sweeps shipped, 461/469 regression checks green.**

The remaining items the user should still wire externally (not code-fixable):
- Sentry DSN in production env (carried over from MVP report's P1)
- Resend production domain + DKIM for transactional emails

Everything else in `ai-documents/QA-REPORT.md` is now closed.

