// Phase V1.1 — token → USD cost math.

import { describe, it, expect } from 'vitest';
import { computeCost, hasModelRate, _MODEL_RATES_FOR_TEST } from '@/lib/ai/cost';

describe('computeCost', () => {
  it('returns 0 for zero tokens', () => {
    expect(
      computeCost({ tokensIn: 0, tokensOut: 0, model: 'anthropic/claude-sonnet-4.6' })
    ).toBe(0);
  });

  it('computes Sonnet 4.6 cost at $3 in / $15 out per MTok', () => {
    // 1M input + 1M output → $3 + $15 = $18
    expect(
      computeCost({
        tokensIn: 1_000_000,
        tokensOut: 1_000_000,
        model: 'anthropic/claude-sonnet-4.6',
      })
    ).toBeCloseTo(18, 6);
  });

  it('scales linearly — half-MTok = half cost', () => {
    const full = computeCost({
      tokensIn: 1_000_000,
      tokensOut: 1_000_000,
      model: 'anthropic/claude-sonnet-4.6',
    });
    const half = computeCost({
      tokensIn: 500_000,
      tokensOut: 500_000,
      model: 'anthropic/claude-sonnet-4.6',
    });
    expect(half).toBeCloseTo(full / 2, 6);
  });

  it('falls back to Opus pricing for unknown models (conservative)', () => {
    const unknown = computeCost({
      tokensIn: 1_000_000,
      tokensOut: 1_000_000,
      model: 'never-heard-of-this/model',
    });
    // Opus = $15 in + $75 out per MTok → $90 for 1M+1M
    expect(unknown).toBeCloseTo(90, 6);
  });

  it('Opus is more expensive than Sonnet for equal token counts', () => {
    const sonnet = computeCost({
      tokensIn: 100_000,
      tokensOut: 50_000,
      model: 'anthropic/claude-sonnet-4.6',
    });
    const opus = computeCost({
      tokensIn: 100_000,
      tokensOut: 50_000,
      model: 'anthropic/claude-opus-4.7',
    });
    expect(opus).toBeGreaterThan(sonnet);
  });

  it('Haiku is the cheapest of the three Claude models', () => {
    const args = {
      tokensIn: 100_000,
      tokensOut: 50_000,
    };
    const haiku = computeCost({ ...args, model: 'anthropic/claude-haiku-4.5' });
    const sonnet = computeCost({ ...args, model: 'anthropic/claude-sonnet-4.6' });
    const opus = computeCost({ ...args, model: 'anthropic/claude-opus-4.7' });
    expect(haiku).toBeLessThan(sonnet);
    expect(sonnet).toBeLessThan(opus);
  });
});

describe('hasModelRate', () => {
  it('returns true for every listed model', () => {
    for (const m of Object.keys(_MODEL_RATES_FOR_TEST)) {
      expect(hasModelRate(m)).toBe(true);
    }
  });

  it('returns false for unlisted models', () => {
    expect(hasModelRate('openai/gpt-4')).toBe(false);
  });
});
