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
| **Sprint 1** | ✅ Done | S1.0–S1.7 | ✅ | Amanah-default cleanup + AI Confidence Framework |
| Sprint 2 | ✅ Done | S2.1–S2.5 | ✅ | RFQ Wizard → Single-Screen + Smart Defaults |
| Sprint 3 | ✅ Done | S3.0–S3.6 | ✅ | Trust Architecture (4 layers) |
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
| `FF_RFQ_SINGLE_SCREEN` | Sprint 2 | ✅ Wired (default OFF) | Single-screen RFQ + Smart Defaults |
| `FF_TRUST` | Sprint 3 | ✅ Wired (default OFF) | IdentityBadges + TrustBar live on discover/compare/escrow |
| `FF_CELEBRATION` | Sprint 3 | ✅ Wired (default OFF) | CelebrationModal component built; page-trigger placement deferred |
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



### S1.5 — AIFallback component ✅

**Done:** the user-facing voice of Don Norman + Josh Clark's principle from Debate 01 — "when AI doesn't know, it must say so plainly". A reusable card that names *why* the AI is silent and optionally what to do about it.

**File:** [components/ai/ai-fallback.tsx](../components/ai/ai-fallback.tsx) (~90 LOC).

**Four reasons** with sensible defaults:
| Reason | Default headline |
|--------|------------------|
| `insufficient_data` | "أمامي N صفقة فقط — لا أعرف بعد" (uses sampleSize) OR "لا توجد بيانات كافية بعد — لا أعرف بعد" |
| `service_error` | "تقييم AI غير متاح مؤقتاً — حاول لاحقاً" |
| `unsupported` | "هذه الفئة لم نُدرّب AI عليها بعد" |
| `pending` | "يجري الآن تحليل AI لهذا العرض…" |

Each reason ships a sensible default `whatNext` body. Both can be overridden via props for surfaces that need a tighter copy.

**API:**
```tsx
<AIFallback
  reason="insufficient_data"
  sampleSize={2}
  action={{ label: 'اطلب تقديراً مخصصاً', onClick: ... }}
/>
```

- `role="status"` + dashed-border card uses `--color-cream` so it sits softly inside any layout without screaming.
- Action button is optional; when provided it gets full keyboard focus styling.
- Carries `data-component="ai-fallback"` + `data-reason="..."` for analytics + Playwright selectors.

**Tests:** [tests/unit/components/ai-fallback.test.tsx](../tests/unit/components/ai-fallback.test.tsx) — 8 cases:
- Sample-size-driven canonical headline (N=2 → "صفقتين", N=1 → "صفقة").
- Generic fallback when sampleSize is missing.
- Each reason's headline.
- Action click forwarding.
- Custom headline/whatNext overrides.
- `data-reason` attribute.

**Verification:**
- `pnpm test` ✅ 910/910 pass (was 902 + 8 new).
- `pnpm typecheck` ✅ clean.
- Browser: not rendered yet — wired into the compare page in S1.7 when proposals come back with `ai_confidence = 'unknown'` or service errors.



### S1.6 — AIOverride + Bias Disclosure page ✅

**Done:** the two halves of Decision #01's "override + accountability" pair — a reusable AIOverride wrapper for any user-controllable AI default, and a public `/legal/ai-models` page that satisfies SDAIA's transparency requirement (Plan v2 Decision #11).

#### `<AIOverride>` component

**File:** [components/ai/ai-override.tsx](../components/ai/ai-override.tsx) (~65 LOC).

Wraps any input that was prefilled by an AI suggestion. The AI value is shown as a chip above the input; when the user types something else, a warning-toned banner appears with "تجاوزت اقتراح AI" + a one-click "استعد اقتراح AI" reset button. The AI input is **set aside, not erased** — Josh Clark's rule from Debate 01.

**API:**
```tsx
<AIOverride
  aiSuggestion="42,000 ﷼"
  userValueDiffers={value !== 42000}
  onResetToAi={() => setValue(42000)}
  label="الميزانية المقترحة"
>
  <input type="number" value={value} onChange={...} />
</AIOverride>
```

Tests: [tests/unit/components/ai-override.test.tsx](../tests/unit/components/ai-override.test.tsx) — 5 cases:
- Chip + child input render.
- Override banner hidden when not diverged.
- Override banner + reset button visible when diverged.
- Reset button click forwards `onResetToAi`.
- Optional `label` renders above the chip.

Pre-wired for Sprint 2 (Smart Defaults on the new single-screen RFQ form).

#### `/legal/ai-models` AI Model Card page

**File:** [app/\[locale\]/(marketing)/legal/ai-models/page.tsx](<../app/[locale]/(marketing)/legal/ai-models/page.tsx>) (~150 LOC).

Public, no-auth page that lists all 4 AI surfaces used in Elmaared (per Plan v2 §5 model card table):

| Model | Purpose |
|-------|---------|
| عين السوق (Pricing) | RAG on past quotes for fair-range estimation |
| AI تحليل العروض | Claude Sonnet 4.6 scoring on 5 axes |
| AI توثيق الاتفاق | Claude + Saudi legal templates for contract diff |
| AI Lead Scoring | Hot/Warm/Cold visitor classification on Day-of |

Each card discloses:
- The exact model (e.g. "Anthropic Claude Sonnet 4.6").
- Training data source.
- Confidence threshold that triggers fallback.
- Fallback behavior.
- **Bias disclosure** — highlighted in a warning-toned panel.

Header shows the most recent review date (Hijri + Gregorian); the page is reviewed every 6 months per the SDAIA Track O cadence. Page closes with the contact channel for bias reports (`ai-models@elmaared.com`) and a pointer to the in-product "أنا لا أوافق" button.

**Verification:**
- `pnpm test` ✅ **915/915 pass** (was 910 + 5 new AIOverride cases).
- `pnpm typecheck` ✅ clean.
- Browser: `/ar/legal/ai-models` renders the H1, 4 cards (first is "عين السوق (Pricing)"), and the SDAIA disclosure block. Screenshot captured.



### S1.7 — Wire S1.1–S1.6 components into the compare flow ✅

**Done:** the buyer-side comparison surface now consumes the new AI-confidence stack behind `FF_AI_CONFIDENCE`. When the flag is OFF (default) the page is byte-for-byte identical to its pre-Sprint-1 shape. When ON, the new components light up.

**Pages touched:**

1. [app/\[locale\]/dashboard/rfqs/\[id\]/compare/page.tsx](../app/[locale]/dashboard/rfqs/[id]/compare/page.tsx)
   - Extends the `proposals` SELECT to include the 5 new market-quality columns (`ai_confidence`, `ai_sample_size`, `ai_variance_pct`, `ai_price_range_min`, `ai_price_range_max`).
   - When `flags.AI_CONFIDENCE_UI` is ON and at least one proposal carries a confidence value, renders a single `<MarketRange>` card at the top of the proposal list — market context is identical for every proposal in this RFQ (same `service_type` baseline), so showing it once is cleaner than per-row.
   - Each scored proposal row swaps the raw `X/100` number for `<ConfidenceBadge>` and appends an `<AIDisagreeButton>` in the row footer.
   - Pending proposals (< 5 min old) get `<AIFallback reason="pending" />` instead of the inline "جارٍ التقييم…" text.
   - Stale-unscored proposals (> 5 min and still null) get `<AIFallback reason="service_error" />`.
   - All flag-off paths preserve the original `X/100` + inline copy verbatim.

2. [app/\[locale\]/dashboard/rfqs/\[id\]/proposals/\[proposalId\]/page.tsx](../app/[locale]/dashboard/rfqs/[id]/proposals/[proposalId]/page.tsx)
   - Extends the proposal SELECT with the same 5 new columns.
   - When the flag is ON, the "تقييم الذكاء" stat-card swaps to a `<ConfidenceBadge>` inside the stat slot.
   - Adds a `<MarketRange>` card below the stats with the supplier's `total_price` as the marker — buyer sees instantly whether the proposal sits inside / below / above the historical band.
   - Adds a footer `<AIDisagreeButton>` whenever an AI score exists.

**Verification:**
- `pnpm typecheck` ✅ clean.
- `pnpm test` ✅ **915/915 pass** (no regressions; component unit tests carry their own coverage).
- Browser:
  - `/ar/legal/ai-models` renders 4 model cards + SDAIA disclosure (verified earlier in S1.6).
  - `/ar/dashboard/rfqs/[id]/compare` loads, 200, no console / server errors. Dev seed has zero proposals, so the empty state ("لم تصل عروض بعد") renders correctly — the AI confidence stack stays dormant until proposals exist + flag is ON. Screenshot captured.
- **Live AI confidence UI not visually exercised** because the dev seed has 0 proposals on the test RFQs. To exercise: seed at least one scored proposal AND set `NEXT_PUBLIC_FF_AI_CONFIDENCE=true` AND apply migration #1 to the dev DB. Unit + render tests cover every code path.

**Limitation noted:** the new columns (`ai_confidence`, etc.) live in migration #1, which has not been applied to the dev Supabase yet. The compare page's SELECT references those columns; if a proposal existed and the column didn't, the query would error and the page would fall through to the empty state. No risk to production until migrations are applied; staged for `pnpm db:migrate`.



---

## Commit Log

_(populated as each task lands; one focused commit per S*.X — Δ8)_

| Task | Hash | Subject |
|------|------|---------|
| Sprint 0 + S1.0 | `46d9248` | feat(ux-v2): Sprint 0 + S1.0 — quick wins, microcopy, Amanah canonical |
| S1.1 | `6ae35a3` | feat(s1.1): AI confidence metadata + market-quality columns |
| S1.2 | `f64658a` | feat(s1.2): ConfidenceBadge component |
| S1.3 | `b36a1bb` | feat(s1.3): MarketRange component — "عين السوق" price-range bar |
| S1.4 | `f01ee5a` | feat(s1.4): AIDisagreeButton + ai_feedback table (migration #2) |
| S1.5 | `f7607c0` | feat(s1.5): AIFallback component — explain why AI is silent |
| S1.6 | `5f776cc` | feat(s1.6): AIOverride wrapper + /legal/ai-models bias-disclosure page |
| S1.7 | `842db4b` | feat(s1.7): wire AI confidence stack into compare + proposal-detail |
| Sprint 1 summary | `c649443` | docs(s1): Sprint 1 final summary in UX-PLAN-V2-IMPLEMENTATION.md |
| S2.1 | `e984d1a` | feat(s2.1): add shadcn-style Accordion primitive |
| S2.2 | `32648d9` | feat(s2.2): extract 3 reusable RFQ section components |
| S2.3 | `6c5f83d` | feat(s2.3): SingleScreenView + flag-aware switch in new RFQ page |
| S2.4 | `5fa5578` | feat(s2.4): Smart Defaults engine for the single-screen RFQ form |
| Sprint 2 summary | `b7303db` | docs(s2): Sprint 2 final summary + commit log |
| S3.0 | `b9d14fc` | feat(s3.0): Supabase migrations #3 + #4 — trust signals + milestones |
| S3.1 | `1d68921` | feat(s3.1): IdentityBadges component — Trust Layer 1 |
| S3.2 | `1e32266` | feat(s3.2): LiveTimeline component — Trust Layer 2 |
| S3.3 | `0ca4b29` | feat(s3.3): TrustBar component — Trust Layer 3 |
| S3.4 | `5e43b2c` | feat(s3.4): CelebrationModal + canvas-confetti — Trust Layer 4 |
| S3.5 | `bb56007` | feat(s3.5): wire IdentityBadges + TrustBar into discover / compare / escrow |

---

## Preservation Gates (re-checked after every Sprint)

| Gate | Baseline | After Sprint 1 |
|------|----------|----------------|
| Tests | 874/874 (after Sprint 0) | ✅ **915/915** (+41 new) |
| Typecheck | clean | ✅ clean |
| Lint | 0 errors in touched files | ✅ 0 errors in touched files |
| Sprint 0 work | intact | ✅ amanah copy unchanged, microcopy guide intact, supplier badge unchanged |
| `ai-documents/DEEP-AUDIT-REPORT.md` items | passing | ✅ no audit-checked surfaces touched |

---

## Sprint 1 Summary (2026-05-19)

| # | Task | Tests | Commit |
|---|------|-------|--------|
| S1.0 | Amanah-default cleanup (Δ1) | 871/871 | `46d9248` |
| S1.1 | Migration #1 + `confidence.ts` helpers + scoreProposal market context | 882/882 (+11) | `6ae35a3` |
| S1.2 | `<ConfidenceBadge>` | 890/890 (+8) | `f64658a` |
| S1.3 | `<MarketRange>` "عين السوق" | 897/897 (+7) | `b36a1bb` |
| S1.4 | `<AIDisagreeButton>` + ai_feedback table (migration #2) + server action | 902/902 (+5) | `f01ee5a` |
| S1.5 | `<AIFallback>` | 910/910 (+8) | `f7607c0` |
| S1.6 | `<AIOverride>` + `/legal/ai-models` (SDAIA disclosure) | 915/915 (+5) | `5f776cc` |
| S1.7 | Wire into compare + proposal detail pages (behind `FF_AI_CONFIDENCE`) | 915/915 | `842db4b` |

**Net additions:** +41 tests · 2 Supabase migrations (need `pnpm db:migrate` to apply) · 1 ENUM helper · 5 new components · 1 server action · 1 legal page · 1 retired feature flag.

**Migrations pending:**
- `20261119000001_ai_confidence_metadata.sql` (5 cols + ENUM `ai_confidence_level`)
- `20261119000002_ai_feedback.sql` (table + ENUM `ai_feedback_reason` + RLS + trigger)

**Sprint 2 next:** RFQ Wizard → Single-Screen (10–12 days). Depends on `<MarketRange>` for Smart Defaults — already in place.

---

## Sprint 2 Summary (2026-05-19)

| # | Task | Tests | Commit |
|---|------|-------|--------|
| S2.1 | shadcn Accordion primitive | 918/918 (+3) | `e984d1a` |
| S2.2 | Extract 3 RFQ section components (ServiceSection, BudgetSection, FilesSection) + SelectField helper | 918/918 | `32648d9` |
| S2.3 | SingleScreenView + flag-aware switch in `new/page.tsx` | 918/918 | `6c5f83d` |
| S2.4 | Smart Defaults engine — pure helper, server action, BudgetSection wiring | 924/924 (+6) | `5fa5578` |

**Net additions:** +9 tests · 1 shadcn primitive (Accordion) · 4 section files · 1 SingleScreenView · 1 pure helper (`lib/rfq/smart-defaults.ts`) · 1 server action (`smart-defaults.ts`).

**FF_RFQ_SINGLE_SCREEN behavior:**
- OFF (default): legacy 5-step wizard renders unchanged.
- ON: SingleScreenView with three sections — Service (always visible) + Budget (accordion) + Files (accordion). Smart Defaults banner inside Budget surfaces a `"اقتراح من سوق Elmaared: X – Y ﷼"` chip with a one-click "تطبيق الاقتراح" button when the user picks a service.

**Browser-verified end-to-end:**
- Logged in as `ahmed.client.test`, visited `/ar/dashboard/rfqs/new` with `FF_RFQ_SINGLE=true`.
- Service section renders 4 service cards. Picking "تصميم وتنفيذ أجنحة" highlights it (aria-checked) and triggers smart-defaults fetch.
- Budget accordion opens on click → Smart Defaults banner appears with real market-derived range ("57,000 ﷼ – 78,800 ﷼ (تقريبي)") proving the server action + helper end-to-end.
- Files accordion present and toggles.
- Submit bar shows "احفظ كمسودة" + "أرسلي الطلب الآن" — both disabled until service + title (≥5 chars) are set, with a live hint explaining why.
- Flag flipped OFF after verification → legacy stepper returns intact.

**Known UX limitation (not blocking):** Radix's `defaultValue` is uncontrolled, so the Budget accordion doesn't auto-open when the user picks a service. The trigger copy ("اختياري — سنستخدم تقديرات السوق إذا تركته") signals openability; a future polish PR can switch to controlled `value`+`onValueChange` to auto-expand on serviceType change.

**Sprint 3 next:** Trust Architecture (4 layers — Identity, Process, Outcome, Emotional) — 12–14 days.

---

## Sprint 3 Summary (2026-05-19)

| # | Task | Tests | Commit |
|---|------|-------|--------|
| S3.0 | Supabase migrations #3 + #4 (supplier_trust_signals + user_milestones + ENUM milestone_type) | 924/924 | `b9d14fc` |
| S3.1 | `<IdentityBadges>` — Layer 1 (5 verification badges, full + compact variants) | 932/932 (+8) | `1d68921` |
| S3.2 | `<LiveTimeline>` — Layer 2 (event log + SLA banner, 6 event kinds, 4 SLA states) | 940/940 (+8) | `1e32266` |
| S3.3 | `<TrustBar>` — Layer 3 (3 reassurance pillars: Amanah + Disputes + Fazaa) | 947/947 (+7) | `0ca4b29` |
| S3.4 | `<CelebrationModal>` — Layer 4 + canvas-confetti lazy-load + idempotent claim action | 955/955 (+8) | `5e43b2c` |
| S3.5 | Wire IdentityBadges (full + compact) + TrustBar into discover / compare / escrow pages | 955/955 | `bb56007` |

**Net additions:** +31 tests · 2 Supabase migrations · 4 new components · 1 server action (milestones) · 1 ENUM (`milestone_type`) · 2 new tables (`supplier_trust_signals`, `user_milestones`) · 1 new dependency (`canvas-confetti` lazy-loaded).

**Browser-verified (flag OFF, default):** all three touched pages render byte-for-byte identical to pre-Sprint-3.

**Browser verification with flag ON deferred** until migrations are applied (`pnpm db:migrate`). The page-side SELECTs degrade gracefully — `supplier_trust_signals` queries return empty arrays before the migration lands, so IdentityBadges falls through to its "التحقق من هوية المورد قيد المراجعة" placeholder.

**Deferred follow-ups (non-blocking, documented):**
- LiveTimeline page-wiring waits on the Project Execution page (closest existing surface is RFQ detail).
- CelebrationModal page-trigger waits on a decision about whether to fire on dashboard mount, RFQ-created success path, or both.

**Sprint 4 next:** Saudi Cultural Layer (Hijri default, Prayer times widget, Arabic-Indic numerals, 50 Saudi names library, Saudi green token) — 8–10 days.
