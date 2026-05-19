import { describe, it, expect } from 'vitest';
import {
  computeMarketContext,
  deriveConfidence,
} from '@/lib/ai/confidence';

describe('computeMarketContext', () => {
  it('returns zeros and nulls for an empty sample', () => {
    expect(computeMarketContext([])).toEqual({
      sampleSize: 0,
      variancePct: null,
      priceMin: null,
      priceMax: null,
    });
  });

  it('returns range with null variance for a single price', () => {
    const ctx = computeMarketContext([50000]);
    expect(ctx.sampleSize).toBe(1);
    expect(ctx.priceMin).toBe(50000);
    expect(ctx.priceMax).toBe(50000);
    expect(ctx.variancePct).toBeNull();
  });

  it('computes correct min / max / coefficient of variation for a 5-sample set', () => {
    // Sample: 40k, 45k, 50k, 55k, 60k → mean 50k, sample std 7905.7..., CV≈15.81%
    const ctx = computeMarketContext([40000, 45000, 50000, 55000, 60000]);
    expect(ctx.sampleSize).toBe(5);
    expect(ctx.priceMin).toBe(40000);
    expect(ctx.priceMax).toBe(60000);
    expect(ctx.variancePct).not.toBeNull();
    expect(ctx.variancePct!).toBeCloseTo(15.81, 1);
  });

  it('ignores zero, negative, NaN and infinite entries', () => {
    const ctx = computeMarketContext([
      50000,
      0,
      -1000,
      NaN,
      Infinity,
      60000,
    ]);
    expect(ctx.sampleSize).toBe(2);
    expect(ctx.priceMin).toBe(50000);
    expect(ctx.priceMax).toBe(60000);
  });

  it('rounds variancePct to 2 decimals', () => {
    const ctx = computeMarketContext([100, 110, 120, 130, 140]);
    expect(ctx.variancePct).not.toBeNull();
    // round-to-2 invariant — no third decimal in the result
    const v = ctx.variancePct!;
    expect(Math.round(v * 100) / 100).toBe(v);
  });
});

describe('deriveConfidence', () => {
  it('returns "unknown" when N < 4', () => {
    expect(deriveConfidence({ sampleSize: 0, variancePct: null })).toBe('unknown');
    expect(deriveConfidence({ sampleSize: 3, variancePct: 5 })).toBe('unknown');
  });

  it('returns "low" for 4 ≤ N < 10', () => {
    expect(deriveConfidence({ sampleSize: 4, variancePct: 50 })).toBe('low');
    expect(deriveConfidence({ sampleSize: 9, variancePct: 5 })).toBe('low');
  });

  it('returns "medium" for 10 ≤ N < 20', () => {
    expect(deriveConfidence({ sampleSize: 10, variancePct: 5 })).toBe('medium');
    expect(deriveConfidence({ sampleSize: 19, variancePct: 50 })).toBe('medium');
  });

  it('returns "high" only when N ≥ 20 AND variance < 25%', () => {
    expect(deriveConfidence({ sampleSize: 20, variancePct: 10 })).toBe('high');
    expect(deriveConfidence({ sampleSize: 100, variancePct: 24.99 })).toBe('high');
  });

  it('drops to "medium" when N ≥ 20 but variance is too wide', () => {
    expect(deriveConfidence({ sampleSize: 20, variancePct: 25 })).toBe('medium');
    expect(deriveConfidence({ sampleSize: 50, variancePct: 60 })).toBe('medium');
  });

  it('handles null variance at large N as "medium" (cannot prove agreement)', () => {
    expect(deriveConfidence({ sampleSize: 25, variancePct: null })).toBe('medium');
  });
});
