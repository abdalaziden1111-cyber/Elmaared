// Phase V1.1 — AI cache: hash key + read/write + TTL expiry.

import { describe, it, expect, vi } from 'vitest';
import {
  stableStringify,
  hashKey,
  readCache,
  writeCache,
} from '@/lib/ai/cache';
import type { AdminSupabase } from '@/lib/supabase/admin';

describe('stableStringify — key ordering', () => {
  it('produces identical output regardless of object key order', () => {
    const a = { b: 1, a: 2, c: { y: 1, x: 2 } };
    const b = { a: 2, c: { x: 2, y: 1 }, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('preserves array order (arrays are semantic)', () => {
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(stableStringify([3, 2, 1])).toBe('[3,2,1]');
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });

  it('handles nested null + primitives', () => {
    expect(stableStringify({ x: null, y: 'hi', z: 42 })).toBe(
      '{"x":null,"y":"hi","z":42}'
    );
  });

  it('handles empty object and empty array', () => {
    expect(stableStringify({})).toBe('{}');
    expect(stableStringify([])).toBe('[]');
  });
});

describe('hashKey — determinism', () => {
  it('returns the same hash for the same input regardless of key order', () => {
    const a = hashKey({
      operation: 'score_proposal',
      model: 'm1',
      input: { a: 1, b: 2 },
    });
    const b = hashKey({
      operation: 'score_proposal',
      model: 'm1',
      input: { b: 2, a: 1 },
    });
    expect(a).toBe(b);
  });

  it('returns different hashes for different operations on the same input', () => {
    const score = hashKey({
      operation: 'score_proposal',
      model: 'm1',
      input: { x: 1 },
    });
    const analyze = hashKey({
      operation: 'analyze_agreement',
      model: 'm1',
      input: { x: 1 },
    });
    expect(score).not.toBe(analyze);
  });

  it('returns different hashes when the model changes', () => {
    const a = hashKey({
      operation: 'score_proposal',
      model: 'sonnet',
      input: { x: 1 },
    });
    const b = hashKey({
      operation: 'score_proposal',
      model: 'opus',
      input: { x: 1 },
    });
    expect(a).not.toBe(b);
  });

  it('returns SHA-256 hex (64 chars)', () => {
    const h = hashKey({
      operation: 'score_proposal',
      model: 'm',
      input: {},
    });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ---------- mock supabase admin ----------
interface MockTable {
  row?: Record<string, unknown> | null;
  upsertCalls: Array<Record<string, unknown>>;
}

function makeMock(table: MockTable): AdminSupabase {
  return {
    from(_t: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: table.row ?? null, error: null });
        },
        upsert(row: Record<string, unknown>) {
          table.upsertCalls.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as AdminSupabase;
}

describe('readCache + TTL expiry', () => {
  it('returns null on cache miss', async () => {
    const t: MockTable = { row: null, upsertCalls: [] };
    const result = await readCache('deadbeef', makeMock(t));
    expect(result).toBeNull();
  });

  it('returns the entry on cache hit', async () => {
    const t: MockTable = {
      row: {
        payload: { score: 80 },
        model: 'sonnet',
        created_at: '2026-05-20T00:00:00Z',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      upsertCalls: [],
    };
    const result = await readCache<{ score: number }>('abc', makeMock(t));
    expect(result).not.toBeNull();
    expect(result?.payload.score).toBe(80);
    expect(result?.model).toBe('sonnet');
  });

  it('returns null for expired entries (TTL elapsed)', async () => {
    const t: MockTable = {
      row: {
        payload: { score: 80 },
        model: 'sonnet',
        created_at: '2026-01-01T00:00:00Z',
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      },
      upsertCalls: [],
    };
    expect(await readCache('expired', makeMock(t))).toBeNull();
  });
});

describe('writeCache', () => {
  it('upserts with default 30-day TTL', async () => {
    const t: MockTable = { upsertCalls: [] };
    await writeCache({
      hash: 'h1',
      operation: 'score_proposal',
      payload: { x: 1 },
      model: 'm',
      admin: makeMock(t),
    });
    expect(t.upsertCalls).toHaveLength(1);
    const upsert = t.upsertCalls[0];
    expect(upsert.hash).toBe('h1');
    expect(upsert.payload).toEqual({ x: 1 });
    const expiresAt = new Date(upsert.expires_at as string).getTime();
    const target = Date.now() + 30 * 24 * 60 * 60 * 1000;
    // Allow ±5s drift for test execution time.
    expect(Math.abs(expiresAt - target)).toBeLessThan(5_000);
  });

  it('respects custom ttlDays', async () => {
    const t: MockTable = { upsertCalls: [] };
    await writeCache({
      hash: 'h2',
      operation: 'analyze_agreement',
      payload: {},
      model: 'm',
      ttlDays: 1,
      admin: makeMock(t),
    });
    const expiresAt = new Date(
      t.upsertCalls[0].expires_at as string
    ).getTime();
    const target = Date.now() + 24 * 60 * 60 * 1000;
    expect(Math.abs(expiresAt - target)).toBeLessThan(5_000);
  });
});

// Silence the structured logger noise from intentional error paths.
vi.spyOn(console, 'error').mockImplementation(() => {});
