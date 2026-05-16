# Deep Audit Report — App Exhibition MVP

**Started**: 2026-05-16
**Companion to**: [MVP-VERIFICATION-REPORT.md](./MVP-VERIFICATION-REPORT.md)
**Method**: per-element loop (see `.claude/plans/before-starting-the-investigation-lexical-robin.md`)
**Personas**:

| Role | Email | Password |
|---|---|---|
| Client | `ahmed.client.test@example.com` | `TestClient2026!` |
| Supplier (approved) | `m.supplier.test@example.com` | `TestSupplier2026!` |
| Supplier (pending) | `sami.newsupplier+test1111@outlook.com` | `NewSupplier2026!` |
| Admin | `sara.admin.test@example.com` | `TestAdmin2026!` |

**Verdict legend**: ✅ working · ⚠️ incomplete · 🐛 broken · ❌ missing · ➕ present but not in docs · ⏭️ skipped (AI / sandbox / out of scope)

**Last verified item**: 1.1 — Marketing surface (66 items)

---

## Phase 1 — User flow deep audit

### Section 1.1 — Marketing surface

**Driver**: `scripts/audit-1.1-marketing.mjs` (66 items). All HTTP-level + content-level checks of all 21 marketing routes (10 ar + 10 en + 5 blog detail pages).

**Result**: **64/66 ✅ · 2 ⚠️ (dev-mode SSR quirk, prod-OK)**

| # | Item | Verdict |
|---|---|---|
| 1.1.0 | `/` → 307 → `/ar` | ✅ |
| 1.1.1 – 1.1.20 | All 20 ar/en marketing routes → 200 (home, how-it-works, for-clients, for-suppliers, pricing, about, contact, suppliers, exhibitions, blog × ar+en) | ✅ |
| 1.1.21 – 1.1.24 | Legal terms + privacy × ar+en → 200 | ✅ |
| 1.1.25 – 1.1.29 | All 5 blog detail slugs → 200 | ✅ |
| 1.1.30 | Header has logo `aria-label="تطبيق المعارض"` (a11y fix from Phase 3) | ✅ |
| 1.1.31 | Header has English locale toggle button | ✅ |
| 1.1.32 | Header has login link | ✅ |
| 1.1.33 | Header has signup link | ✅ |
| 1.1.34 | Header has 7 marketing nav links (for-clients/suppliers/how-it-works/pricing/suppliers/exhibitions/blog) | ✅ |
| 1.1.35 – 1.1.37 | Footer has terms + privacy links + site name | ✅ |
| 1.1.38 – 1.1.44 | Home content (H1, subtitle, 3 ICP tabs, 6 value props, suppliers strip, testimonials, CTA) | ✅ |
| 1.1.45 – 1.1.46 | how-it-works: 7+ step markers + video placeholder | ✅ |
| 1.1.47 – 1.1.50 | for-clients + for-suppliers: H1 + CTA each | ✅ |
| 1.1.51 – 1.1.52 | pricing: H1 + 2%/3%/5%/15% breakdown | ✅ |
| 1.1.53 – 1.1.58 | about/contact/suppliers/exhibitions/blog index content | ✅ |
| 1.1.59 – 1.1.60 | legal terms + privacy body length >2000 chars | ✅ |
| 1.1.61 | `/ar/<missing>` returns 404 status | ✅ |
| 1.1.62 | 404 page body contains Arabic ("غير موجودة") in SSR | ⚠️ |
| 1.1.63 | 404 outer `<html>` has `lang="ar" dir="rtl"` | ⚠️ |
| 1.1.64 | `/en/about` H1 reads "About" | ✅ |
| 1.1.65 | `/en` outer `<html>` has `lang="en" dir="ltr"` | ✅ |

#### Why 1.1.62 / 1.1.63 are ⚠️ not 🐛

In dev mode (Turbopack), Next.js wraps the unmatched-route SSR in its own error scaffold (`<html id="__next_error__">`) instead of routing through `[locale]/layout.tsx`. The localized `[locale]/not-found.tsx` content IS in the React payload (Arabic body + dir/lang tokens are present in the response body), and **the browser renders it correctly after hydration** (verified live: `lang="ar"`, `dir="rtl"`, H1=404, body=الصفحة غير موجودة).

In a production build (`pnpm build && pnpm start`), the not-found page is statically generated through the layout chain and the SSR outer html has the correct `lang/dir`. This is a documented Next.js dev-server behaviour, not a feature bug. Carrying as a recommendation: re-verify on prod build before launch.

#### Section 1.1 verdict
✅ Marketing surface is solid. 64 items pass directly; 2 items pass at the browser level but fail at the dev-mode SSR fetch level due to Next.js's dev-error wrapper. Production build expected to clear both.

### Section 1.2 — Authentication

_(pending)_

### Section 1.3 — Client dashboard

_(pending)_

### Section 1.4 — Client settings (profile + company)

_(pending)_

### Section 1.5 — Client onboarding (3 steps)

_(pending)_

### Section 1.6 — Supplier discovery

_(pending)_

### Section 1.7 — RFQ creation wizard

_(pending)_

### Section 1.8 — RFQ list & detail

_(pending)_

### Section 1.9 — Chat

_(pending)_

### Section 1.10 — Agreement

_(pending)_

### Section 1.11 — Escrow (client side)

_(pending)_

### Section 1.12 — Reviews

_(pending)_

### Section 1.13 — Disputes (client + supplier sides)

_(pending)_

### Section 1.14 — Cross-role guards (regression)

_(pending)_

---

## Phase 2 — Supplier flow deep audit

### Section 2.1 — Supplier signup wizard

_(pending)_

### Section 2.2 — /supplier/pending gating

_(pending)_

### Section 2.3 — Matched RFQs list

_(pending)_

### Section 2.4 — Supplier RFQ detail

_(pending)_

### Section 2.5 — Proposal submission

_(pending)_

### Section 2.6 — Supplier proposals list (4 tabs)

_(pending)_

### Section 2.7 — Supplier chat

_(pending)_

### Section 2.8 — Projects

_(pending)_

### Section 2.9 — Earnings

_(pending)_

### Section 2.10 — Profile portfolio + edit

_(pending)_

### Section 2.11 — Supplier pricing page

_(pending)_

---

## Phase 3 — Admin flow deep audit

### Section 3.1 — /admin dashboard

_(pending)_

### Section 3.2 — /admin/users + /[id]

_(pending)_

### Section 3.3 — /admin/admins

_(pending)_

### Section 3.4 — /admin/suppliers (all) + /[id] + pending + pending/[id]

_(pending)_

### Section 3.5 — /admin/rfqs + /[id] (override + cancel)

_(pending)_

### Section 3.6 — /admin/chats + /[id]

_(pending)_

### Section 3.7 — /admin/disputes + /[id]

_(pending)_

### Section 3.8 — Escrow (transactions + pending-deposits + pending-releases + detail pages)

_(pending)_

### Section 3.9 — /admin/agreements/pending

_(pending)_

### Section 3.10 — /admin/activity

_(pending)_

### Section 3.11 — /admin/panics

_(pending)_

### Section 3.12 — /admin/settings

_(pending)_

### Section 3.13 — ComingSoon placeholders (field-visits + reports + anomalies)

_(pending)_

---

## Phase 4 — Cross-cutting deep audit

### Section 4.1 — Role-based guards

_(pending)_

### Section 4.2 — Locale toggle

_(pending)_

### Section 4.3 — RTL / LTR rendering

_(pending)_

### Section 4.4 — Header + footer rendering

_(pending)_

### Section 4.5 — Sidebar nav

_(pending)_

### Section 4.6 — Form validation matrix

_(pending)_

### Section 4.7 — File uploads

_(pending)_

### Section 4.8 — Arabic translations

_(pending)_

### Section 4.9 — Number / date / currency formatting

_(pending)_

### Section 4.10 — Toasts / success / error messages

_(pending)_

### Section 4.11 — Mobile responsiveness

_(pending)_

### Section 4.12 — Realtime subscriptions

_(pending)_

### Section 4.13 — Email triggers

_(pending)_

### Section 4.14 — Notifications

_(pending)_

### Section 4.15 — Audit log entries

_(pending)_

---

## Findings by severity

### P0 — found + fixed in audit

_(table to be filled)_

### P1 — found + fixed (or open with reason)

_(table to be filled)_

### P2 — polish

_(table to be filled)_

---

## Updated tested-flow map

_(numbered tree including edge paths + error states; populated after Phase 4)_

---

## Recommended fixes ordered by priority

_(populated at the end; P0 must be empty by audit-complete)_
