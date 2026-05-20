# Phase W6 — Phase V activation verified

Companion to [Phase U6 verified](./UI-ACTIVATION-VERIFIED.md). Tracks the
screenshot coverage of every Phase V surface.

**Spec:** [`tests/e2e/w6-activation.spec.ts`](../tests/e2e/w6-activation.spec.ts).

**Run command:**

```bash
# Pre-reqs: W1 migrations applied + W2 demo:seed run + dev server up
E2E_BASE_URL=http://localhost:3000 \
  pnpm exec playwright test tests/e2e/w6-activation.spec.ts \
  --project chromium --reporter line --workers=1
```

## Coverage matrix

Files under `ai-documents/W6-SCREENSHOTS/<persona>/<feature>.png`. Run the
spec above to populate them.

| # | Persona | URL | Surface | Screenshot |
|---|---------|-----|---------|------------|
| 1 | client | `/ar/dashboard` | W2.1 — CelebrationModal fires for `500k_gmv` (unclaimed in seed) | `client/dashboard-celebration-modal.png` |
| 2 | client | `/ar/dashboard/notifications` | V4.1 — 8 filter tabs, 30 seeded rows, 9 unread badge, real-time channel armed | `client/notifications-page.png` |
| 3 | client | `/ar/dashboard/notifications/preferences` | V4.2 — per-type opt-out grid, quiet-hours pickers, digest, sound toggle | `client/notifications-preferences.png` |
| 4 | client | `/ar/dashboard/rfqs/<demo-esc-rfq>/agreement` | V1.2 + W4.3 — "تحليل قانوني متاح" badge + `<RiskyClauses>` with 3 severity chips | `client/agreement-risky-clauses.png` |
| 5 | client | `/ar/blog` | V5.3 — DB-backed list (5 migrated + 1 W2.8 published), pagination, tag filter | `client/blog-list.png` |
| 6 | client | `/ar/blog/demo-w2-published` | V5.3 — full post, share buttons, related, reading time | `client/blog-post-detail.png` |
| 7 | supplier | `/ar/supplier/dashboard` | V6 — 6 KPI cards + 4 recharts populated by W2.9 (30 proposals / 8 projects / 25 reviews) | `supplier/kpi-dashboard.png` |
| 8 | supplier | `/ar/supplier/notifications` | W4.2 — mirror page reusing the client island | `supplier/notifications-mirror.png` |
| 9 | admin | `/admin/leads` | V1.3 — 20 W2.5 leads sorted hot→warm→cold with signal chips + tooltips | `admin/leads-dashboard.png` |
| 10 | admin | `/admin/analytics` | V3 — funnel + 30-day DAU bar + top categories + geo (PostHog blocks degrade to "configure" hints) | `admin/analytics-dashboard.png` |
| 11 | admin | `/admin/blog` | V5.2 — 3 W2.8 demo posts (1 published / 1 scheduled / 1 draft) + 5 migrated | `admin/blog-list.png` |
| 12 | admin | `/admin/blog/new` | V5.2 — Tiptap bilingual editor (RTL Arabic + LTR English panes) | `admin/blog-new-editor.png` |

## Component → screenshot index

For quick "show me this Phase V surface live" lookup:

| Component / feature (Phase) | Screenshot(s) |
|---|---|
| CelebrationModal — `500k_gmv` (V2.1) | client/dashboard-celebration-modal |
| `<NotificationsClient>` filter tabs (V4.1) | client/notifications-page, supplier/notifications-mirror |
| `<PreferencesForm>` (V4.2) | client/notifications-preferences |
| `<RiskyClauses>` panel (V1.2) | client/agreement-risky-clauses |
| "تحليل قانوني متاح" badge (W4.3) | client/agreement-risky-clauses |
| Public blog (V5.3) | client/blog-list, client/blog-post-detail |
| `<ShareButtons>` (V5.3) | client/blog-post-detail |
| `<RevenueBarChart>` + 3 other charts (V6) | supplier/kpi-dashboard |
| Lead category chips (V1.3) | admin/leads-dashboard |
| Admin analytics funnel (V3) | admin/analytics-dashboard |
| Tiptap admin editor (V5.2) | admin/blog-new-editor |

## Real-time tab test (manual)

The Playwright spec doesn't try to script the two-tab realtime check
because Supabase Realtime + Playwright is flaky in CI. To verify locally:

1. Open `/ar/dashboard/notifications` in two browser windows as ahmed.
2. In a third tab, sign in as a demo supplier and submit a new proposal
   on `RFQ-DEMO-OPEN-*`.
3. Confirm: both ahmed windows show the new "عرض جديد على طلبك"
   notification appear at the top within ~1 second, without page
   refresh. Sound plays once per window if `sound_enabled=true`.

## Limitations

- **PostHog charts will render "configure" placeholders** until you set
  `POSTHOG_PROJECT_ID` + `POSTHOG_API_KEY` in `.env.local`. The page
  itself still renders + the local-DB sections (top categories, geo)
  work without PostHog.
- **AI features run on W2 mock-seeded data** (`NEXT_PUBLIC_FF_AI_REAL=false`).
  The risky-clauses panel + leaderboard narratives + ai_score_cache
  entries are all pre-populated rows, not real API output. Live AI
  scoring needs `NEXT_PUBLIC_FF_AI_REAL=true` + `AI_GATEWAY_API_KEY`.

## What this closes

This document satisfies the user's "Browser Verification of Every Phase V
Component" phase (W6) once the spec is run with the demo seeded — every
Phase V surface gets a date-stamped screenshot proving it renders in the
live UI under the intended persona.

## Last run

**2026-05-20 16:38 UTC** — `pnpm exec playwright test tests/e2e/w6-activation.spec.ts --project chromium --workers=1`: **12 passed (40.3s)**. All 12 screenshots captured to `ai-documents/W6-SCREENSHOTS/<persona>/*.png`.

Spot-checks confirmed visually:
- `admin/leads-dashboard.png` — 20 leads sorted hot 🔥 → warm 🟡 → cold ❄ with category chips and signal stats.
- `supplier/kpi-dashboard.png` — 33 proposals, 58.3% acceptance, 4.8★ avg, 1 active project, all 4 charts populated (revenue bars, category donut, win-rate bars, satisfaction line).
- `client/agreement-risky-clauses.png` — 3 severity-coded chips render (high red / medium amber / low blue) with the W4.3 "تحليل قانوني متاح" badge above the AI section. Recommendation prefixed `[mock]` so seed origin is visible.
