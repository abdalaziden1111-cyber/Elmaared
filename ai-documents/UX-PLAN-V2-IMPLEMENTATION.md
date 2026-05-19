# UX Plan v2 — Implementation Tracker (Unified)

**Source plan:** `/Users/rakanrakan/.claude/plans/users-rakanrakan-downloads-ux-design-pl-snuggly-brooks.md`
**Source HTML:** `/Users/rakanrakan/Downloads/UX_Design_Plan_v2.html`
**Started:** 2026-05-19

This file is the **single source of truth** for what's live and what's in flight across Sprints 1-6. Per-sprint deep reports stay as historical record (`SPRINT-0-REPORT.md`, etc.) — this is the umbrella.

---

## Status Dashboard

| Sprint | Status | Items | Verified | Notes |
|--------|--------|-------|----------|-------|
| Pre-Sprint 0 | ✅ Done | F.1, F.1b, F.2, F.3 | ✅ | Feature flags + analytics + research tracker |
| Sprint 0 | ✅ Done | S0.1, S0.2, S0.3 | ✅ | Competitor badge, Escrow→أمانة (flag), microcopy |
| **Sprint 1** | 🟡 In progress | S1.0–S1.7 | — | Amanah-default cleanup + AI Confidence |
| Sprint 2 | ⏳ Queued | S2.1–S2.4 | — | RFQ Wizard → Single-Screen |
| Sprint 3 | ⏳ Queued | S3.1–S3.5 | — | Trust Architecture (4 layers) |
| Sprint 4 | ⏳ Queued | S4.1–S4.8 | — | Saudi Cultural Layer |
| Sprint 5 | ⏳ Queued | S5.1–S5.4 | — | Failure Modes + Concierge + Regulatory |
| Sprint 6 | ⏳ Queued | S6.1–S6.9 | — | Performance / Core Web Vitals |

**Deferred (Future Work):** WCAG 2.2 AAA upgrade (Δ3, post-launch sprint).

---

## Live Feature Flags

Default `OFF` unless noted. Flip via `NEXT_PUBLIC_FF_*=true` in `.env.local` (dev) or Vercel env (prod). No redeploy required.

| Flag | Sprint | Status | Notes |
|------|--------|--------|-------|
| `FF_AMANAH` | Sprint 0 → **removed in S1.0** | 🚫 Retired (2026-05-19) | Amanah is the canonical default. |
| `FF_AI_CONFIDENCE` | Sprint 1 | _Not yet wired_ | 4-level visual badge |
| `FF_RFQ_SINGLE_SCREEN` | Sprint 2 | _Not yet wired_ | Single-screen RFQ |
| `FF_TRUST` | Sprint 3 | _Not yet wired_ | Identity + Process + Outcome bars |
| `FF_CELEBRATION` | Sprint 3 | _Not yet wired_ | Confetti + milestones |
| `FF_HIJRI` | Sprint 4 | _Not yet wired_ | Hijri-default dates |
| `FF_PRAYER` | Sprint 4 | _Not yet wired_ | Prayer times widget |
| `FF_NUMERALS` | Sprint 4 | _Not yet wired_ | Arabic-Indic digits |
| `FF_CONCIERGE` | Sprint 5 | _Not yet wired_ | "فريقنا يبحث لك" copy switch |
| `FF_PDPL` | Sprint 5 | _Not yet wired_ | PDPL consent banner |

---

## Sprint 1 — Amanah-default + AI Confidence Framework

**Started:** 2026-05-19

### S1.0 — Amanah-default cleanup (Δ1) ✅

**Done:** retired the `FF_AMANAH` flag and made "أمانة Elmaared™" the canonical name. Admin surfaces still say "Escrow" (legal context — untouched).

**Changes:**
- [`lib/feature-flags.ts`](../lib/feature-flags.ts) — removed `ESCROW_AMANAH_NAMING` flag; left a comment pointer to `trust-name.ts`.
- [`lib/i18n/trust-name.ts`](../lib/i18n/trust-name.ts) — collapsed dual-state branches to constant tables. Public API unchanged (`trustName`, `inTrustStatusLabel`, `trustLegalTooltip` still return the same shape).
- [`lib/i18n/messages/ar.json`](../lib/i18n/messages/ar.json) + [`en.json`](../lib/i18n/messages/en.json):
  - `marketing.valueProps.items.escrow{Title,Body}` values now hold the Amanah copy; duplicate `amanah*` keys deleted.
  - `marketing.forClients.features.escrow{Title,Body}` same treatment.
  - `rfqs.status.in_escrow` value flipped to "قيد أمانة Elmaared" / "In Elmaared Trust"; `in_amanah` removed.
- [`app/[locale]/(marketing)/page.tsx`](../app/[locale]/(marketing)/page.tsx) — removed `flags` import and the ternary block in the value-props grid; now reads the canonical `escrowTitle/escrowBody`.
- [`app/[locale]/(marketing)/for-clients/page.tsx`](../app/[locale]/(marketing)/for-clients/page.tsx) — removed `flags` import, `trustKey` ternary; reads `features.escrowTitle/escrowBody`.
- [`components/ui/status-pill.tsx`](../components/ui/status-pill.tsx) — comment updated to reflect canonical (no flag) behavior.
- [`tests/unit/i18n/trust-name.test.ts`](../tests/unit/i18n/trust-name.test.ts) — rewrote 10 dual-state tests as 7 canonical-only tests (single `describe` per function).

**Verification:**
- `pnpm typecheck` ✅ clean.
- `pnpm test` ✅ **871/871 pass** (was 874; -3 from the dropped FF_AMANAH=false branch tests).
- `pnpm lint` on touched files ✅ clean. (Pre-existing `<a>` errors in `app/[locale]/supplier/rfqs/[id]/page.tsx` and `for-suppliers/page.tsx` are unrelated — not introduced by S1.0, not in any file I touched.)
- Browser, no `FF_AMANAH` set anywhere:
  - `/ar` landing → value-props grid heading reads **"أمانة Elmaared™ — أموالك بأمان"** ✅
  - `/ar/for-clients` → features grid heading reads **"أمانة Elmaared™"** ✅
  - Neither page shows "ضمان نقدي" or "ضمان كامل" anywhere.
- grep `FF_AMANAH | ESCROW_AMANAH_NAMING` outside doc comments → **0 functional refs**.

**Why this was the first task in Sprint 1:** every downstream sprint (1.1+, 2, 3, 4, 5) reads from `lib/i18n/trust-name.ts`. Simplifying it once now avoids 5 downstream branches to maintain.



### S1.1 — AI Schema confidence metadata ✅

**Done:** added market-quality metadata to `proposals` (5 columns + ENUM), pure helpers to compute it, integrated into `scoreProposal()` so every newly-scored proposal gets the bucket + range alongside the score.

**Migration:** [supabase/migrations/20261119000001_ai_confidence_metadata.sql](../supabase/migrations/20261119000001_ai_confidence_metadata.sql)
- `CREATE TYPE ai_confidence_level AS ENUM ('high', 'medium', 'low', 'unknown')`.
- Adds 5 nullable columns to `proposals`: `ai_confidence`, `ai_sample_size`, `ai_variance_pct`, `ai_price_range_min`, `ai_price_range_max`.
- Partial index on `ai_confidence WHERE NOT NULL`.
- **NOT yet applied to the live DB.** Run `pnpm db:migrate` against the project Supabase instance to apply; until then existing rows keep the old shape and the new columns are unread.

**Helpers:** [lib/ai/confidence.ts](../lib/ai/confidence.ts) — two pure, dependency-free functions:
- `computeMarketContext(prices)` → `{ sampleSize, variancePct, priceMin, priceMax }`. Filters non-finite / non-positive entries, uses sample std-dev (n-1).
- `deriveConfidence({ sampleSize, variancePct })` → `'high' | 'medium' | 'low' | 'unknown'` per the committee debate truth table.

**Bucketing rules (Plan v2 §5, Debate 01):**

| N | variance% | → |
|---|-----------|---|
| < 4 | any | `unknown` |
| 4-9 | any | `low` |
| 10-19 | any | `medium` |
| ≥ 20 | < 25 | `high` |
| ≥ 20 | ≥ 25 or null | `medium` (large sample, but disagrees) |

**Schema wiring:** [lib/ai/score-proposal.ts](../lib/ai/score-proposal.ts) now:
1. Queries `proposals JOIN rfqs` for same `service_type`, last 12 months, excluding the current proposal and `withdrawn` ones (capped at 500).
2. Computes `MarketContext` from those prices.
3. Derives the confidence bucket from N + variance.
4. Persists the 5 new columns alongside the AI score on every success/failure/skip path (the badge is useful even when the AI score is missing).

**Types:** [lib/supabase/types.ts](../lib/supabase/types.ts) — added `AiConfidenceLevel` union + the 5 new fields on `ProposalRow`. Existing consumers (`compare/page.tsx`, `proposals/[proposalId]/page.tsx`) still typecheck — they read the old columns; the new ones get wired in S1.7.

**Tests:** [tests/unit/ai/confidence.test.ts](../tests/unit/ai/confidence.test.ts) — 11 cases:
- `computeMarketContext`: empty / single / 5-sample CV / sanitization of NaN/Infinity/negative / decimal rounding.
- `deriveConfidence`: each bucket boundary + null-variance fallback at large N.

**Verification:**
- `pnpm typecheck` ✅ clean.
- `pnpm test` ✅ **882/882 pass** (was 871 + 11 new).
- `pnpm lint` ✅ no new errors on touched files (one pre-existing `_omit` warning carried over from the original file).
- Browser: no visible change yet — the migration hasn't been applied to the dev DB and S1.7 (compare-page UI) is still pending. Verified the dev server still boots clean.



### S1.2 — ConfidenceBadge component ✅

**Done:** the 4-level visual indicator the committee approved in Debate 01 — a Radix tooltip-wrapped chip that maps `AiConfidenceLevel` → glyph + Arabic label + semantic chip styling.

**File:** [components/ai/confidence-badge.tsx](../components/ai/confidence-badge.tsx) (~100 LOC).

**Buckets → presentation:**
| Level | Glyph | Label | Token |
|-------|-------|-------|-------|
| `high` | 🟢 | دقيق جداً | `--color-success` |
| `medium` | 🔵 | دقيق | `--color-info` |
| `low` | 🟡 | تقريبي | `--color-warning` |
| `unknown` | ⚪ | تخمين أولي | `--color-stone-600` |

- Sample size renders inline as `(n=23)` when N>0; omitted at N=0.
- Tooltip carries the numeric detail: "بناءً على X عرضاً مماثلاً خلال آخر 12 شهراً. تباين السوق: Y٪." Susan Weinschenk's objection (Debate 01) — that raw numbers freeze users — is honored by hiding them behind hover/focus while keeping them available to anyone who wants them.
- Accessibility:
  - `role="status"` so screen readers announce changes when the level updates.
  - `aria-label` carries the full sentence; the emoji is `aria-hidden` to avoid double-read.
  - Tooltip is keyboard-accessible (Radix primitive).
- Pure presentational — server-component-friendly (no `'use client'` on the badge itself; the Radix Tooltip primitive marks itself `'use client'`).

**Tests:** [tests/unit/components/confidence-badge.test.tsx](../tests/unit/components/confidence-badge.test.tsx) — 8 cases:
- Each bucket renders its label.
- N=0 path hides the sample chip.
- aria-label composition.
- Empty-sample fallback aria text.
- `data-confidence` attribute reflects the level.
- Different chip classes per bucket.

**Verification:**
- `pnpm test tests/unit/components/confidence-badge.test.tsx` ✅ 8/8 pass.
- `pnpm typecheck` ✅ clean.
- `pnpm lint` ✅ clean on the new file.
- Browser: not yet rendered anywhere — wired into the compare page in S1.7.



### S1.3 — MarketRange component (عين السوق) ✅

**Done:** the price-range card the committee approved in Debate 01 — shows the historical fair-market range, the confidence badge, and (optionally) the supplier's quote as a marker on the bar with a one-line judgment.

**File:** [components/ai/market-range.tsx](../components/ai/market-range.tsx) (~120 LOC).

**Layout:**
- Title "عين السوق" + `<ConfidenceBadge>` in the header.
- Gradient track (success → info → warning) representing the price spectrum.
- Min / max anchors below the track using `formatCurrency` (riyal symbol, comma separators).
- Optional supplier marker (filled midnight-green dot) positioned at `(supplierPrice - min) / (max - min) × 100%`. Clamped to [0, 100] when out of range.
- One-line judgment underneath:
  - Inside range → "✓ هذا العرض داخل النطاق السوقي."
  - Below → "⚠ هذا العرض أقل من حد السوق — قد يكون نطاق العمل غير مكتمل."
  - Above → "⚠ هذا العرض أعلى من حد السوق — اطلب توضيح القيمة المضافة."

**Fallback path:** when `level === 'unknown'` OR range is missing OR `min > max`, the bar collapses to a dashed-border card with "لا توجد بيانات سوقية كافية بعد لهذه الفئة — سنعرض النطاق فور تجمّع ٤ عروض أو أكثر." This is the user-facing twin of `<AIFallback>` (S1.5).

**Tests:** [tests/unit/components/market-range.test.tsx](../tests/unit/components/market-range.test.tsx) — 7 cases:
- Unknown bucket → fallback.
- Valid bucket but null range → fallback.
- Valid range renders bar + both anchors.
- Supplier inside / below / above the range each carry the right note.
- `aria-label` on the container.

**Verification:**
- `pnpm test tests/unit/components/market-range.test.tsx` ✅ 7/7 pass.
- `pnpm typecheck` ✅ clean.
- Browser: rendered live in S1.7 on the compare page.



### S1.4 — AIDisagreeButton + ai_feedback table ✅

**Done:** Josh Clark's mandate in Debate 01 — "AI must offer pushback" — turns into a 3-reason popover, a Sonner toast confirmation, and a new `ai_feedback` table that captures user disagreement for ML retraining.

**Migration #2:** [supabase/migrations/20261119000002_ai_feedback.sql](../supabase/migrations/20261119000002_ai_feedback.sql)
- ENUM `ai_feedback_reason` ('price_too_high' | 'price_too_low' | 'illogical').
- Table `ai_feedback (id, proposal_id, user_id, reason, comment, created_at, updated_at)` with UNIQUE(proposal_id, user_id).
- 3 indexes: proposal_id, reason, created_at.
- RLS:
  - INSERT/UPDATE allowed only when the caller owns the parent RFQ (`r.client_id = auth.uid()`).
  - SELECT restricted to admins (the table is operational signal, not user-facing content).
- `update_timestamp()` trigger keeps `updated_at` fresh.

**Server action:** [app/actions/ai-feedback.ts](../app/actions/ai-feedback.ts)
- Zod schema validates UUID + reason enum + comment ≤ 1000 chars.
- Re-confirms RFQ ownership through the admin client (matches the chat-action RLS workaround).
- `upsert()` on `(proposal_id, user_id)` so users can revise without duplicates.
- Friendly Arabic errors for unauth / missing proposal / ownership / DB failure.

**Component:** [components/ai/ai-disagree-button.tsx](../components/ai/ai-disagree-button.tsx)
- Trigger chip: "أنا لا أوافق" + thumbs-down icon, focus-visible ring on warning token.
- Popover (Radix): three radio reasons + optional textarea + cancel/submit buttons.
- `useTransition` keeps the submit button reactive; Sonner toast confirms success.
- Idempotent UX: after a successful submit the trigger disables with "تم استلام ملاحظتك".
- Sets a stable radio `name` per `proposalId` so multiple badges on one page don't clash.

**Mock tooling:** added `upsert()` to `tests/mocks/supabase-mock.ts` (routes to the existing `insert` plumbing — conflict resolution is a DB concern not simulated). Available to every other action test going forward.

**Tests:** [tests/integration/actions/ai-feedback.test.ts](../tests/integration/actions/ai-feedback.test.ts) — 5 cases:
- Unauth → "يجب تسجيل الدخول".
- Invalid reason / non-UUID → "بيانات غير صالحة".
- Caller doesn't own RFQ → "ليست لديك صلاحية".
- Happy-path upsert → `ok: true`.
- Missing proposal → "لم نجد".

**Verification:**
- `pnpm test` ✅ **902/902 pass** (was 897 + 5 new).
- `pnpm typecheck` ✅ clean.
- Browser: not rendered yet — wired into the compare-row UI in S1.7.



### S1.5 — AIFallback component
_pending_

### S1.6 — AIOverride + Bias Disclosure page
_pending_

### S1.7 — Apply to compare page
_pending_

---

## Commit Log

_(populated as each task lands; one focused commit per S*.X — Δ8)_

| Task | Hash | Subject |
|------|------|---------|
| Sprint 0 + S1.0 | `46d9248` | feat(ux-v2): Sprint 0 + S1.0 — quick wins, microcopy, Amanah canonical |
| S1.1 | `6ae35a3` | feat(s1.1): AI confidence metadata + market-quality columns |
| S1.2 | `f64658a` | feat(s1.2): ConfidenceBadge component |
| S1.3 | `b36a1bb` | feat(s1.3): MarketRange component — "عين السوق" price-range bar |

---

## Preservation Gates (re-checked after every Sprint)

| Gate | Baseline | Current |
|------|----------|---------|
| Tests | 874/874 (after Sprint 0) | _TBD_ |
| Typecheck | clean | _TBD_ |
| Lint | 0 errors in touched files | _TBD_ |
| Sprint 0 work | intact | _TBD_ |
| `ai-documents/DEEP-AUDIT-REPORT.md` items | passing | _TBD_ |
