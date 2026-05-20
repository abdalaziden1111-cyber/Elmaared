// Phase V2.1 — GMV computation + threshold milestones.

import { describe, it, expect } from 'vitest';
import { computeUserGmv, checkGmvMilestones } from '@/lib/milestones/gmv';
import type { AdminSupabase } from '@/lib/supabase/admin';

interface MockShape {
  releasedAsClient: Array<{ total_amount: number | string | null }>;
  releasedAsSupplier: Array<{ total_amount: number | string | null }>;
  supplierIdForUser: string | null;
  existingMilestones: Set<string>;
  inserted: Array<{ user_id: string; milestone_type: string }>;
}

function makeMock(shape: MockShape): AdminSupabase {
  return {
    from(table: string) {
      if (table === 'escrow_transactions') {
        let isSupplierQuery = false;
        const builder = {
          select(cols: string) {
            isSupplierQuery = cols.includes('agreements');
            return this;
          },
          eq() {
            return this;
          },
          then(resolve: (v: unknown) => unknown) {
            const rows = isSupplierQuery
              ? shape.releasedAsSupplier
              : shape.releasedAsClient;
            return resolve({ data: rows, error: null });
          },
        };
        return builder;
      }
      if (table === 'suppliers') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({
              data: shape.supplierIdForUser
                ? { id: shape.supplierIdForUser, owner_id: 'unused' }
                : null,
              error: null,
            });
          },
        };
      }
      if (table === 'user_milestones') {
        let pendingMilestone: string | undefined;
        let pendingUser: string | undefined;
        const builder = {
          select() {
            return this;
          },
          eq(col: string, val: string) {
            if (col === 'user_id') pendingUser = val;
            if (col === 'milestone_type') pendingMilestone = val;
            return this;
          },
          maybeSingle() {
            const key = `${pendingUser}|${pendingMilestone}`;
            return Promise.resolve({
              data: shape.existingMilestones.has(key) ? { id: 'x' } : null,
              error: null,
            });
          },
          insert(row: { user_id: string; milestone_type: string }) {
            shape.existingMilestones.add(`${row.user_id}|${row.milestone_type}`);
            shape.inserted.push(row);
            return Promise.resolve({ error: null });
          },
        };
        return builder;
      }
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); },
      };
    },
  } as unknown as AdminSupabase;
}

describe('computeUserGmv', () => {
  it('returns 0 when user has no released transactions', async () => {
    const mock = makeMock({
      releasedAsClient: [],
      releasedAsSupplier: [],
      supplierIdForUser: null,
      existingMilestones: new Set(),
      inserted: [],
    });
    expect(await computeUserGmv('u1', mock)).toBe(0);
  });

  it('sums numeric and string totals across both sides of the deal', async () => {
    const mock = makeMock({
      releasedAsClient: [{ total_amount: 40_000 }, { total_amount: '60000.50' }],
      releasedAsSupplier: [{ total_amount: 100_000 }],
      supplierIdForUser: 'sup-1',
      existingMilestones: new Set(),
      inserted: [],
    });
    expect(await computeUserGmv('u1', mock)).toBe(200_000.5);
  });

  it('ignores non-numeric and null totals safely', async () => {
    const mock = makeMock({
      releasedAsClient: [
        { total_amount: 50_000 },
        { total_amount: null },
        { total_amount: 'not-a-number' },
      ],
      releasedAsSupplier: [],
      supplierIdForUser: null,
      existingMilestones: new Set(),
      inserted: [],
    });
    expect(await computeUserGmv('u1', mock)).toBe(50_000);
  });
});

describe('checkGmvMilestones — boundary cases', () => {
  it('fires no milestone below 100k', async () => {
    const mock = makeMock({
      releasedAsClient: [{ total_amount: 99_999 }],
      releasedAsSupplier: [],
      supplierIdForUser: null,
      existingMilestones: new Set(),
      inserted: [],
    });
    const fired = await checkGmvMilestones('u1', mock);
    expect(fired).toEqual([]);
  });

  it('fires exactly 100k_gmv at threshold', async () => {
    const inserted: Array<{ user_id: string; milestone_type: string }> = [];
    const mock = makeMock({
      releasedAsClient: [{ total_amount: 100_000 }],
      releasedAsSupplier: [],
      supplierIdForUser: null,
      existingMilestones: new Set(),
      inserted,
    });
    const fired = await checkGmvMilestones('u1', mock);
    expect(fired).toEqual(['100k_gmv']);
    expect(inserted).toEqual([{ user_id: 'u1', milestone_type: '100k_gmv' }]);
  });

  it('fires both 100k and 500k when a single deal pushes past two tiers', async () => {
    const inserted: Array<{ user_id: string; milestone_type: string }> = [];
    const mock = makeMock({
      releasedAsClient: [{ total_amount: 700_000 }],
      releasedAsSupplier: [],
      supplierIdForUser: null,
      existingMilestones: new Set(),
      inserted,
    });
    const fired = await checkGmvMilestones('u1', mock);
    expect(fired).toEqual(['100k_gmv', '500k_gmv']);
  });

  it('fires all three tiers at 1M and stops there', async () => {
    const inserted: Array<{ user_id: string; milestone_type: string }> = [];
    const mock = makeMock({
      releasedAsClient: [{ total_amount: 1_500_000 }],
      releasedAsSupplier: [],
      supplierIdForUser: null,
      existingMilestones: new Set(),
      inserted,
    });
    const fired = await checkGmvMilestones('u1', mock);
    expect(fired).toEqual(['100k_gmv', '500k_gmv', '1m_gmv']);
  });

  it('skips already-claimed tiers (re-run after a milestone was claimed)', async () => {
    const existingMilestones = new Set(['u1|100k_gmv']);
    const inserted: Array<{ user_id: string; milestone_type: string }> = [];
    const mock = makeMock({
      releasedAsClient: [{ total_amount: 600_000 }],
      releasedAsSupplier: [],
      supplierIdForUser: null,
      existingMilestones,
      inserted,
    });
    const fired = await checkGmvMilestones('u1', mock);
    expect(fired).toEqual(['500k_gmv']);
    expect(inserted).toEqual([{ user_id: 'u1', milestone_type: '500k_gmv' }]);
  });

  it('stops at the first tier the user has not yet crossed', async () => {
    const mock = makeMock({
      releasedAsClient: [{ total_amount: 250_000 }],
      releasedAsSupplier: [],
      supplierIdForUser: null,
      existingMilestones: new Set(),
      inserted: [],
    });
    const fired = await checkGmvMilestones('u1', mock);
    expect(fired).toEqual(['100k_gmv']);
  });
});
