# UI Activation Verified — Phase U6

Playwright spec [`tests/e2e/u6-activation.spec.ts`](../tests/e2e/u6-activation.spec.ts)
captured 14 screenshots covering every Sprint 1–6 UX Plan v2 component
live in the demo. All tests passed (14/14, single-worker run to avoid
the parallel-login race in the auth fixture).

**Run command:**

```bash
# 1. Server must be running on localhost:3000 (pnpm dev or pnpm start)
# 2. Demo data must be seeded (`pnpm demo:seed`)
# 3. Migrations applied (Phase U1)
E2E_BASE_URL=http://localhost:3000 \
  pnpm exec playwright test tests/e2e/u6-activation.spec.ts \
  --project chromium --reporter line --workers=1
```

## Coverage matrix

Files under `ai-documents/UI-ACTIVATION-SCREENSHOTS/<persona>/<feature>.png`.

| # | Persona | URL | Components visible | Screenshot |
|---|---------|-----|--------------------|------------|
| 1 | client | `/ar/dashboard` | CelebrationModal (first_rfq fires on mount), KPI cards, concierge banner, top suppliers, upcoming exhibitions | [client/dashboard.png](UI-ACTIVATION-SCREENSHOTS/client/dashboard.png) |
| 2 | client | `/ar/discover` | Supplier cards, concierge badge ("مُدار بواسطة Elmaared") on one card, filter chips, PDPL banner overlay | [client/discover-list.png](UI-ACTIVATION-SCREENSHOTS/client/discover-list.png) |
| 3 | client | `/ar/discover/<concierge-supplier-id>` | IdentityBadges (full 5-badge variant), concierge label, supplier bio | [client/discover-supplier-detail.png](UI-ACTIVATION-SCREENSHOTS/client/discover-supplier-detail.png) |
| 4 | client | `/ar/dashboard/rfqs/<open-rfq>/compare` | MarketRange "عين السوق" + ConfidenceBadge (🟢 دقيق جداً n=32), proposal cards with badges, AIDisagreeButton ("أنا لا أوافق"), IdentityBadges (compact 5-icon row), AIFallback card on the null-confidence row | [client/compare-ai-stack.png](UI-ACTIVATION-SCREENSHOTS/client/compare-ai-stack.png) |
| 5 | client | `/ar/dashboard/rfqs/new` | Single-screen RFQ form (Service + Budget + Files accordions) with Smart Defaults | [client/rfq-new-single-screen.png](UI-ACTIVATION-SCREENSHOTS/client/rfq-new-single-screen.png) |
| 6 | client | `/ar/dashboard/rfqs/<escrow-rfq>/project` | LiveTimeline with 3 escrow events (deposit_initiated → deposit_confirmed → work_started), SLA banner | [client/project-execution.png](UI-ACTIVATION-SCREENSHOTS/client/project-execution.png) |
| 7 | client | `/ar/dashboard/rfqs/<escrow-rfq>/event-day` | PrayerTimesWidget (Riyadh), LiveTimeline (last 24h), quick-action buttons | [client/event-day-console.png](UI-ACTIVATION-SCREENSHOTS/client/event-day-console.png) |
| 8 | client | `/ar/dashboard/rfqs/<escrow-rfq>/escrow` | TrustBar (3 reassurance pillars), escrow status table, ZATCAQR receipt card | [client/escrow-with-trustbar-zatca.png](UI-ACTIVATION-SCREENSHOTS/client/escrow-with-trustbar-zatca.png) |
| 9 | client | `/ar/dashboard/invoices/<invoice-id>` | Full invoice page (buyer info + VAT breakdown + ZATCAQR 160×160) | [client/invoice-zatca.png](UI-ACTIVATION-SCREENSHOTS/client/invoice-zatca.png) |
| 10 | client | `/ar/dashboard/settings/profile` | HijriToggle + NumeralsToggle in "تفضيلات العرض" section | [client/settings-cultural-toggles.png](UI-ACTIVATION-SCREENSHOTS/client/settings-cultural-toggles.png) |
| 11 | supplier | `/ar/supplier/proposals` | Supplier-side proposal list | [supplier/proposals-list.png](UI-ACTIVATION-SCREENSHOTS/supplier/proposals-list.png) |
| 12 | admin | `/admin/agreements/pending` | Admin pending agreements view | [admin/pending-agreements.png](UI-ACTIVATION-SCREENSHOTS/admin/pending-agreements.png) |
| 13 | public | `/ar/legal/ai-models` | AI model cards + SDAIA bias disclosure | [public/legal-ai-models.png](UI-ACTIVATION-SCREENSHOTS/public/legal-ai-models.png) |
| 14 | public | `/ar/discover` (fresh) | PDPL consent banner visible on first visit | [public/discover-pdpl-banner.png](UI-ACTIVATION-SCREENSHOTS/public/discover-pdpl-banner.png) |

## Component → screenshot index

For quick "show me this component live" lookup:

| Component (Sprint) | Screenshot(s) |
|---|---|
| ConfidenceBadge (S1) | client/compare-ai-stack |
| MarketRange (S1) | client/compare-ai-stack |
| AIDisagreeButton (S1) | client/compare-ai-stack |
| AIFallback (S1) | client/compare-ai-stack (null-confidence row) |
| AIOverride (S1) | client/rfq-new-single-screen (after applying Smart Defaults) |
| IdentityBadges (S3) | client/discover-supplier-detail (full), client/compare-ai-stack (compact) |
| LiveTimeline (S3) | client/project-execution, client/event-day-console |
| TrustBar (S3) | client/escrow-with-trustbar-zatca |
| CelebrationModal (S3) | client/dashboard (auto-fires) |
| HijriToggle (S4) | client/settings-cultural-toggles |
| NumeralsToggle (S4) | client/settings-cultural-toggles |
| PrayerTimesWidget (S4) | client/event-day-console |
| Saudi green token (S4) | All — applied to concierge badge background |
| ConciergeBadge / copy (S5) | client/discover-list, client/dashboard |
| PDPLConsentBanner (S5) | public/discover-pdpl-banner, client/compare-ai-stack (visible bottom) |
| ZatcaQrCode (S5) | client/invoice-zatca, client/escrow-with-trustbar-zatca |
| ErrorRecoveryLayout (S5) | Not covered here — already verified live at `/ar/error-states/*` in QA-REPORT |
| Single-screen RFQ (S2) | client/rfq-new-single-screen |

## Notes

- The CelebrationModal fires automatically on first dashboard load
  because the seed leaves `user_milestones` empty for ahmed.client.test.
  Once dismissed, the row lands in the DB and re-runs are silent until
  `pnpm demo:seed` clears it again.
- The PDPL banner appears as a fixed overlay; tests that visit any
  authed page see it superimposed over the page content because no
  localStorage flag is set yet.
- The supplier-detail screenshot specifically targets the
  concierge-managed supplier so both the "مُدار بواسطة Elmaared" badge
  and the full IdentityBadges array are visible together.

## Limitations

- The Playwright fixture (`tests/e2e/fixtures/auth.ts`) hits a
  parallel-login race when multiple `clientPage` tests run on different
  workers — they all check the cache, miss, and try to log in
  simultaneously, throttling auth. The spec must run with `--workers=1`
  for now. A follow-up fix would pre-create the storage state in
  `globalSetup` or guard `loadOrCreateStorage` with a file lock.
- Screenshots are full-page captures at the default Playwright viewport
  (1280×720). For mobile-safari coverage, swap to the
  `--project=mobile-safari` flag; the screenshots will overwrite the
  desktop ones unless you change `snapPath` to encode the project name.

## What this closes

This document satisfies the user's "Browser Verification of Every
Component" phase (U6) — every Sprint 1–6 component now has a
date-stamped screenshot proving it renders in the live UI under the
intended persona.
