# MVP Verification Report

**App**: `app-exhibition-mvp`
**Tested by**: Claude (Opus 4.7)
**Date**: 2026-05-14
**Method**: Real-browser testing via Preview MCP against local `pnpm dev` at `http://localhost:3000`
**Personas** (seeded in Supabase):

| Role | Email | Password |
|---|---|---|
| Client | `ahmed.client.test@example.com` | `TestClient2026!` |
| Supplier | `m.supplier.test@example.com` | `TestSupplier2026!` |
| Admin | `sara.admin.test@example.com` | `TestAdmin2026!` |

**AI features**: skipped per agreement (placeholder Anthropic / AI Gateway keys). UI-level loading/error states are verified.
**Scope**: Full MVP (phases 0–7) + phase 8 hardening.

Verdict legend used throughout: ✅ working · ⚠️ incomplete · 🐛 broken · ❌ missing · ➕ present but not in docs · ⏭️ skipped (AI / out of scope)

---

## Executive summary
_(filled in last)_

---

## Phase 1 — User flow

### Section 1.1 — Guest / marketing surface

#### What a guest can do
From the home page (`/ar`), a guest can click 6 things:
1. **تسجيل الدخول** → `/ar/login`
2. **إنشاء حساب** → `/ar/signup`
3. **للعملاء** → `/ar/for-clients`
4. **للموردين** → `/ar/for-suppliers`
5. **كيف نعمل** → `/ar/how-it-works`
6. **الأسعار** → `/ar/pricing`

No header bar, no footer, no language switcher in UI — locale must be changed via URL.

#### Page-by-page

| Route | Verdict | Findings |
|---|---|---|
| `/` | ✅ | 307 redirect to `/ar`. |
| `/ar` (home) | ⚠️ Incomplete | Has H1 "تطبيق المعارض", subtitle "منصة B2B لموردي المعارض في السعودية", 2 CTAs, 4 inline nav links. **Missing per [04-screens-inventory.md](04-screens-inventory.md) §A**: hero image/illustration, 3 ICP tabs, value-props sections, featured suppliers, testimonials, footer with sitemap. RTL ✓ (`direction: rtl`). |
| `/en` (home, EN) | ⚠️ Incomplete | Same minimal layout. LTR ✓. Content correctly translated ("App Exhibition", "B2B platform…"). No language switcher visible. |
| `/ar/how-it-works` | ⚠️ Incomplete | 6 numbered steps (سجّل · استقبل عروض · قارن بـ AI · تفاوض · وقّع · أودع). **Docs spec**: 7 steps + 90s video. Missing step 7 (delivery + final payment + review) and missing video. |
| `/ar/for-clients` | ✅ Working (minimal) | 4 value props (5% commission, escrow, vetted suppliers, AI scoring) + 1 CTA "ابدأ الآن — مجاناً". Docs spec was 3-tab pain→solution layout + pricing block. Content present but layout simplified. |
| `/ar/for-suppliers` | ✅ Working (minimal) | 4 benefits (matched RFQs only, payment guarantee, 3% only, free public profile) + CTA "سجّل كمورد". **Docs spec**: 8 benefits + supplier testimonials. Half the content, no testimonials. |
| `/ar/pricing` | ✅ Working | Two cards: عملاء 2% · موردون 3% · إجمالي 5% + VAT 15% on commission only. Matches docs. |
| `/ar/about` | ❌ Missing | 404. Required by [04-screens-inventory.md](04-screens-inventory.md) §A. |
| `/ar/contact` | ❌ Missing | 404. Required. |
| `/ar/suppliers` | ❌ Missing | 404. Required (public supplier directory — separate from gated `/discover`). |
| `/ar/exhibitions` | ❌ Missing | 404. Required (static calendar). |
| `/ar/blog` | ❌ Missing | 404. Required (5 articles per MVP). |
| `/ar/blog/[slug]` | ❌ Missing | 404. Required. |
| `/ar/legal/terms` | ❌ Missing | 404. Required. |
| `/ar/legal/privacy` | ❌ Missing | 404. Required. |

#### Critical states / cross-cutting
- **404 not localized** 🐛 — `/ar/about` and other missing routes render the bare default Next.js 404 page in English ("404: This page could not be found.") instead of the Arabic [app/[locale]/not-found.tsx](app/[locale]/not-found.tsx). RTL is broken on the 404. Severity: P1 — every unknown URL shows wrong-language error.
- **No header navigation component** ⚠️ — links are inline-listed under the hero. Doc inventory implies a persistent top nav.
- **No footer** ⚠️ — required for site map + legal links.
- **No language switcher UI** ⚠️ — must edit URL to change locale.
- **Sentry module-not-found warning** in dev console (`./instrumentation-client.ts`, `./instrumentation.ts`) — wrapped in `.catch`, so it's a noisy soft-warning, not a hard error. Acceptable for dev; should be silenced for prod.
- **`/ar/discover` returns 200 even when logged out** — this is the gated client supplier-discovery page. Either it should redirect to `/login`, or there should be a separate `/suppliers` public directory. Needs verification in Section 1.4.

**Section verdict (initial test)**: 5 of 14 doc-spec routes implemented (one minimally, one with reduced step count). 7 marketing routes outright missing. Marketing surface was **far below MVP completeness** per `04-screens-inventory.md` §A.

---

#### Section 1.1 — Fixes applied (2026-05-15)

Implemented per user request "Do A + B + C + D" before moving to Section 1.2. Placeholder content for D (legal text, blog articles, about copy, exhibitions list) used real Saudi exhibitions (LEAP, Cityscape, GITEX) and the contact email `info@elma3ared.com`.

**Files added/changed:**

| Group | Path | Purpose |
|---|---|---|
| A1 | [app/[locale]/[...rest]/page.tsx](app/[locale]/%5B...rest%5D/page.tsx) | Catch-all that calls `notFound()` → triggers locale-aware [app/[locale]/not-found.tsx](app/%5Blocale%5D/not-found.tsx) |
| A2 | [next.config.ts](next.config.ts), [lib/utils/sentry-stub.ts](lib/utils/sentry-stub.ts) | Turbopack `resolveAlias` for `@sentry/nextjs` → local no-op stub. Warnings gone. |
| B3 | [components/marketing/site-header.tsx](components/marketing/site-header.tsx) | Sticky top header (logo, 7 nav links, locale toggle, login + signup CTAs) |
| B4 | [components/marketing/site-footer.tsx](components/marketing/site-footer.tsx) | 4-column footer (Product · Company · Legal · Contact) + copyright |
| B5 | [components/marketing/locale-toggle.tsx](components/marketing/locale-toggle.tsx) | Client component using `next-intl` `useRouter().replace(pathname, { locale })` to preserve path |
| – | [app/[locale]/(marketing)/layout.tsx](app/%5Blocale%5D/%28marketing%29/layout.tsx) | Wraps marketing pages with header + footer |
| C6 | [app/[locale]/(marketing)/page.tsx](app/%5Blocale%5D/%28marketing%29/page.tsx) (moved from `app/[locale]/page.tsx`) | Hero + 3 ICP tabs + 6-tile value-props grid + 4 featured suppliers + 3 testimonials + closing CTA |
| C7 | [app/[locale]/(marketing)/how-it-works/page.tsx](app/%5Blocale%5D/%28marketing%29/how-it-works/page.tsx) | Added video slot (placeholder) + step 7 (delivery → review). Total 7 steps. |
| C8 | [app/[locale]/(marketing)/for-clients/page.tsx](app/%5Blocale%5D/%28marketing%29/for-clients/page.tsx) | Rewritten with 3 scenarios (booth/gifts/event), each a 3-column pain → solution → result card + features grid |
| C9 | [app/[locale]/(marketing)/for-suppliers/page.tsx](app/%5Blocale%5D/%28marketing%29/for-suppliers/page.tsx) | Expanded to 8 benefit tiles + 3 supplier testimonials |
| D10 | [app/[locale]/(marketing)/about/page.tsx](app/%5Blocale%5D/%28marketing%29/about/page.tsx) | Mission + Vision + 4 values + 3-person team (placeholder names "[Founder 1/2/3]") |
| D11 | [app/[locale]/(marketing)/contact/page.tsx](app/%5Blocale%5D/%28marketing%29/contact/page.tsx) | Email `info@elma3ared.com` + business hours + mailto-form (no backend yet) |
| D12 | [app/[locale]/(marketing)/suppliers/page.tsx](app/%5Blocale%5D/%28marketing%29/suppliers/page.tsx) | Public 6-card directory + city/service filter chips (static) + CTA to sign up |
| D13 | [app/[locale]/(marketing)/exhibitions/page.tsx](app/%5Blocale%5D/%28marketing%29/exhibitions/page.tsx) | LEAP 2027, Cityscape Global 2026, GITEX Saudi Arabia 2026 cards |
| D14 | [app/[locale]/(marketing)/blog/page.tsx](app/%5Blocale%5D/%28marketing%29/blog/page.tsx), [blog/[slug]/page.tsx](app/%5Blocale%5D/%28marketing%29/blog/%5Bslug%5D/page.tsx), [articles.ts](app/%5Blocale%5D/%28marketing%29/blog/articles.ts) | 5 placeholder articles fully bilingual ar/en with `generateStaticParams` |
| D15 | [app/[locale]/(marketing)/legal/terms/page.tsx](app/%5Blocale%5D/%28marketing%29/legal/terms/page.tsx), [legal/privacy/page.tsx](app/%5Blocale%5D/%28marketing%29/legal/privacy/page.tsx) | 6 sections (terms) + 4 sections (privacy) with prominent "placeholder, replace with reviewed legal text" warning banner |
| – | [lib/i18n/messages/ar.json](lib/i18n/messages/ar.json), [lib/i18n/messages/en.json](lib/i18n/messages/en.json) | Extended with `siteHeader`, `siteFooter`, `marketing.{about,contact,suppliersDirectory,exhibitions,blog,legal}`, expanded `home`, `marketing.forClients.tabs/scenarios`, `marketing.forSuppliers.{features.aiAssistTitle,…}` + 3 testimonials, `marketing.howItWorks.{step7,videoCaption,videoPlaceholder}` |
| – | [app/sitemap.ts](app/sitemap.ts) | Added 7 new routes to STATIC_SUFFIXES |

**Re-verified routes after fixes (HTTP probe + browser drive):**

| Route | Before | After | Notes |
|---|---|---|---|
| `/ar` | ⚠️ minimal | ✅ Full marketing layout (badge, hero, ICP tabs ×3, value-props ×6, featured ×4, testimonials ×3, CTA, footer) | Verified in browser |
| `/ar/how-it-works` | ⚠️ 6 steps | ✅ 7 steps + video placeholder | Verified |
| `/ar/for-clients` | ✅ minimal | ✅ 3 pain→solution→result scenarios + features | Verified |
| `/ar/for-suppliers` | ✅ minimal | ✅ 8 benefits + 3 testimonials | Verified |
| `/ar/pricing` | ✅ | ✅ (unchanged) | – |
| `/ar/about` | ❌ 404 | ✅ Mission + Vision + Values + Team | Verified |
| `/ar/contact` | ❌ 404 | ✅ Email + hours + form | Verified |
| `/ar/suppliers` | ❌ 404 | ✅ 6-card directory | Verified |
| `/ar/exhibitions` | ❌ 404 | ✅ 3 exhibition cards (LEAP, Cityscape, GITEX) | Verified |
| `/ar/blog` | ❌ 404 | ✅ 5 article cards | Verified |
| `/ar/blog/<slug>` | ❌ 404 | ✅ 5 article pages | Verified one slug end-to-end |
| `/ar/legal/terms` | ❌ 404 | ✅ 6 placeholder sections | Verified |
| `/ar/legal/privacy` | ❌ 404 | ✅ 4 placeholder sections | Verified via HTTP |
| `/ar/nonexistent` | 🐛 EN default | ✅ Arabic + RTL `not-found.tsx` | Verified |
| `/en/*` (all) | ⚠️ thin | ✅ Same layouts, LTR, English copy, locale switcher button label = "العربية" | Verified `/en` + `/en/legal/terms` |

**Locale toggle**: clicked from `/ar/legal/terms` → URL became `/en/legal/terms` and content switched to English with LTR direction. Path preservation works.

**Header**: present on every marketing page, sticky, with 7 nav links (For Clients, For Suppliers, How it Works, Pricing, Browse Suppliers, Exhibitions, Blog) + locale toggle + Login + Signup CTAs.

**Footer**: present on every marketing page with 4 column groups + copyright.

**Sentry warnings**: gone from `pnpm dev` logs after Turbopack `resolveAlias` to local stub.

**Section 1.1 verdict (post-fix)**: ✅ **Marketing surface complete per `04-screens-inventory.md` §A**. Open follow-ups (P2):
- Real legal copy from counsel before commercial launch (placeholder banner in place)
- Real founder photos + names (currently `[Founder 1/2/3]`)
- Replace static blog with CMS / MDX when ready
- Replace static featured-suppliers + supplier-directory cards with Supabase queries once approved suppliers exceed a handful
- 90s intro video — placeholder slot in `how-it-works`

### Section 1.2 — Authentication

#### Routes probed
| Route | HTTP | Notes |
|---|---|---|
| `/ar/signup` | 200 | Role-choice page (client / supplier cards) |
| `/ar/login` | 200 | Email + password form |
| `/ar/signup/client/account` | 200 | Step 1/2 (fullName, email, phone, password) |
| `/ar/signup/client/company` | 200 | Step 2/2 (companyName, legalName, crNumber, vatNumber, size, industry, city) |
| `/ar/signup/supplier/account` | 200 | Step 1/4 |
| `/ar/signup/supplier/company` | 200 | Step 2/4 (companyName, legalName, crNumber, vatNumber, bio, website) |
| `/ar/signup/supplier/specializations` | 200 | Step 3/4 (services × 4 + cities × 10) |
| `/ar/signup/supplier/documents` | 200 | Step 4/4 (label says "البنك" — bank info: bankName, iban, accountHolderName) |
| `/ar/forgot-password` | 200 | Email-only form |
| `/ar/reset-password` | 200 | Two password fields |
| `/ar/auth/verify-email` | 200 | Static info page after signup |

#### Initial findings (issues collected)

| # | Sev | Issue | Root cause |
|---|---|---|---|
| 1 | 🐛 P0 | Admin completely inaccessible. Login as admin redirected to `/ar/admin` which fell through to the locale catch-all 404 (Section 1.1's fix). Direct visit to `/admin` returned **HTTP 500** — `MobileMenu` calls `usePathname` from `@/lib/i18n/routing` (next-intl) but admin layout has no `NextIntlClientProvider`. | (a) [app/actions/auth.ts:67](app/actions/auth.ts) hard-prepended `/${locale}` to every dashboard path including admin's. (b) [app/admin/layout.tsx](app/admin/layout.tsx) had no `<html>`/`<body>` and no intl provider — children that consumed next-intl crashed. |
| 2 | ⚠️ P1 | Auth pages (login, signup wizards, forgot/reset password, verify-email) had no header / footer / logo / locale toggle / link back to home. A user landing on `/ar/login` had no way back to marketing. | The `(auth)` route group had no `layout.tsx`. |
| 3 | ⚠️ P2 | Supplier signup step 4 is at the route `/signup/supplier/documents/` but the page asks for **bank info** (bankName, iban, accountHolderName), not documents. Stepper label correctly reads "البنك" so users are not confused, but per [04-screens-inventory.md](ai-documents/04-screens-inventory.md) §D the spec is `account → company → specializations → documents (CR + VAT + portfolio + samples)`. | Route name is misleading; doc-upload step is missing entirely. |
| 4 | ✅ | Login wrong-password shows inline Arabic error "بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور." | – |
| 5 | ✅ | Logout works for client + supplier + admin (after fix 1, admin's logout button reachable via mobile menu / desktop sidebar). | – |
| 6 | ✅ | Role-based redirects: client → `/ar/dashboard`, supplier (approved) → `/ar/supplier/rfqs`, admin → `/admin`. | – |
| 7 | ✅ | WizardStepper component already integrated in every wizard step (4 pills with check/current/future states + connecting lines). | – |
| 8 | ⏭️ | `/ar/auth/verify-email` is a static info page; the actual `/api/auth/callback` exchange triggers when the Supabase magic link is clicked. Not driven end-to-end (no real inbox in test environment). | – |

#### Fixes applied (commit `feat(section-1.2)`)
- **Fix 1 — admin login redirect** ([app/actions/auth.ts](app/actions/auth.ts)): branch on `profile.role === 'admin'` and redirect without locale prefix.
- **Fix 2 — admin layout repair** ([app/admin/layout.tsx](app/admin/layout.tsx)): added top-level `<html lang="ar" dir="rtl">` + `<body>` (the parent root layout is a passthrough), wrapped the tree in `NextIntlClientProvider locale="ar" messages={…}`, swapped `Link` from next-intl to plain `next/link` (admin URLs are locale-free), imported global styles + fonts.
- **Fix 3 — auth chrome** ([app/[locale]/(auth)/layout.tsx](app/%5Blocale%5D/%28auth%29/layout.tsx)): minimal sticky header with the same logo as marketing pages + `LocaleToggle`. Auth pages now have a way back to home and locale toggle parity with marketing.
- **Fix 4 — supplier docs upload** is **deferred to Section 1.11** since the actual upload UX belongs on the supplier-pending dashboard (post-signup state). Documented as ⚠️ P2 here, will be closed in 1.11.

#### Re-verified live (post-fix)
- Admin login → `/admin` ✓ (no longer `/ar/admin`).
- `/admin` renders the dashboard ("نظرة عامة" header) ✓ (no 500).
- Mobile-menu opens with all 7 admin nav links + logout button ✓.
- `/ar/login` shows the new auth chrome (logo + English locale toggle) ✓.
- `/ar/signup/supplier/specializations` shows wizard chrome + 4-step stepper (الحساب ✓ · الشركة ✓ · التخصصات ← current · البنك) ✓.
- `/ar/signup/client/account` heading "أنشئ حسابك" + 4 fields, stepper step 1/2 ✓.

#### Section verdict (post-fix)
✅ All P0 and P1 issues closed. One ⚠️ P2 deferred (supplier doc upload — to be implemented in 1.11 on the supplier-pending dashboard).

### Section 1.3 — Client dashboard & settings
_(pending)_

### Section 1.4 — Supplier discovery (client view)
_(pending)_

### Section 1.5 — RFQ creation
_(pending)_

### Section 1.6 — RFQ list & detail (client)
_(pending)_

### Section 1.7 — Chat
_(pending)_

### Section 1.8 — Agreement
_(pending)_

### Section 1.9 — Escrow (client side)
_(pending)_

### Section 1.10 — Reviews & disputes
_(pending)_

### Section 1.11 — Supplier flow
_(pending)_

### Section 1.12 — Cross-role guards
_(pending)_

---

## Phase 2 — Admin flow

### Section 2.1 — Admin dashboard
_(pending)_

### Section 2.2 — Supplier approval
_(pending)_

### Section 2.3 — RFQ oversight
_(pending)_

### Section 2.4 — Chat oversight
_(pending)_

### Section 2.5 — Disputes
_(pending)_

### Section 2.6 — Escrow operations
_(pending)_

### Section 2.7 — Admin gaps vs docs
_(pending)_

---

## Phase 3 — Hardening checks
_(pending)_

---

## Cross-cutting findings
_(filled as discovered)_

---

## Recommended fixes by priority
_(filled at the end)_
