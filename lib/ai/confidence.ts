/**
 * UX Plan v2 Decision #01 — AI Confidence Framework (Sprint 1 S1.1).
 *
 * Two pure helpers that turn raw market data into the four buckets the
 * comparison UI renders as 🟢/🔵/🟡/⚪ badges:
 *
 *   1. `computeMarketContext(prices)` — descriptive stats over a sample of
 *      comparable past proposals. Returns sample size, coefficient of
 *      variation (as a percentage), and the price range.
 *   2. `deriveConfidence({sampleSize, variancePct})` — bucketing rule based
 *      on the committee debate:
 *         N ≥ 20  + variance < 25%  → high
 *         10 ≤ N < 20               → medium
 *         N ≥ 20 (variance ≥ 25%)   → medium  (lots of data, but it disagrees)
 *          4 ≤ N < 10               → low
 *          N <  4                   → unknown
 *
 * Both functions are deterministic and dependency-free so they can be unit
 * tested without a Supabase fixture. The AI score from
 * `lib/ai/score-proposal.ts` is computed separately — confidence describes
 * the quality of the market data the score was grounded in, not the AI's
 * self-assessment.
 */

import type { AiConfidenceLevel } from '@/lib/supabase/types';

export interface MarketContext {
  sampleSize: number;
  /** Coefficient of variation as a percentage (std/mean * 100). null when N < 2. */
  variancePct: number | null;
  /** Inclusive min from the sample. null when the sample is empty. */
  priceMin: number | null;
  /** Inclusive max from the sample. null when the sample is empty. */
  priceMax: number | null;
}

/**
 * Descriptive stats over a sample of comparable historical proposals. Uses
 * the sample standard deviation (n-1 denominator) since the sample is a
 * subset of all past offers, not a closed population.
 */
export function computeMarketContext(prices: readonly number[]): MarketContext {
  const valid = prices.filter(
    (p) => typeof p === 'number' && Number.isFinite(p) && p > 0
  );
  const sampleSize = valid.length;

  if (sampleSize === 0) {
    return { sampleSize: 0, variancePct: null, priceMin: null, priceMax: null };
  }

  let min = valid[0];
  let max = valid[0];
  let sum = 0;
  for (const p of valid) {
    if (p < min) min = p;
    if (p > max) max = p;
    sum += p;
  }
  const mean = sum / sampleSize;

  let variancePct: number | null = null;
  if (sampleSize >= 2 && mean > 0) {
    let sqDiff = 0;
    for (const p of valid) sqDiff += (p - mean) ** 2;
    const stddev = Math.sqrt(sqDiff / (sampleSize - 1));
    variancePct = (stddev / mean) * 100;
    if (!Number.isFinite(variancePct)) variancePct = null;
  }

  return {
    sampleSize,
    variancePct: variancePct === null ? null : roundTo(variancePct, 2),
    priceMin: roundTo(min, 2),
    priceMax: roundTo(max, 2),
  };
}

export interface DeriveConfidenceInput {
  sampleSize: number;
  /** Coefficient of variation in percent. Pass `null` if undefined (N<2). */
  variancePct: number | null;
}

const HIGH_MIN_SAMPLE = 20;
const HIGH_MAX_VARIANCE_PCT = 25;
const MEDIUM_MIN_SAMPLE = 10;
const LOW_MIN_SAMPLE = 4;

/**
 * Map a market context to one of the four committee-approved buckets. See
 * the module-level doc comment for the truth table.
 */
export function deriveConfidence(
  input: DeriveConfidenceInput
): AiConfidenceLevel {
  const { sampleSize, variancePct } = input;

  if (sampleSize < LOW_MIN_SAMPLE) return 'unknown';
  if (sampleSize < MEDIUM_MIN_SAMPLE) return 'low';
  if (sampleSize < HIGH_MIN_SAMPLE) return 'medium';

  // sampleSize ≥ 20: only "high" if the market also agrees with itself.
  if (variancePct !== null && variancePct < HIGH_MAX_VARIANCE_PCT) return 'high';
  return 'medium';
}

function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
