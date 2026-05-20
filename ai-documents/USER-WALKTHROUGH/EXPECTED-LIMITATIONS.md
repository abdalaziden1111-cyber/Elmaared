# Phase X — Expected limitations (not bugs)

These behaviours were observed during the walkthrough but are intentional consequences of how the dev environment is configured. They are documented here so that future testers don't re-log them in [BUGS.md](BUGS.md).

## Mock AI features

The flag `NEXT_PUBLIC_FF_AI_REAL=false` is set in `.env.local`. While this flag is off, AI features run on **pre-seeded mock data** rather than real model output:

| Feature | What's mocked | Where to look |
|---|---|---|
| Proposal scoring (V1.1) | New proposals get a `[mock]` AI summary instead of a real one | `/ar/dashboard/rfqs/<open>/compare` shows `[mock]` in the AI section |
| Risky clauses analysis (V1.2) | Pre-seeded `ai_risky_clauses` rows on `agreements` | `/ar/dashboard/rfqs/<esc>/agreement` shows the 3 demo chips with `[mock]` recommendation |
| Lead scoring (V1.3) | W2.5 seeds 20 lead rows with `[mock]`-prefixed narratives | `/admin/leads` shows the W2.5 narratives |
| AI score cache | Hot-cached entries from W2.3 | `ai_score_cache` table |

**To switch on real AI:** set `NEXT_PUBLIC_FF_AI_REAL=true` and provide `AI_GATEWAY_API_KEY` in `.env.local`. See [`PHASE-V-FLAG-GUIDE.md`](../PHASE-V-FLAG-GUIDE.md).

## Unconfigured 3rd-party services

These services are wired but not credentialled in dev. The app **degrades gracefully** — the surface still renders with a placeholder hint rather than crashing.

| Service | Effect when missing | Surface impact |
|---|---|---|
| PostHog (`POSTHOG_PROJECT_ID`, `POSTHOG_API_KEY`) | Funnel + DAU blocks render "configure" placeholders | `/admin/analytics` — top 2 blocks |
| Sentry (`SENTRY_DSN`) | Errors log to console only | None visible in UI |
| Resend (`RESEND_API_KEY` with verified domain) | Emails log to dev console instead of sending | Notifications dispatcher, lead alerts, RFQ match emails |
| AI Gateway (`AI_GATEWAY_API_KEY`) | All AI calls fall back to mocks | Same effect as `FF_AI_REAL=false` |

None of these are bugs against Phase V's design — Phase V explicitly chose graceful degradation over hard dependencies on these services.

## Local-DB analytics blocks (still work)

The same `/admin/analytics` page renders two locally-computed blocks **without** PostHog: top service categories ("أهم فئات الخدمة") and geographic distribution ("التوزّع الجغرافي"). These read directly from `rfqs` and populate even with no PostHog key. See [B-012](BUGS.md#b-012-p3-admin-analytics-geographic-distribution-splits-same-city-by-language) for a real bug in the geographic block.

## Sparse historical data on W2.9 supplier KPIs

The W2.9 seed creates ~30 proposals across the past 12 months. Depending on the seed run date, the most recent 1–2 months may be empty. The "إيراد آخر شهر = 0 ريال" KPI on the supplier dashboard is technically correct — there genuinely is no released-escrow revenue for that month in the seed. This is not a bug; it reflects the seed's date distribution. If you want the most-recent-month KPI to populate, weight the W2.9 date distribution toward "now" instead of evenly across 12 months.

## Status badge mixing English + Arabic

A handful of admin surfaces show English status enum values (e.g. `active` on `/admin/agreements/pending`, `evidence-only` on `/admin/settings`, `proposal_submitted` on `/admin/activity`) while sibling surfaces use translated Arabic strings (`مكتمل`, `قيد الضمان`, `مفتوح`). This is a known stylistic gap rather than a bug — the English values are the underlying enum slugs, and translating them is a label-table chore, not a code fix. Left for a future polish pass.

## 3rd-party browser-extension noise

Three findings ([B-005, B-006, B-007](BUGS.md#p4--nitpick-polish-opportunity)) are caused by Chrome extensions installed on the tester's browser injecting DOM before React hydrates. None reproduce in a clean Chrome profile or in `pnpm build && pnpm start`. They're logged for completeness but no app changes are needed.

## What's NOT a limitation

These observed behaviours are *actual bugs* and are in [BUGS.md](BUGS.md), not here:

- Supplier has no chats route — that's [B-010 P1](BUGS.md#b-010-p1-supplier-has-no-chats-ui--arsupplierchats-and-archats-both-404), a real product gap, not a mock-feature limitation.
- Donut chart sliver — that's [B-009 P2](BUGS.md#b-009-p2-supplier-dashboard-category-donut-renders-emptysliver), a rendering bug.
- Login lag — that's [B-008 P2](BUGS.md#b-008-p2-supplier-login-client-side-redirect-lags-9s-after-server-returns-303), a perceived-perf bug.
- City dedup — that's [B-012 P3](BUGS.md#b-012-p3-admin-analytics-geographic-distribution-splits-same-city-by-language), a real aggregation bug.

The distinction matters: limitations should be fixed by *configuration* (flags, keys), bugs should be fixed by *code*.
