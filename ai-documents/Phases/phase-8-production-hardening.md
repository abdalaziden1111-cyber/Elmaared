# Phase 8 — Production Hardening (Weeks 17-22)

> **Goal**: take the 7 new sidebar pages (and the rest of the surface) from "renders correctly" to "ready for general availability". Every list scales past 100 rows, suppliers can self-serve their data, admins can drill into and act on every record, mobile users get a real navigation, and the team gets the observability + tests needed to deploy without fear.

> **Prerequisite**: Phases 0–7 complete. All sidebar pages exist (current state). Database migrations applied. RLS policies in place.

---

## What this phase delivers

By end of Week 22:

1. **Scalable lists**: every list page accepts `?page=`, `?q=`, `?status=` and is paginated server-side (20/page). No more silent `.limit(100)`.
2. **Mobile-first navigation**: hamburger drawer on dashboard, supplier, and admin layouts. Sidebar usable on phones.
3. **Editable supplier profile**: `/supplier/profile/edit` form for company, specializations, cities, bio, bank info. Server action + Zod + audit log.
4. **Admin detail pages**: `/admin/rfqs/[id]`, `/admin/chats/[id]`, `/admin/disputes/[id]` with drill-down and per-record actions (join chat, archive, resolve dispute, cancel RFQ).
5. **Live admin oversight**: Supabase realtime channel for `chats` panic alerts. Disputes counter in sidebar badge.
6. **Notification bell**: header bell in all 3 layouts showing unread count, dropdown with last 10, mark-as-read.
7. **i18n migration**: hard-coded Arabic strings moved to `lib/i18n/messages/{ar,en}.json`. All Link/router imports use the localized wrappers in `lib/i18n/routing.ts`. English locale shows English.
8. **Quality gates**: Playwright E2E specs for the 5 critical user journeys + admin flows. Sentry wired for errors. Lighthouse > 90 on logged-in pages.
9. **Security audit pass**: RLS policy review on every table, rate limit on server actions, DB indexes for the slow queries.

---

## Phase breakdown (sub-phases A–H)

Each sub-phase is one short cycle (3–7 days). Sub-phases can be parallelized where noted.

| # | Sub-phase | Days | Depends on | Parallel-safe |
|---|---|---|---|---|
| A | Foundation fixes & polish | 2 | — | yes |
| B | Scalable list pages | 5 | A | yes |
| C | Mobile + accessibility | 4 | A | yes |
| D | Supplier self-service (profile editing) | 6 | A | yes |
| E | Admin power tools (detail + actions) | 7 | A | yes |
| F | Realtime + notifications UI | 5 | E (admin actions ready) | no |
| G | i18n migration | 5 | A–E (avoid double rework) | no |
| H | Quality gates (E2E + observability) | 7 | A–F (features stable) | no |

**Critical path**: A → B/C/D/E in parallel → F → G → H. Realistic team-of-2 timeline: 4–6 calendar weeks.

---

## Sub-phase A — Foundation fixes & polish (2 days)

Small fixes that block clean execution of everything downstream. From earlier audits.

### Deliverables
- [ ] Locale-aware redirects: replace `redirect('/login')` and `redirect('/dashboard')` etc. in [app/actions/auth.ts](app/actions/auth.ts), [lib/auth/require-role.ts](lib/auth/require-role.ts), [lib/auth/get-user.ts](lib/auth/get-user.ts) with the localized `redirect` from [lib/i18n/routing.ts](lib/i18n/routing.ts). Eliminates the 2-hop redirect on every login/signup/logout.
- [ ] Home page CTA: add a header to [app/[locale]/page.tsx](app/[locale]/page.tsx) with "تسجيل الدخول" → `/login` and "إنشاء حساب" → `/signup`. Anonymous visitors currently have no path forward.
- [ ] Hardcoded `/ar/` cleanup: [app/api/auth/callback/route.ts:17](app/api/auth/callback/route.ts:17), [lib/notifications/build.ts:42,45](lib/notifications/build.ts:42). Use locale-aware paths.
- [ ] Dead-action cleanup: confirm `raisePanicAction`, `submitDeliveryAction`, `adminJoinChatAction`, `adminReleaseToSupplierAction` are still going to be wired in sub-phase E. If yes, leave; if no, delete.
- [ ] App-wide `loading.tsx`: standardize a `SkeletonList` server component in `components/ui/` and add `loading.tsx` for every route segment that fetches data. Eliminates the flash-of-stale-page during transitions.

### Acceptance
- Every server-action redirect lands on the right page in 1 hop, not 2.
- `/ar` and `/en` home pages have functioning Login/Signup CTAs.
- `tsc --noEmit` clean, all 825 unit tests still pass.

---

## Sub-phase B — Scalable list pages (5 days)

Every list page must accept pagination and search params, server-side.

### Files affected (9 list pages)
- [app/[locale]/supplier/proposals/page.tsx](app/[locale]/supplier/proposals/page.tsx)
- [app/[locale]/supplier/projects/page.tsx](app/[locale]/supplier/projects/page.tsx)
- [app/[locale]/supplier/earnings/page.tsx](app/[locale]/supplier/earnings/page.tsx)
- [app/[locale]/supplier/rfqs/page.tsx](app/[locale]/supplier/rfqs/page.tsx)
- [app/[locale]/dashboard/rfqs/page.tsx](app/[locale]/dashboard/rfqs/page.tsx)
- [app/admin/rfqs/page.tsx](app/admin/rfqs/page.tsx)
- [app/admin/chats/page.tsx](app/admin/chats/page.tsx)
- [app/admin/disputes/page.tsx](app/admin/disputes/page.tsx)
- [app/admin/suppliers/pending/page.tsx](app/admin/suppliers/pending/page.tsx)

### Deliverables
- [ ] New components in `components/ui/`:
  - `pagination.tsx` — Previous/Next + page numbers, reads `?page=` from URL.
  - `search-bar.tsx` — form posting `?q=` with debounce-free server-action submit.
  - `status-filter.tsx` — `<select>` reading `?status=` with deep-link friendly options.
- [ ] Each page reads `searchParams` (Next.js App Router `searchParams` prop), translates to Supabase `.range(start, end)` + `.ilike('title', %q%)` + `.eq('status', s)`.
- [ ] Page size: 20 default. Hard cap: 100.
- [ ] Total count via `select('*', { count: 'exact', head: true })` so pagination knows total pages.
- [ ] Empty-state distinguishes "no matches for search" vs "no data at all".

### Acceptance
- Loading `/admin/rfqs?page=3&status=open&q=booth` returns the right slice.
- Pagination footer shows "صفحة 3 من 12 · 240 طلب".
- Search debounce isn't needed (server-side form submit).
- 0 results with active filter shows "ما فيش نتائج" + clear-filter link.

---

## Sub-phase C — Mobile + accessibility (4 days)

The 3 sidebars are currently `hidden lg:flex`. On phone/tablet users see no nav at all.

### Deliverables
- [ ] `components/layout/mobile-drawer.tsx` — Radix Dialog–based slide-in drawer.
- [ ] Update [app/[locale]/dashboard/layout.tsx](app/[locale]/dashboard/layout.tsx), [app/[locale]/supplier/layout.tsx](app/[locale]/supplier/layout.tsx), [app/admin/layout.tsx](app/admin/layout.tsx): add `<MobileTopBar />` with hamburger that opens drawer (same links as desktop sidebar).
- [ ] Accessibility audit on the 7 new pages and the 3 layouts:
  - `aria-current="page"` on active sidebar link.
  - `<nav aria-label="...">` on every nav.
  - Skip-to-content link in each layout.
  - Keyboard tab order verified.
  - Color contrast checked against WCAG AA on all status badge colors.
- [ ] Mobile-specific layout: cards stack, tables become 2-line cards, summary cards (earnings) become single-column.

### Acceptance
- Lighthouse Accessibility ≥ 95 on `/ar/supplier/rfqs`, `/admin/rfqs`, `/ar/dashboard/rfqs`.
- Manual test on iPhone 14 viewport: every page navigable via drawer, no horizontal scroll.

---

## Sub-phase D — Supplier self-service (profile editing) (6 days)

Currently [/supplier/profile/portfolio](app/[locale]/supplier/profile/portfolio/page.tsx) is read-only. Suppliers cannot update their bank IBAN, specializations, or company info without admin intervention.

### Deliverables
- [ ] **Migration**: add `supplier_profile_updates` audit table (or extend existing audit_log).
- [ ] **Schemas**: [schemas/supplier-profile.ts](schemas/supplier-profile.ts) — Zod schemas for `companySchema`, `specializationsSchema`, `bankSchema`, `bioSchema`. Re-use IBAN/CR/VAT validators from existing [schemas/auth.ts](schemas/auth.ts).
- [ ] **Server actions**: [app/actions/supplier-profile.ts](app/actions/supplier-profile.ts):
  - `updateCompanyInfoAction` — name, legal_name, vat_number, years_of_experience, team_size.
  - `updateSpecializationsAction` — specializations[], cities[] (with min/max).
  - `updateBioAction` — bio, website, min_order_value.
  - `updateBankInfoAction` — bank_name, iban, account_holder_name. **Triggers re-verification flow** (status → `pending_review` until admin re-approves).
  - Each action: Zod parse → ownership check (supplier.owner_id === user.id) → update → `recordAudit(...)` → revalidatePath.
- [ ] **New page**: [app/[locale]/supplier/profile/edit/page.tsx](app/[locale]/supplier/profile/edit/page.tsx) — 4 tabbed forms matching the 4 sections of the read-only view.
- [ ] **Edit button**: on [profile/portfolio/page.tsx](app/[locale]/supplier/profile/portfolio/page.tsx) — `<Link href="/supplier/profile/edit">تعديل</Link>`.
- [ ] **File uploads** (Supabase Storage): replace CR document, VAT document, portfolio PDF. Action `uploadSupplierDocumentAction` with size/type validation.
- [ ] **Unit tests** for each Zod schema (Saudi IBAN regex, VAT format, etc.).

### Acceptance
- Supplier can update bank IBAN; status auto-flips to `pending_review`; admin sees them in `/admin/suppliers/pending`.
- Specialization changes don't downgrade approval status.
- All form fields have inline validation errors.
- Audit log shows every profile change with `actor_id`, `before`, `after`.

---

## Sub-phase E — Admin power tools (7 days)

Admin currently has 3 list pages and 3 inline actions (approve supplier, reject supplier, confirm deposit). Production needs drill-down + ability to act on individual records.

### Deliverables
- [ ] **`/admin/rfqs/[id]/page.tsx`** — full RFQ view: client info, all proposals, agreement, escrow state, audit log. Admin actions:
  - Cancel RFQ (with reason, refund flow if escrow exists)
  - Override status (last-resort recovery)
  - View full audit trail
- [ ] **`/admin/chats/[id]/page.tsx`** — chat transcript with admin actions:
  - "انضم للمحادثة" → wires up the existing `adminJoinChatAction`
  - "أرشف"
  - Send admin message (sets `is_admin_intervention=true` on the message)
- [ ] **`/admin/disputes/[id]/page.tsx`** — dispute detail with admin actions:
  - View full chat history + panic context
  - Mark as resolved (with resolution notes)
  - Trigger refund to client or release to supplier (manual override)
- [ ] **`/admin/escrow/pending-releases/page.tsx`** — list of escrow txns ready for supplier release (wires up the existing `adminReleaseToSupplierAction`). Add to admin sidebar.
- [ ] **Server actions**: `cancelRfqAction`, `archiveChatAction`, `resolveDisputeAction`, `overrideRfqStatusAction`. All audit-logged.
- [ ] **Audit log viewer**: `components/admin/audit-trail.tsx` — read `audit_log` table for a given resource, render as timeline.

### Acceptance
- Admin can click any RFQ from the list and reach its detail page.
- Every admin action shows up in the audit log within 1 second of being taken.
- Cancel-RFQ-with-active-escrow flow handles refunds correctly (test with seed data).

---

## Sub-phase F — Realtime + notifications UI (5 days)

Disputes table needs live updates so admin sees panic alerts without refreshing. All users need an in-header notification bell.

### Deliverables
- [ ] **`components/realtime/use-realtime-channel.ts`** — generic hook wrapping `supabase.channel(...).on('postgres_changes', ...)`.
- [ ] **Subscribe `/admin/disputes`** to `chats` table changes where `panic_at IS NOT NULL`. On new panic: prepend to list, play sound, update badge count.
- [ ] **Subscribe `/supplier/chats/[id]`** + **`/dashboard/rfqs/[id]/chats/[chatId]`** to `messages` table for that chat (probably already done in [components/chat/chat-window.tsx](components/chat/chat-window.tsx) — audit and confirm).
- [ ] **Notification bell**: `components/header/notification-bell.tsx`:
  - Reads count from `notifications` table where `read_at IS NULL` for current user.
  - Realtime-subscribed.
  - Dropdown shows last 10, links to [/dashboard/notifications](app/[locale]/dashboard/notifications/page.tsx) for full list.
  - "Mark all as read" button.
- [ ] **Update layouts**: dashboard, supplier, admin layouts get the bell in their header next to logout.
- [ ] **Sidebar badge** on "النزاعات" sidebar link: shows open dispute count.

### Acceptance
- Open `/admin/disputes` in tab A. In tab B, raise a panic on a chat. Tab A's list updates within 1 second without refresh.
- Click bell → dropdown shows latest. Click a notification → mark-as-read fires.

---

## Sub-phase G — i18n migration (5 days)

The project has `next-intl` configured and `ar.json`/`en.json` files exist, but every page hardcodes Arabic strings. English locale shows Arabic. Time to fix.

### Deliverables
- [ ] **Audit**: list every hardcoded Arabic string in `app/` and `components/`. Probably 200+ strings.
- [ ] **Extract**: move strings into [lib/i18n/messages/ar.json](lib/i18n/messages/ar.json) under namespaced keys (`supplier.proposals.title`, `admin.disputes.empty`, etc.).
- [ ] **Translate**: English versions in [lib/i18n/messages/en.json](lib/i18n/messages/en.json).
- [ ] **Migrate imports**: replace every `import Link from 'next/link'` → `import { Link } from '@/lib/i18n/routing'`. Same for `useRouter`, `redirect`, `usePathname`. ~40 files.
- [ ] **Server-side**: use `getTranslations` from `next-intl/server` in server components.
- [ ] **Client-side**: use `useTranslations` from `next-intl`.
- [ ] **Status label maps**: move out of inline page constants into shared `lib/i18n/labels.ts`.

### Acceptance
- `/en/supplier/rfqs` renders English headers, table labels, status badges.
- Switching locale preserves the current path (e.g., `/ar/dashboard/rfqs/abc` ↔ `/en/dashboard/rfqs/abc`).
- No more `redirect('/login')` — every redirect uses the locale-aware variant.

---

## Sub-phase H — Quality gates (7 days)

Confidence in deploys. Currently 825 unit tests pass but the only E2E is `route-smoke.spec.ts` (route 200/redirect checks). Production needs flow tests + error monitoring.

### Deliverables
- [ ] **Playwright fixtures**: `tests/e2e/fixtures/` with seeded users (client, supplier-approved, supplier-pending, admin). Reset between tests via Supabase service role.
- [ ] **E2E specs for the 5 critical paths**:
  - Client: signup → publish RFQ → shortlist → award → agreement → escrow upload → approve delivery.
  - Supplier: signup → admin approval → see matching RFQ → submit proposal → chat → sign agreement → mark delivered.
  - Admin: review pending supplier → approve → confirm deposit → release to supplier.
  - Panic: client raises panic → admin sees in `/admin/disputes` → admin joins chat → resolves.
  - Profile edit: supplier updates IBAN → admin sees in pending → re-approves.
- [ ] **Update [tests/e2e/route-smoke.spec.ts](tests/e2e/route-smoke.spec.ts)** to include the 7 new pages.
- [ ] **Sentry**: wire `@sentry/nextjs`, configure source maps, capture server-action errors, set `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] **Health check**: `app/api/health/route.ts` returning DB connectivity + version. Used by Vercel uptime + status page.
- [ ] **Performance audit**: Lighthouse on `/ar/dashboard/rfqs`, `/ar/supplier/rfqs`, `/admin/rfqs` (logged in). Target ≥ 90 perf, ≥ 95 a11y.
- [ ] **CI**: GitHub Actions workflow that runs `lint + typecheck + unit + e2e` on PR.

### Acceptance
- `pnpm test:e2e` runs all 5 critical-path specs + route smoke green in CI.
- Sentry receives a test event from a deployed preview branch.
- Lighthouse JSON saved per release in `test-results/lighthouse-*.json`.
- Health endpoint returns 200 with `{ status: 'ok', db: 'ok', commit: '...' }`.

---

## Cross-cutting concerns (not a sub-phase, but ongoing)

These are not phased — they're considered during every sub-phase:

- **Security**: every new server action calls `requireRole(...)` first. Every new query relies on RLS or uses `createAdminClient()` deliberately (never to bypass authorization, only to bypass RLS for admin-owned reads).
- **DB indexes**: when a new query pattern emerges (e.g., `proposals` by `supplier_id`, `chats` by `panic_at`), add the corresponding index migration before merging.
- **Audit trail**: every state-changing action calls `recordAudit(...)`. No exceptions.
- **Error handling**: server actions return `{ ok: false, error: <Arabic message> }` not `throw`. UI shows inline error, never `alert()` (already done in earlier round).
- **Tabular nums on numbers**: every numeric value in JSX gets `className="num"` so RTL doesn't break the columns.

---

## Out of scope (deferred to Phase 9)

Even at the end of Phase 8 the following are not done:

- Public marketing pages full content (Phase 7 already covers this).
- Mobile native apps.
- Email marketing flows.
- Bulk operations for admin (bulk approve, bulk archive).
- Saved filter presets, custom dashboards.
- Advanced reporting / analytics.
- Multi-currency.
- Translations beyond AR/EN.

---

## Definition of "production-ready" for this phase

A user opens any URL in the application and:

1. **Authenticates correctly** in 1 hop.
2. **Sees their data** with pagination + search + filter.
3. **Can update their own data** through forms with validation feedback.
4. **Sees a sensible error page** when something breaks (not a white screen).
5. **Works on their phone** (drawer nav, mobile cards).
6. **Sees notifications in real-time** when something happens to them.
7. **Reads the interface in their language** (AR or EN).
8. **Triggers traceable audit-logged actions** as a client, supplier, or admin.
9. **Operates inside a system the team monitors** (Sentry + health + E2E + Lighthouse).

If all 9 are true on staging, the build is production-ready.

---

## Suggested execution order (calendar)

| Week | Sub-phase | Notes |
|---|---|---|
| 17 | A — Foundation fixes | Quick wins, unblock the rest |
| 17–18 | B, C, D, E in parallel | 2-person team can pick lanes |
| 19 | B, C, D, E continued | Finish out |
| 20 | F — Realtime + notifications | Needs E done |
| 21 | G — i18n migration | Needs features stable |
| 22 | H — Quality gates | Final week before launch |

Realistic with a team of 2 senior engineers: **6 weeks**.
With 1 engineer + AI pairing: **8–10 weeks**.

---

## What to start with tomorrow

Sub-phase A. It's the smallest, unblocks everything, and the wins are visible:

1. Replace 5 server-action `redirect()` calls with locale-aware variants (~15 min).
2. Add Login/Signup CTAs to the home page (~30 min).
3. Add app-wide `loading.tsx` skeleton in `components/ui/skeleton-list.tsx` + thread to each route segment (~2 hours).
4. Delete the 4 dead server actions OR commit to wiring them in sub-phase E (decision: ~10 min).

Total: half a day. After that you can split B/C/D/E across the team.
