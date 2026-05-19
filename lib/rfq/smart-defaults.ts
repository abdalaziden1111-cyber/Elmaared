/**
 * Smart Defaults engine for the single-screen RFQ form
 * (UX Plan v2 Decision #02, Sprint 2 S2.4).
 *
 * Given a sample of comparable historical proposals, suggest budget + deadline
 * defaults that let the user submit in one click without filling out the
 * optional sections. The user can always override — see `<AIOverride>` for
 * the override-pattern primitive (S1.6).
 *
 * The helper is pure / dependency-free: it doesn't talk to Supabase or the AI
 * gateway. Callers pass the price sample (see `app/actions/smart-defaults.ts`
 * for the server-action wrapper that does the DB query).
 */

import { computeMarketContext, deriveConfidence } from '@/lib/ai/confidence';
import type { AiConfidenceLevel } from '@/lib/supabase/types';

export type SmartDefaultsServiceType = 'booth' | 'gifts' | 'event' | 'printing';

export interface SmartDefaults {
  /** Suggested low end of the budget. Rounded to nearest 100 SAR. */
  budgetMin: number;
  /** Suggested high end. Rounded to nearest 100 SAR. */
  budgetMax: number;
  /** Days from now for proposal deadline. */
  deadlineDays: number;
  /** ISO-8601 string for the deadline (defaults to start of day + deadlineDays). */
  proposalsDeadline: string;
  /** Confidence bucket reused from S1.1. Drives whether to show the suggestion banner. */
  confidence: AiConfidenceLevel;
  /** Number of comparable historical proposals used for the suggestion. */
  sampleSize: number;
}

// Per-service deadline defaults. Tighter for printing (lead time short),
// looser for booths and events (production pipelines).
const SERVICE_DEADLINE_DAYS: Record<SmartDefaultsServiceType, number> = {
  booth: 21,
  event: 21,
  gifts: 14,
  printing: 7,
};

// Static fallback ranges when no market data is available, derived from the
// committee's internal benchmarks (Plan v2 §11). Conservative on the low end
// so the buyer doesn't anchor too low.
const STATIC_FALLBACK_RANGES: Record<
  SmartDefaultsServiceType,
  { min: number; max: number }
> = {
  booth: { min: 25_000, max: 80_000 },
  event: { min: 30_000, max: 120_000 },
  gifts: { min: 5_000, max: 25_000 },
  printing: { min: 2_000, max: 10_000 },
};

interface SuggestArgs {
  serviceType: SmartDefaultsServiceType;
  /** Comparable historical prices in SAR. Pass [] for the static-fallback path. */
  prices: readonly number[];
  /** Defaults to Date.now(); injectable for tests. */
  now?: Date;
}

/**
 * Compute a complete suggestion from a price sample. Always returns a value
 * (never null) — even with zero samples we ship the static fallback so the
 * UI can prefill something useful and label it as "تخمين أولي".
 */
export function suggestRfqDefaults(args: SuggestArgs): SmartDefaults {
  const { serviceType, prices, now = new Date() } = args;
  const ctx = computeMarketContext(prices);
  const confidence = deriveConfidence({
    sampleSize: ctx.sampleSize,
    variancePct: ctx.variancePct,
  });

  // Pick the source range: live market context if we have a sample, else the
  // static benchmark. The committee preferred to ALWAYS suggest something —
  // an empty budget field is friction; a clearly-labeled "preliminary"
  // suggestion is not.
  const range =
    confidence !== 'unknown' &&
    ctx.priceMin != null &&
    ctx.priceMax != null
      ? // Pad ±5% so the suggestion frames the range rather than nailing the
        // historical extremes (those often include outliers).
        { min: ctx.priceMin * 0.95, max: ctx.priceMax * 1.05 }
      : STATIC_FALLBACK_RANGES[serviceType];

  const budgetMin = roundToHundred(range.min);
  const budgetMax = roundToHundred(range.max);
  const deadlineDays = SERVICE_DEADLINE_DAYS[serviceType];

  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + deadlineDays);
  // Default to noon Riyadh time so DST / TZ jitter doesn't surprise the user.
  deadline.setHours(12, 0, 0, 0);

  return {
    budgetMin,
    budgetMax,
    deadlineDays,
    proposalsDeadline: deadline.toISOString().slice(0, 16), // matches datetime-local input
    confidence,
    sampleSize: ctx.sampleSize,
  };
}

function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}
