import { describe, it, expect } from 'vitest';
import { suggestRfqDefaults } from '@/lib/rfq/smart-defaults';

const NOW = new Date('2026-05-19T09:00:00.000Z');

describe('suggestRfqDefaults', () => {
  it('returns the static fallback for booth when no prices are given', () => {
    const out = suggestRfqDefaults({ serviceType: 'booth', prices: [], now: NOW });
    expect(out.budgetMin).toBe(25_000);
    expect(out.budgetMax).toBe(80_000);
    expect(out.confidence).toBe('unknown');
    expect(out.sampleSize).toBe(0);
    expect(out.deadlineDays).toBe(21);
  });

  it('honors per-service deadline windows', () => {
    expect(suggestRfqDefaults({ serviceType: 'printing', prices: [], now: NOW }).deadlineDays).toBe(7);
    expect(suggestRfqDefaults({ serviceType: 'gifts', prices: [], now: NOW }).deadlineDays).toBe(14);
    expect(suggestRfqDefaults({ serviceType: 'event', prices: [], now: NOW }).deadlineDays).toBe(21);
    expect(suggestRfqDefaults({ serviceType: 'booth', prices: [], now: NOW }).deadlineDays).toBe(21);
  });

  it('pads ±5% around the historical extremes when a real sample is provided', () => {
    const prices = Array.from({ length: 25 }, (_, i) => 40_000 + i * 1_000); // 40k..64k
    const out = suggestRfqDefaults({ serviceType: 'booth', prices, now: NOW });
    // 40,000 * 0.95 = 38,000 → rounded to nearest 100 → 38,000
    expect(out.budgetMin).toBe(38_000);
    // 64,000 * 1.05 = 67,200 → rounded → 67,200
    expect(out.budgetMax).toBe(67_200);
  });

  it('uses the live sample confidence bucket', () => {
    // 25 samples + low variance → high confidence
    const tight = Array.from({ length: 25 }, () => 50_000 + Math.random() * 1_000);
    const high = suggestRfqDefaults({ serviceType: 'booth', prices: tight, now: NOW });
    expect(high.confidence).toBe('high');

    // 5 samples → low
    const five = [40_000, 45_000, 50_000, 55_000, 60_000];
    const low = suggestRfqDefaults({ serviceType: 'booth', prices: five, now: NOW });
    expect(low.confidence).toBe('low');

    // 2 samples → unknown (falls back to static range)
    const tiny = [40_000, 60_000];
    const unknown = suggestRfqDefaults({ serviceType: 'booth', prices: tiny, now: NOW });
    expect(unknown.confidence).toBe('unknown');
    expect(unknown.budgetMin).toBe(25_000); // static fallback, not 40,000 * 0.95
  });

  it('produces a datetime-local-friendly proposalsDeadline string', () => {
    const out = suggestRfqDefaults({ serviceType: 'gifts', prices: [], now: NOW });
    // Format: YYYY-MM-DDTHH:MM, 14 days after NOW at 12:00 local
    expect(out.proposalsDeadline).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // 14 days from May 19 = June 2
    expect(out.proposalsDeadline.slice(0, 10)).toBe('2026-06-02');
  });

  it('rounds budgets to the nearest 100 SAR', () => {
    // Force a fractional padded number
    const out = suggestRfqDefaults({
      serviceType: 'booth',
      prices: Array.from({ length: 10 }, () => 12_345),
      now: NOW,
    });
    expect(out.budgetMin % 100).toBe(0);
    expect(out.budgetMax % 100).toBe(0);
  });
});
