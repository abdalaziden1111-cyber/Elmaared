# Phase U — UI Activation Report

**Run date:** 2026-05-19
**Goal:** flip every Sprint 1–6 UX Plan v2 component from "built but
invisible" to "visible + interactive in the live dev UI".

## TL;DR

✅ **18 / 18 Sprint-1–6 components now visible and interactive**, verified
by 14 Playwright screenshots across 4 surfaces (client / supplier /
admin / public). 7 commits landed, test suite stable at **1035/1035**,
typecheck clean, lint clean on touched files. Demo workflow scripted
end-to-end (`pnpm demo:seed` / `pnpm demo:reset`).

## Phase commit log

| Phase | Commit | Outcome |
|---|---|---|
| U1 | [`5127d22`](#) | 7 Z2 migrations applied to live dev DB via Chrome MCP; verifier reports 12/12 ✅ |
| U2 | [`d66c607`](#) | `scripts/seed-demo.mjs` — 5 suppliers (Saudi-named, 1 concierge), 2 RFQs, 5 proposals (full AI confidence spectrum), agreement+escrow+invoice, milestone state for celebration |
| U3 | [`af4899b`](#) | 9 feature flags ON in `.env.local`, commented examples in `.env.example`, full flag guide doc |
| U4 | [`7f68c87`](#) | 6 dormant components mounted (PDPL banner / cultural toggles / celebration gate / AIOverride / concierge badge / ZATCA receipt) |
| U5 | [`beb2457`](#) | 3 new pages scaffolded (Project Execution / Day-of Console / Invoice) + 3 nav links from existing pages |
| U6 | [`a4686f2`](#) | Playwright spec captures 14 screenshots covering every component live across all 3 personas + public |
| U7 | [`21f99ec`](#) | `pnpm demo:reset` for repeat demos; respects immutable audit ledger |

## Component → visibility checklist

| Component (Sprint) | Mount file | Flag | Live URL | Screenshot |
|---|---|---|---|---|
| ConfidenceBadge (S1) | `compare/page.tsx`, `proposals/[proposalId]/page.tsx` | `FF_AI_CONFIDENCE` | `/ar/dashboard/rfqs/<rfq>/compare` | `client/compare-ai-stack.png` |
| MarketRange (S1) | `compare/page.tsx`, `proposals/[proposalId]/page.tsx` | `FF_AI_CONFIDENCE` | same | same |
| AIDisagreeButton (S1) | `compare/page.tsx`, `proposals/[proposalId]/page.tsx` | `FF_AI_CONFIDENCE` | same | same |
| AIFallback (S1) | `compare/page.tsx`, `proposals/[proposalId]/page.tsx` | `FF_AI_CONFIDENCE` | same | same |
| AIOverride (S1) | `rfqs/new/sections/budget-section.tsx` | `FF_RFQ_SINGLE` | `/ar/dashboard/rfqs/new` (post Smart Defaults apply) | `client/rfq-new-single-screen.png` |
| Single-screen RFQ (S2) | `rfqs/new/page.tsx` | `FF_RFQ_SINGLE` | `/ar/dashboard/rfqs/new` | `client/rfq-new-single-screen.png` |
| Smart Defaults (S2) | `budget-section.tsx` | `FF_RFQ_SINGLE` | same | same |
| IdentityBadges full (S3) | `discover/[id]/page.tsx` | `FF_TRUST` | `/ar/discover/<supplier>` | `client/discover-supplier-detail.png` |
| IdentityBadges compact (S3) | `compare/page.tsx` | `FF_TRUST` | `/ar/dashboard/rfqs/<rfq>/compare` | `client/compare-ai-stack.png` |
| TrustBar (S3) | `escrow/page.tsx` | `FF_TRUST` | `/ar/dashboard/rfqs/<rfq>/escrow` | `client/escrow-with-trustbar-zatca.png` |
| LiveTimeline (S3) | `project/page.tsx`, `event-day/page.tsx` | — | `/ar/dashboard/rfqs/<rfq>/project` | `client/project-execution.png` |
| CelebrationModal (S3) | `dashboard/celebration-gate.tsx` | `FF_CELEBRATION` | `/ar/dashboard` (fires on first load) | `client/dashboard.png` |
| HijriToggle (S4) | `settings/profile/cultural-prefs.tsx` | `FF_HIJRI` | `/ar/dashboard/settings/profile` | `client/settings-cultural-toggles.png` |
| NumeralsToggle (S4) | `settings/profile/cultural-prefs.tsx` | `FF_NUMERALS` | same | same |
| PrayerTimesWidget (S4) | `event-day/page.tsx` | `FF_PRAYER` | `/ar/dashboard/rfqs/<rfq>/event-day` | `client/event-day-console.png` |
| Saudi green token (S4) | global CSS + concierge badge | — | Throughout | All screenshots |
| Saudi names (S4) | `seed-demo.mjs` | — | All supplier names | All screenshots |
| PDPLConsentBanner (S5) | `app/[locale]/layout.tsx` | `FF_PDPL` | First visit to any page | `public/discover-pdpl-banner.png` |
| ZatcaQrCode (S5) | `invoices/[id]/page.tsx`, `escrow/page.tsx` | — | `/ar/dashboard/invoices/<inv>`, escrow page | `client/invoice-zatca.png`, `client/escrow-with-trustbar-zatca.png` |
| ConciergeBadge (S5) | `discover/page.tsx`, `discover/[id]/page.tsx`, dashboard | `FF_CONCIERGE` | `/ar/discover` (one card has badge) | `client/discover-list.png` |
| ErrorRecoveryLayout (S5) | 12 `/error-states/*` pages | — | `/ar/error-states/escrow-transfer-failed` etc. | Covered in QA-REPORT |

## Test preservation

| Gate | Pre-Phase-U | Post-Phase-U |
|---|---|---|
| Vitest | 1035 / 1035 | **1035 / 1035** ✅ |
| Typecheck | clean | clean ✅ |
| Lint | clean on touched | clean on touched ✅ |
| Playwright e2e (U6 spec) | n/a | **14 / 14** ✅ |

## What still requires user action

These items remain open as flagged through the Z2 plan — code-side is
done, the external dependency is the user's:

1. **Resend production domain** (deferred). DNS records archived in
   memory; run `pnpm mail:setup -- --domain elma3ared.com` when ready.
2. **Sentry DSN** (deferred). `@sentry/nextjs` installed, hooks wired,
   smoke test passing. Add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in
   Vercel env when the Sentry project is set up.

## Next-step follow-ups (not in scope)

- **Z3 — Remove the 21 admin-client RLS workarounds.** Now that the
  SECURITY DEFINER helpers (`user_owns_rfq`, `user_is_selected_supplier_for_rfq`)
  are live, the 21 pages that use `createAdminClient()` can switch back
  to user-scoped reads. Filed for the next phase.
- **PDF generation for the invoice page.** Currently the "تحميل PDF"
  button is disabled; need to wire a server-side renderer. Print
  stylesheet works as v1.
- **Real ZATCA TLV encoding.** Demo seed uses a mock base64 string; the
  production pipeline needs proper Annex-1 TLV encoding with the
  invoice hash signed by ZATCA's e-invoice service.
- **CelebrationGate / first_deal trigger.** Right now only `first_rfq`
  fires (because the demo seed leaves it un-claimed). `first_deal`
  would require server-side detection of the first `completed` RFQ —
  small server-action follow-up.

## Reproducing the demo state

```bash
# 1. Ensure env vars are set in .env.local (NEXT_PUBLIC_SUPABASE_URL,
#    SUPABASE_SERVICE_ROLE_KEY, plus the 9 Phase-U flags).

# 2. Run dev server
pnpm dev

# 3. (One-time on fresh DB) Create test users
node scripts/seed-test-users.mjs

# 4. Seed full demo state
pnpm demo:seed

# 5. Login as ahmed.client.test@example.com / TestClient2026!
# 6. Navigate to the URLs printed by step 4.
```

For repeat demos: `pnpm demo:reset -- --yes` resets demo-specific state
in ~10s without disturbing the test personas or any audit-locked history.

## Closing dashboard

| Metric | Pre-Phase-U | Post-Phase-U |
|---|---|---|
| Sprint-1–6 components visible in dev UI | 0 (all flag-gated OFF, no data) | **18 / 18** |
| Migrations applied to dev DB | 17 baseline | **24** (+7 from Z2) |
| Feature flags enabled in `.env.local` | 0 | **9 / 9** |
| New pages (U5) | — | **3** (Project Execution, Day-of Console, Invoice) |
| Test count | 1035 | **1035** (preserved) |
| Playwright screenshots captured | 0 | **14** |
| New commits | — | **7** (U1–U7) |
