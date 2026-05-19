# Phase U Feature-Flag Guide

The 9 UX Plan v2 flags shipped across Sprints 1–5 are all DSN-style: a
missing or `false` env var keeps the surface on its v1 (pre-Plan-v2)
behavior; setting the value to `true` (or `1`) flips it on without a
redeploy. Source of truth: [`lib/feature-flags.ts`](../lib/feature-flags.ts).

This document maps each env var to (a) what it visually changes, (b)
which pages it affects, (c) what data needs to exist for the change to
be visible.

For the demo, all 9 are ON in `.env.local`. To disable any individually,
set its line to `false`.

## Flag matrix

| Env var | `flags.X` key | Sprint | Visual change | Pages | Data required |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_FF_AI_CONFIDENCE` | `AI_CONFIDENCE_UI` | 1 | 4-level confidence badge (🟢🔵🟡⚪) replaces raw `X/100`. MarketRange "عين السوق" card shows historical band + supplier price marker. AIDisagree popover. AIFallback card for missing AI data. | `/ar/dashboard/rfqs/[id]/compare`, `/ar/dashboard/rfqs/[id]/proposals/[proposalId]` | Proposals with `ai_confidence` + sample_size + variance + price_range populated. Seeded by `pnpm demo:seed`. |
| `NEXT_PUBLIC_FF_RFQ_SINGLE` | `RFQ_SINGLE_SCREEN` | 2 | Single-screen RFQ form with 3 accordion sections (Service / Budget / Files) + Smart Defaults market-range chip on budget pick. | `/ar/dashboard/rfqs/new` | None — works on empty DB. |
| `NEXT_PUBLIC_FF_TRUST` | `TRUST_ARCHITECTURE` | 3 | IdentityBadges (5 verification badges) + TrustBar (Amanah + Disputes + Fazaa). | Compare, supplier discover (`/ar/discover/[id]`), escrow page. | `supplier_trust_signals` rows per supplier. Seeded by `pnpm demo:seed`. |
| `NEXT_PUBLIC_FF_HIJRI` | `HIJRI_DEFAULT` | 4 | All dates render Hijri-first (`١٢ ربيع الأول ١٤٤٧` style) with Gregorian as subline. | Globally — every page that calls `formatDate()`. | None. |
| `NEXT_PUBLIC_FF_PRAYER` | `PRAYER_TIMES` | 4 | Prayer-times widget (Fajr/Dhuhr/Asr/Maghrib/Isha) with next-prayer countdown. Uses `adhan` lib (Umm al-Qura calc, no API). | Day-of Event Console (`/ar/dashboard/rfqs/[id]/event-day`). | An RFQ with `exhibition_city` set. |
| `NEXT_PUBLIC_FF_NUMERALS` | `ARABIC_NUMERALS` | 4 | All numerals render Arabic-Indic (`١٢٣`) instead of Latin (`123`). | Globally — every page that calls `formatNumber()`. | None. |
| `NEXT_PUBLIC_FF_CONCIERGE` | `CONCIERGE_MODE` | 5 | "مُدار بواسطة Elmaared" badge on managed suppliers + warmer copy on dashboard banners (e.g., "فريقنا يبحث لك" vs "X supplier available"). | Dashboard, discover list, supplier detail. | `suppliers.is_concierge_managed=true` on at least one row. Seeded. |
| `NEXT_PUBLIC_FF_CELEBRATION` | `CELEBRATION_MODALS` | 3 | Confetti + modal fires on first RFQ, first deal, 100k SAR GMV, anniversary. Once per user per milestone. | Dashboard (mounts via CelebrationGate sub-component once Phase U4 lands). | `user_milestones` row with `claimed_at IS NULL`. Seeded. |
| `NEXT_PUBLIC_FF_PDPL` | `PDPL_CONSENT` | 5 | PDPL consent banner on first visit, dismissable per browser via localStorage. | Globally — once mounted at root layout in Phase U4. | None. |

## Notes

**Retired flag:** `FF_AMANAH` was removed in Sprint 1 S1.0. "أمانة Elmaared™"
is now the canonical naming; no flag needed. See `lib/i18n/trust-name.ts`.

**Not in the list above:** `NEXT_PUBLIC_FF_MARKET_RANGE` was a draft name
in the original task spec that never made it to code. The MarketRange
component is gated by `NEXT_PUBLIC_FF_AI_CONFIDENCE` along with the rest
of the AI stack.

## Verification

After flipping flags ON and restarting `next dev`:
- Compare page (`/ar/dashboard/rfqs/<demo-rfq-id>/compare`) → 5 proposal cards each show a confidence badge; MarketRange card at the top; AIDisagree button on rows; AIFallback on the null-confidence row.
- Discover supplier detail → 5-badge IdentityBadges array.
- Escrow page (in-escrow RFQ) → TrustBar pillar bar at top.
- Dashboard → CelebrationModal fires once on load (consume the milestone to stop it).
- Settings/profile → 2 toggles (Hijri + Numerals) after Phase U4 lands.

Demo URLs are printed by `pnpm demo:seed` after each seed run.
