# Phase V feature-flag guide

Companion to [PHASE-U-FLAG-GUIDE.md](./PHASE-U-FLAG-GUIDE.md). Phase V
shipped 9 commits worth of new surfaces — most don't need flag-gating
because the Phase V code is production-quality and the surfaces degrade
gracefully when their underlying data is empty.

## The one new flag

| Env var | `flags.X` key | Phase | What it controls |
|---|---|---|---|
| `NEXT_PUBLIC_FF_AI_REAL` | `AI_REAL` | V1.1 | When `true` **and** `AI_GATEWAY_API_KEY` is configured, scoring (`lib/ai/score-proposal.ts`) + agreement analysis (`lib/ai/analyze-agreement.ts`) hit the real Vercel AI Gateway → Anthropic Claude Sonnet 4.6. When `false` (or no key), both functions write clearly-marked `[mock]` summaries and the live UI is carried by the W2 seed data (`ai_score_cache` + pre-populated `ai_summary` / `ai_risky_clauses` rows tagged `model: 'mock-seed'`). |

**Default in `.env.local`: `false`.** This is the safer activation
default — you can walk every Phase V surface, see mock data render
correctly, then flip to `true` only when you've added a gateway key and
explicitly want to incur per-call cost (capped at $1/user/day by V1.1).

## Flags that were proposed but NOT added (and why)

The Phase W activation plan proposed five additional flags. Each was
audited against the Phase V code and dropped because the surfaces don't
need flag-gating:

| Proposed flag | Why skipped |
|---|---|
| `FF_LEAD_SCORING` | `/admin/leads` is admin-only and shows an empty-state message when `lead_scores` is empty. No risk to non-admin users; no flag value over `requireRole(['admin'])`. |
| `FF_BLOG_CMS` | `/admin/blog` is admin-only with the same empty-state pattern. Public blog at `/ar/blog` falls back to "no posts" gracefully. |
| `FF_NOTIFICATIONS_V2` | The new notifications page replaces the old one at the same URL (`/dashboard/notifications`). Old code is removed — no flip-back path exists, so a flag couldn't change anything. |
| `FF_SUPPLIER_KPI` | `/supplier/dashboard` is the supplier landing for approved accounts. Pending suppliers go to `/supplier/pending`. Same `requireRole` + status check that already gates everything in `/supplier/*`. |
| `FF_AI_LEGAL_REVIEW` | The `<RiskyClauses>` panel only renders when `ai_risky_clauses?.length > 0`. Empty array (the default for every existing agreement) = no panel. A flag would be redundant with the data-presence check. |

The net effect: gating each surface with an env-var flag would have been
~half a day per surface for no rollback win — Phase V code paths already
behave correctly when their data is empty.

## Phase U flags (regression check — verify still on in `.env.local`)

| Env var | Default in dev | What breaks if off |
|---|---|---|
| `NEXT_PUBLIC_FF_AI_CONFIDENCE` | `true` | Compare page falls back to raw scores, no MarketRange, no AIFallback |
| `NEXT_PUBLIC_FF_RFQ_SINGLE` | `true` | RFQ creation reverts to multi-step wizard |
| `NEXT_PUBLIC_FF_TRUST` | `true` | IdentityBadges + TrustBar hidden |
| `NEXT_PUBLIC_FF_HIJRI` | `true` | Dates render Gregorian-only |
| `NEXT_PUBLIC_FF_PRAYER` | `true` | PrayerTimesWidget hidden on Event Day console |
| `NEXT_PUBLIC_FF_NUMERALS` | `true` | Numbers render Latin (`123`) instead of Arabic-Indic (`١٢٣`) |
| `NEXT_PUBLIC_FF_CONCIERGE` | `true` | "مُدار بواسطة Elmaared" badge + warmer copy disappear |
| `NEXT_PUBLIC_FF_CELEBRATION` | `true` | Confetti modal on milestones won't fire |
| `NEXT_PUBLIC_FF_PDPL` | `true` | PDPL consent banner hidden on first visit |

## Verification

After adding `NEXT_PUBLIC_FF_AI_REAL=false` to `.env.local` (default for
the activation pass):

1. Restart `pnpm dev`.
2. Submit a fresh proposal as a demo supplier.
3. The `proposals.ai_summary` column should populate with `[mock — set NEXT_PUBLIC_FF_AI_REAL=true + AI_GATEWAY_API_KEY to enable real scoring]`.
4. No row appears in `ai_usage_log` (because the gateway was bypassed).

When you eventually flip to `true`:

1. Add `AI_GATEWAY_API_KEY=...` to `.env.local`.
2. Set `NEXT_PUBLIC_FF_AI_REAL=true`.
3. Restart `pnpm dev`.
4. Submit a fresh proposal. Within ~5 seconds the proposal row gets a
   real Arabic summary, the daily-cap check fires (`assertDailyBudget`),
   and a row lands in `ai_usage_log` with positive `cost_usd`.
