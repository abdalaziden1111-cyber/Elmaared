# QA Report — App Exhibition MVP

**Auditor**: Claude (Opus 4.7), acting as senior QA + product auditor
**Method**: real-user walkthrough via Preview MCP browser against the production build (`pnpm build` + `pnpm start`, port 3000)
**Date**: 2026-05-16
**Companion to**: [MVP-VERIFICATION-REPORT.md](./MVP-VERIFICATION-REPORT.md) (route/contract level) + [DEEP-AUDIT-REPORT.md](./DEEP-AUDIT-REPORT.md) (per-element level)

This report focuses on **polish gaps the automated audits couldn't catch** — visual feel, copy quality, feedback weakness, journey friction, mobile experience.

---

## Top 3 priorities (TL;DR)

If you only ship 3 things before public launch:

1. **🐛 P1 — Fix raw English enum leaks on client RFQ detail page.** The most-viewed authenticated page renders `booth`, `Riyadh`, `area`, `floors`, `exhibitionDate`, `2026-08-09` as raw DB values. Same class of bug already fixed on supplier rfqs list (P2-4). Affects every client viewing every RFQ they've created. **High visibility, low effort** — add 3 label maps + a date formatter call.

2. **🐛 P1 — Add mobile hamburger menu to the marketing site header.** On `<lg` viewports the header shows only logo + locale + signup. **Login button is hidden** with no alternative — existing users on mobile literally cannot log in from the marketing site without typing `/login` manually. Other layouts (dashboard / supplier / admin) already use the `MobileMenu` component; just wire it up in `components/marketing/site-header.tsx`.

3. **🐛 P1 — Real validation feedback on signup forms.** Empty submits show browser-native tooltip (English in most browsers) on one field at a time; invalid submits silently fail with no rendered error. First-touch users will bounce. Either: (a) render the `state.fieldErrors` from `useActionState` near each field, or (b) drop the `required` HTML5 attr and let the zod schema produce inline messages.

The full audit found **19 distinct issues**, mostly polish/UX rather than functional bugs (the deep audit caught all functional ones). Read on for the full breakdown.

---

## 1 — User journey findings

### 1.1 Header brand "تتطبيق المعارض" reads as one merged word in textContent

- **Area**: site-wide (every page)
- **Severity**: Low
- **Type**: UX issue / accessibility
- **Steps to reproduce**: Open `/ar` → inspect the header logo link's textContent (or have a screen-reader announce it).
- **What happened**: The logo `<a>` contains the icon span (text `ت`) and the brand text (`تطبيق المعارض`) with no separator. textContent / screen reader concatenates them as `تتطبيق المعارض`.
- **What should happen**: Either a space between the icon and the brand text, or `aria-hidden` on the icon span (the aria-label on the link is now correct — Phase 3 fix — but the textContent leak remains for screen readers + browser accessibility tools).
- **Why this matters**: Voice-over users hear "تتطبيق" which isn't a real word. Search engines indexing the header may interpret it oddly.
- **Suggested fix**: The icon span already has `aria-hidden` — that should suffice. The leak only manifests in textContent inspection (my tooling). Verify with a real screen reader; if still announced, add an explicit `<span aria-hidden=true>` wrapper.

### 1.2 Home page "موردون يخدمونك الآن" strip uses fake hardcoded suppliers

- **Area**: `/ar` (marketing home)
- **Severity**: Medium
- **Type**: Content issue
- **Steps to reproduce**: Open `/ar`, scroll to the "موردون معتمدون يخدمونك الآن" section. Compare the 4 supplier names against `/ar/discover` (the real directory).
- **What happened**: Home strip shows 4 hardcoded suppliers: شركة الإبداع للمعارض (real), فعاليات الأفق, هدايا ترويجية برو, مطبوعات الواحة — only the first is in the DB. The "47 مشروع منفّذ · 11 سنوات خبرة" stats are also hardcoded marketing copy.
- **What should happen**: Either (a) pull the top 4 approved suppliers from the DB live, or (b) reword the section header to make clear these are illustrative examples ("مثال على موردين معتمدين", not "يخدمونك الآن").
- **Why this matters**: Header says "يخدمونك الآن" (serving you now) — implies live data. A user clicking "تصفّح كل الموردين ←" expecting these 4 specifically will find a different set.
- **Suggested fix**: In [app/[locale]/(marketing)/page.tsx](../app/[locale]/(marketing)/page.tsx), replace the hardcoded `SUPPLIERS` array with a server-component query to `suppliers` table where `status='approved'` ordered by `total_completed_orders desc limit 4`.

### 1.3 Two supplier-discovery pages with overlapping purpose

- **Area**: `/ar/suppliers` (marketing teaser) + `/ar/discover` (real directory)
- **Severity**: Medium
- **Type**: UX issue
- **Steps to reproduce**: Open `/ar`, click "تصفّح الموردين" in the header → lands on `/ar/suppliers` (4 hardcoded). Open the footer and click the same "تصفّح الموردين" → same page. Then open `/ar/discover` directly → 6 real suppliers with filters.
- **What happened**: Two routes do similar things. `/ar/suppliers` is the marketing-teaser (4 fake names, no filters, subtitle "للتقديم على عرض، أنشئ حساب عميل"). `/ar/discover` is the real directory (real data, full filters, public access). Nav + footer route to the teaser, not the directory.
- **What should happen**: One canonical "browse suppliers" route. Either point all nav/footer links to `/ar/discover` and convert `/ar/suppliers` to a redirect, or remove `/ar/suppliers` entirely (it duplicates `/ar/discover`).
- **Why this matters**: A real prospect clicks "تصفّح الموردين" and sees a marketing teaser instead of the actual directory. Trust hit.
- **Suggested fix**: Delete `/ar/suppliers` route + the marketing data; update nav/footer to point to `/ar/discover`.

### 1.4 Auth layout logo missing `aria-label` (same class as marketing fix)

- **Area**: `/ar/login`, `/ar/signup`, `/ar/forgot-password`, all signup wizard steps
- **Severity**: Low
- **Type**: UX issue / accessibility
- **Steps to reproduce**: Navigate to any auth page. Inspect the header logo link.
- **What happened**: The Phase 3 fix added `aria-label="تطبيق المعارض"` to [components/marketing/site-header.tsx](../components/marketing/site-header.tsx) but [app/[locale]/(auth)/layout.tsx](../app/[locale]/(auth)/layout.tsx) has a separate copy of the logo markup that still lacks it. Same a11y bug, different file.
- **What should happen**: Auth layout logo should also have the aria-label.
- **Suggested fix**: Add `aria-label={tHome('title')}` to the `<Link href="/">` in the auth layout. 1-line patch.

### 1.5 Auth + signup pages feel sparse on desktop

- **Area**: `/ar/login`, `/ar/signup`, `/ar/signup/*` (all auth-layout pages)
- **Severity**: Low
- **Type**: UX issue
- **Steps to reproduce**: Open `/ar/login` at 1440px viewport.
- **What happened**: Form is centered horizontally but the layout is a single column — vast cream-colored empty space on left and right. Form feels lost.
- **What should happen**: Either a side illustration / value-prop column (typical SaaS pattern), or a narrower max-width on the auth shell so the form feels intentional rather than floating.
- **Why this matters**: First impression for signup. Sparse forms feel less professional than equivalent desktop SaaS.
- **Suggested fix**: Two-column layout — form on right, gradient/illustration + value props on left (e.g., "5 موردين في 24 ساعة", "ضمان نقدي كامل", "بدون اشتراك").

### 1.6 Empty form submit: HTML5 native tooltip only, no inline Arabic

- **Area**: All forms with `required` attrs (login, signup wizard, RFQ wizard, etc.)
- **Severity**: Medium
- **Type**: UX issue
- **Steps to reproduce**: Open `/ar/signup/client/account`. Click "التالي" without filling anything.
- **What happened**: Browser shows a native tooltip on the first invalid field. On Chrome with system English, tooltip is English ("Please fill out this field"). No inline Arabic errors render next to the fields.
- **What should happen**: Every required field shows a small Arabic error message inline ("مطلوب") on attempted submit, and the field gets a visible invalid border.
- **Why this matters**: Arabic-first audience receives English error messages from the browser. Inconsistent + unprofessional.
- **Suggested fix**: Remove `required` from the inputs; let zod validation run server-side, render `state.fieldErrors[name]` from `useActionState` near each field. Or use a client-side hook + custom invalid styling.

### 1.7 Invalid form submit silently fails (no rendered server-side errors)

- **Area**: `/ar/signup/client/account` (likely other forms too)
- **Severity**: High
- **Type**: Bug (UX-level)
- **Steps to reproduce**: Fill the form with: name="AB" (too short), email="notanemail", phone="0501234567" (no +966), password="short" (< 8 chars). Submit.
- **What happened**: Form submits, page stays on same URL, **no error message renders anywhere**. User sees nothing changed and assumes the click was missed.
- **What should happen**: Each invalid field should render a specific Arabic error ("الاسم يجب أن يكون 3 أحرف على الأقل", "بريد إلكتروني غير صالح", "رقم الهاتف يجب أن يبدأ بـ +966", "كلمة المرور يجب أن تكون 8 أحرف على الأقل"). The zod schema already defines these messages — they're just not surfaced.
- **Why this matters**: Critical first-touch funnel. Users hit this on their first signup attempt and bounce.
- **Suggested fix**: The `useActionState` hook returns `state.fieldErrors` — render `<p className="text-xs text-danger">{fieldErrors.email?.[0]}</p>` under each FormField. Likely a 5–10 line change in each wizard step component.

### 1.8 Dashboard recent-RFQs list uses English MM/DD/YYYY dates

- **Area**: `/ar/dashboard` (client home)
- **Severity**: Medium
- **Type**: Content issue
- **Steps to reproduce**: Login as a client with RFQs. Look at the "طلباتك الأخيرة" widget.
- **What happened**: Each row shows the date as `05/16/2026` (US MM/DD/YYYY). Page is otherwise fully Arabic with Arabic-Indic numerals elsewhere.
- **What should happen**: Use the existing `formatDate` / `formatDateShort` utilities to render `١٦ مايو ٢٠٢٦` (matches other parts of the UI).
- **Why this matters**: Breaks the localization promise. Saudi users expect day-first dates in Arabic numerals.
- **Suggested fix**: In the dashboard recent-RFQs widget, replace the inline `created_at.toLocaleDateString()` with `formatDateShort(r.created_at)` from `lib/utils/format.ts`.

### 1.9 — 1.12 RFQ detail page: 4 separate enum/format leaks

- **Area**: `/ar/dashboard/rfqs/[id]`
- **Severity**: **High** — most-viewed authenticated page; bug compounded by 4 separate fields
- **Type**: Bug / Content issue
- **Steps to reproduce**: Login as client → open any RFQ detail.
- **What happened**:
  | # | Field | Renders | Should render |
  |---|---|---|---|
  | 9 | نوع الخدمة | `booth` | بوث |
  | 10 | المدينة | `Riyadh` | الرياض |
  | 11 | تفاصيل الخدمة keys | `area`, `floors`, `exhibitionDate`, `exhibitionName` | المساحة, عدد الطوابق, تاريخ المعرض, اسم المعرض |
  | 12 | exhibitionDate value | `2026-08-09` | ٩ أغسطس ٢٠٢٦ |
- **What should happen**: Same `SERVICE_LABEL` map already used in `app/[locale]/supplier/rfqs/page.tsx` (P2-4 fix). Same `formatDate` for exhibitionDate (the page already uses it for "آخر موعد للعروض" — just not for the inner detail keys).
- **Why this matters**: The client sees this page through the entire lifecycle (draft → open → award → in-progress → completed). The English leaks make the platform feel half-finished. Same class as the supplier-side bug that was already fixed.
- **Suggested fix**: Add `SERVICE_LABEL`, `CITY_LABEL` (or map through existing CITIES constant), and a `DETAIL_KEY_LABEL` map in [app/[locale]/dashboard/rfqs/[id]/page.tsx](../app/[locale]/dashboard/rfqs/[id]/page.tsx). Format `exhibitionDate` with `formatDate`.

### 1.13 RFQ detail (post-completion) lacks navigational links

- **Area**: `/ar/dashboard/rfqs/[id]` when status=completed
- **Severity**: Medium
- **Type**: Missing feature
- **Steps to reproduce**: Open a completed RFQ as the owning client.
- **What happened**: Page shows: title, status, 4 info cards, description, raw details, review-thanks banner, dispute button. **No link to the escrow page** (to review payment), **no link to the chat thread** (to revisit conversations), **no display of the awarded supplier name** (you have to click "عرض ومقارنة العروض" to find out).
- **What should happen**: A "ملخّص المشروع" sidebar/section with: supplier name (linked to their profile), final agreed amount, escrow status, last chat link. Acts as a project home for the completed deal.
- **Why this matters**: Client wants to revisit completed projects (for receipts, supplier rating reference, dispute later). Currently they have to remember the RFQ number + navigate manually.
- **Suggested fix**: Add a "ملخّص" section above the dispute button: supplier name + amount + 2 links (Escrow + Chat). Pull from the winning_proposal + escrow_transactions rows.

### 1.14 Compare page shows proposal status as raw English

- **Area**: `/ar/dashboard/rfqs/[id]/compare`
- **Severity**: Medium
- **Type**: Content issue
- **Steps to reproduce**: Open the compare page on RFQ-2026-00001.
- **What happened**: Each proposal card has a status indicator showing raw enum: `accepted`, `submitted`, `rejected`, `shortlisted` (whichever applies). The rest of the UI uses Arabic.
- **What should happen**: Map through a Arabic label dictionary like every other status pill in the app.
- **Suggested fix**: Add the same `STATUS_LABEL` dict that `app/[locale]/supplier/proposals/page.tsx` uses, render `STATUS_LABEL[p.status] ?? p.status`.

### 1.15 AI scoring placeholder permanent ("جارٍ تقييم…")

- **Area**: `/ar/dashboard/rfqs/[id]/compare`
- **Severity**: Medium
- **Type**: Content issue / Other (env-coupling)
- **Steps to reproduce**: Open compare page on any RFQ with proposals. Look under each proposal card.
- **What happened**: Every proposal shows "جارٍ تقييم العرض من الذكاء الاصطناعي…" indefinitely. Because the AI Gateway key is absent, scoring never completes; the placeholder is the permanent state.
- **What should happen**: Either (a) hide the placeholder when no AI key is configured at runtime, or (b) swap to a static fallback ("تقييم AI غير متاح حالياً — قارن يدوياً بالسعر ومدة التسليم").
- **Why this matters**: User waits expecting AI scoring; never arrives. Looks broken.
- **Suggested fix**: In the proposal card render, check `proposal.ai_score != null` — if score exists, show it; else show a quiet fallback message instead of the loading-style "جارٍ…".

### 1.16 Generic Suspense skeleton doesn't match most pages

- **Area**: Every authenticated page with a `loading.tsx`
- **Severity**: Medium
- **Type**: UX issue
- **Steps to reproduce**: Hard-refresh any client/supplier/admin page (cold cache).
- **What happened**: The skeleton fallback is a 4-row list pattern: 4 grey rounded rectangles + a title bar. This fits "list pages" (proposals, projects, suppliers) but mismatches: dashboard (4 KPI cards + widgets), escrow (4 stat cards + bank section), agreement (form fields), settings (form), RFQ detail (info grid + sections).
- **What should happen**: Per-route loading.tsx files matching each page's actual layout, OR a more neutral skeleton (e.g., a soft "loading…" spinner) that doesn't suggest a list when the destination is different.
- **Why this matters**: Users glance at the skeleton and infer what's loading; mismatched skeletons cause jank when the real content has a completely different shape.
- **Suggested fix**: Create per-segment `loading.tsx` files for dashboard, escrow, agreement (most-mismatched). Use the actual page's grid as the skeleton.

### 1.17 Streaming Suspense can persist in slow/headless contexts

- **Area**: All dynamic SSR pages with `loading.tsx`
- **Severity**: Low (real users rarely hit this, but worth knowing)
- **Type**: Performance issue
- **Steps to reproduce**: Hard-refresh a dynamic page; if the RSC stream is interrupted (slow network, tab backgrounded mid-request), the skeleton can stay forever.
- **What happened**: In one headless browser session, the supplier RFQ detail page stayed on the skeleton for 10+ seconds. The SSR response had only the Suspense boundary; the streamed payload never arrived in the browser.
- **What should happen**: A timeout fallback that swaps the skeleton for a "تعذّر التحميل — حاول إعادة التحميل" message after, say, 15 seconds.
- **Why this matters**: On flaky mobile networks (common in SA), users can be stuck on a loading screen.
- **Suggested fix**: Either disable Suspense streaming for protected pages (`export const dynamic = 'force-dynamic'` + no `loading.tsx`), or add a client-side timeout watchdog.

### 1.18 Admin sidebar: 15 ungrouped links

- **Area**: `/admin/*` layout
- **Severity**: Low
- **Type**: UX issue
- **Steps to reproduce**: Log in as admin.
- **What happened**: Sidebar has 15 nav links in one flat list, no section headers, no separators. Cognitive overload — admin has to scan all 15 each time.
- **What should happen**: Group into 5 sections with small uppercase headers:
  - **عام**: نظرة عامة, سجل النشاط
  - **المستخدمون**: المستخدمون, فريق Admin
  - **الموردون**: كل الموردين, موردون قيد المراجعة
  - **العمليات**: الطلبات, الاتفاقيات المعلّقة, المحادثات, 🚨 التصعيدات
  - **الضمان**: الإيداعات المعلّقة, تحرير دفعات الموردين, دفتر الضمان
  - **النزاعات**: النزاعات
  - **النظام**: إعدادات المنصة
- **Suggested fix**: Modify `NavLinks()` in `app/admin/layout.tsx` to render section headers between groups.

### 1.19 Mobile marketing header: no hamburger, no login button

- **Area**: `/ar` (and all marketing pages) on mobile (<lg breakpoint, ≤1024px)
- **Severity**: **High**
- **Type**: Bug (mobile UX)
- **Steps to reproduce**: Open `/ar` at 375px width (or use Chrome dev-tools mobile preset).
- **What happened**: Header shows only: logo icon (no brand text), "English" toggle, "إنشاء حساب" button. **No login button, no hamburger menu**. The 7 nav links (للعملاء, للموردين, كيف نعمل, etc.) are hidden behind `hidden lg:flex` with no mobile alternative.
- **What should happen**: A hamburger menu like the dashboard/supplier/admin layouts use (the `MobileMenu` component already exists in `components/layout/mobile-menu.tsx`).
- **Why this matters**: Existing users on mobile can't sign in from the marketing site at all (have to know `/login` URL). New users can't explore nav (how-it-works, pricing, etc.) without scrolling all the way through home content.
- **Suggested fix**: Wire `<MobileMenu>` into `components/marketing/site-header.tsx` with the 7 nav links + login + signup as the drawer content. ~30 line change.

---

## 2 — Platform activities findings

Already covered above. No additional functional bugs found beyond the deep-audit's existing list (everything in MVP-VERIFICATION-REPORT and DEEP-AUDIT-REPORT is still passing in prod).

---

## 3 — UX clarity findings

### General observations
- **Status pill colors are inconsistent**: completed/مكتمل uses green (`success-100`), مفتوح uses blue (`action-blue/10`), but `negotiating` and `awarded` both use blue too — hard to distinguish at a glance on the admin RFQs queue.
- **Notification bell shows unread count but the dropdown content** uses fully Arabic notifications — however the notification *type* (rfq_match, proposal_received, etc.) might leak as English in some templates. Not verified end-to-end.

### Empty states
- Most empty states have appropriate Arabic copy ("لا توجد طلبات تطابقك حالياً..."). ✅

---

## 4 — Bugs and broken behavior summary

| # | Page / Area | Severity | Type | Status |
|---|---|---:|---|---|
| 1.1 | site-wide header | Low | a11y | open |
| 1.2 | home suppliers strip | Medium | content | open |
| 1.3 | /ar/suppliers vs /ar/discover | Medium | UX | open |
| 1.4 | auth layout logo | Low | a11y | open |
| 1.5 | auth/signup desktop layout | Low | UX | open |
| 1.6 | form validation native tooltip | Medium | UX | open |
| 1.7 | invalid form silent failure | **High** | bug | open |
| 1.8 | dashboard recent-RFQs dates | Medium | content | open |
| 1.9–1.12 | RFQ detail enum/format leaks (4 fields) | **High** | bug | open |
| 1.13 | RFQ detail missing nav links | Medium | missing feature | open |
| 1.14 | compare page status enum | Medium | content | open |
| 1.15 | AI scoring permanent "جارٍ" | Medium | content | open |
| 1.16 | generic loading skeleton | Medium | UX | open |
| 1.17 | streaming Suspense forever-loading | Low | perf | open |
| 1.18 | admin sidebar 15 ungrouped links | Low | UX | open |
| 1.19 | mobile marketing header no menu | **High** | bug | open |

---

## 5 — Final-touch improvements

### Critical (block launch)
1. **#1.7** — Surface server-side validation errors on signup. Today, an invalid signup looks like it did nothing.
2. **#1.19** — Mobile marketing hamburger menu. Existing users can't log in from `/ar` on phones.
3. **#1.9–1.12** — RFQ detail enum/format leaks. Most-visited authenticated page renders DB values raw.

### Important (ship before public marketing push)
4. **#1.6** — Inline Arabic form validation (replace HTML5 native tooltips).
5. **#1.2 + #1.3** — Single canonical "browse suppliers" route + real data.
6. **#1.14 + #1.15** — Compare-page status Arabic + AI placeholder cleanup.
7. **#1.16** — Per-segment loading skeletons matching each page's structure.

### Polish (post-launch)
8. **#1.4** — Auth-layout logo aria-label.
9. **#1.5** — Two-column auth pages.
10. **#1.13** — RFQ detail summary section (supplier + escrow + chat links).
11. **#1.18** — Admin sidebar grouping.
12. **#1.8** — Arabic dates in dashboard recent-RFQs.

---

## Summary

### 1) Overall platform readiness — **8/10**

Functionally complete and stable: full E2E flows verified across 457 deep-audit items + 29 critical-flow prod checks (all ✅). The remaining gap is **last-mile polish**: a handful of pages still render English DB values in an Arabic UI, and mobile users on the marketing site can't reach the login button. These are easy fixes but **highly visible** to first-touch users — without them, the platform feels "almost ready" rather than launched.

The 8/10 breakdown:
- Architecture, data integrity, role-based access, payments, audit trail: **10/10**
- Functional correctness (everything that should work, works): **10/10**
- Localization completeness on user-facing pages: **6/10** (RFQ detail leaks are bad)
- Mobile UX: **7/10** (admin/dashboard/supplier good, marketing broken)
- First-touch funnel (signup → first action): **7/10** (validation feedback weak)

### 2) Top critical issues to fix first

Same as the Top 3 priorities at the top: validation feedback, mobile marketing menu, RFQ detail enum leaks.

### 3) Medium-priority issues

Marketing supplier-strip data, supplier-page route duplication, compare-page status enum, AI scoring placeholder, generic loading skeletons, RFQ-detail missing summary links, dashboard date format.

### 4) Low-priority polish items

Header textContent merge, auth-layout aria-label, sparse desktop auth pages, streaming Suspense watchdog, admin sidebar grouping.

### 5) Recommended next steps before launch

1. **Fix the 3 critical items** (validation + mobile menu + RFQ detail localization). Estimated 4–6 hours.
2. **Sweep the medium items in one PR.** Estimated 1 day.
3. **Polish items go into a Phase 2 backlog** — don't block launch.
4. **Beta-test with 3 real users** (1 client, 1 supplier, 1 admin) to confirm the fixes resolved the friction. Capture any new findings.
5. **Wire Sentry DSN** (P1-5 from MVP report) before public traffic so you can see what breaks in production.
6. **Resend production domain + DKIM** (P1-2 from MVP report) so signup/notification emails actually deliver.

After 1 + 5 + 6, this platform is ready for a controlled public beta.
