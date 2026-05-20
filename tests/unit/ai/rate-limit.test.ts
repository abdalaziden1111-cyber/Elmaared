// Phase V1.1 — daily AI budget rate limit.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  assertDailyBudget,
  getTodaysSpend,
  RateLimitError,
} from '@/lib/ai/rate-limit';
import type { AdminSupabase } from '@/lib/supabase/admin';

interface MockState {
  rows: Array<{ cost_usd: number | string }>;
  readError?: { message: string } | null;
}

function makeMock(state: MockState): AdminSupabase {
  return {
    from(_table: string) {
      const builder = {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        gte() {
          return Promise.resolve({
            data: state.readError ? null : state.rows,
            error: state.readError ?? null,
          });
        },
      };
      return builder;
    },
  } as unknown as AdminSupabase;
}

beforeEach(() => {
  delete process.env.AI_DAILY_BUDGET_USD;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getTodaysSpend', () => {
  it('returns 0 when user has no logged calls', async () => {
    const mock = makeMock({ rows: [] });
    expect(await getTodaysSpend('u1', mock)).toBe(0);
  });

  it('sums numeric and string cost values', async () => {
    const mock = makeMock({
      rows: [{ cost_usd: 0.12 }, { cost_usd: '0.34' }, { cost_usd: 1.5 }],
    });
    expect(await getTodaysSpend('u1', mock)).toBeCloseTo(1.96, 6);
  });

  it('returns 0 (logged warning) when the DB read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mock = makeMock({ rows: [], readError: { message: 'connection lost' } });
    expect(await getTodaysSpend('u1', mock)).toBe(0);
  });
});

describe('assertDailyBudget', () => {
  it('no-ops for null userId (system batch)', async () => {
    const mock = makeMock({ rows: [{ cost_usd: 100 }] });
    await expect(assertDailyBudget(null, mock)).resolves.toBeUndefined();
  });

  it('throws RateLimitError when AI_DAILY_BUDGET_USD=0 (hard block)', async () => {
    process.env.AI_DAILY_BUDGET_USD = '0';
    const mock = makeMock({ rows: [] });
    await expect(assertDailyBudget('u1', mock)).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it('throws when spend equals the cap', async () => {
    process.env.AI_DAILY_BUDGET_USD = '1.0';
    const mock = makeMock({ rows: [{ cost_usd: 1.0 }] });
    await expect(assertDailyBudget('u1', mock)).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it('throws when spend exceeds the cap', async () => {
    process.env.AI_DAILY_BUDGET_USD = '0.5';
    const mock = makeMock({ rows: [{ cost_usd: 0.6 }] });
    await expect(assertDailyBudget('u1', mock)).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it('allows the call when spend is below the cap', async () => {
    process.env.AI_DAILY_BUDGET_USD = '1.0';
    const mock = makeMock({ rows: [{ cost_usd: 0.5 }] });
    await expect(assertDailyBudget('u1', mock)).resolves.toBeUndefined();
  });

  it('uses default $1 cap when AI_DAILY_BUDGET_USD is missing', async () => {
    const mock = makeMock({ rows: [{ cost_usd: 0.99 }] });
    await expect(assertDailyBudget('u1', mock)).resolves.toBeUndefined();

    const overMock = makeMock({ rows: [{ cost_usd: 1.0 }] });
    await expect(assertDailyBudget('u1', overMock)).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it('falls back to default on a malformed AI_DAILY_BUDGET_USD value', async () => {
    process.env.AI_DAILY_BUDGET_USD = 'not-a-number';
    const mock = makeMock({ rows: [{ cost_usd: 0.5 }] });
    // Should use $1 default — below cap, so resolves.
    await expect(assertDailyBudget('u1', mock)).resolves.toBeUndefined();
  });

  it('RateLimitError carries spentUsd, capUsd, and code', async () => {
    process.env.AI_DAILY_BUDGET_USD = '1.0';
    const mock = makeMock({ rows: [{ cost_usd: 1.25 }] });
    try {
      await assertDailyBudget('u1', mock);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      const e = err as RateLimitError;
      expect(e.code).toBe('AI_RATE_LIMITED');
      expect(e.spentUsd).toBe(1.25);
      expect(e.capUsd).toBe(1.0);
    }
  });
});
