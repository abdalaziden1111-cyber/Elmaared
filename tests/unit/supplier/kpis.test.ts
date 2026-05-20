// Phase V6.1 — Supplier KPI query helpers.

import { describe, it, expect } from 'vitest';
import {
  getProposalsTotals,
  getMonthlyRevenue,
  getRevenueYoY,
  getAvgRating,
  getCategoryWinRate,
} from '@/lib/supplier/kpis';
import type { AdminSupabase } from '@/lib/supabase/admin';

// ---------- mock supabase admin client ----------
type Row = Record<string, unknown>;

function makeAdmin(rowsByTable: Record<string, Row[]>): AdminSupabase {
  return {
    from(table: string) {
      let rows = rowsByTable[table] ?? [];
      const builder = {
        select() {
          return this;
        },
        eq(col: string, val: unknown) {
          rows = rows.filter((r) => {
            // Support shallow + 1-level-deep filtering. Supabase's
            // eq('agreements.supplier_id', x) on a joined
            // `agreement:agreements!inner(...)` SELECT walks the JOINED
            // table name (`agreements`) — but the returned row uses the
            // alias (`agreement`). The mock checks both forms.
            const dotted = col.split('.');
            if (dotted.length === 1) return r[col] === val;
            const head = dotted[0];
            const tail = dotted.slice(1).join('.');
            const candidates = [head];
            if (head.endsWith('s')) candidates.push(head.slice(0, -1));
            else candidates.push(head + 's');
            for (const k of candidates) {
              const sub = r[k];
              if (sub && typeof sub === 'object' && (sub as Row)[tail] === val) {
                return true;
              }
            }
            return false;
          });
          return this;
        },
        in(col: string, vals: unknown[]) {
          rows = rows.filter((r) => vals.includes(r[col]));
          return this;
        },
        gte(col: string, val: string) {
          rows = rows.filter(
            (r) => typeof r[col] === 'string' && (r[col] as string) >= val
          );
          return this;
        },
        then(resolve: (v: unknown) => unknown) {
          return resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
  } as unknown as AdminSupabase;
}

describe('getProposalsTotals', () => {
  it('returns zero counts for a supplier with no proposals', async () => {
    const r = await getProposalsTotals('s1', makeAdmin({ proposals: [] }));
    expect(r.lifetime).toBe(0);
    expect(r.thisMonth).toBe(0);
    expect(r.accepted).toBe(0);
    expect(r.acceptanceRatePct).toBeNull();
  });

  it('counts lifetime + month + accepted correctly', async () => {
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const admin = makeAdmin({
      proposals: [
        { supplier_id: 's1', status: 'accepted', created_at: now },
        { supplier_id: 's1', status: 'accepted', created_at: old },
        { supplier_id: 's1', status: 'rejected', created_at: old },
        { supplier_id: 's1', status: 'submitted', created_at: now },
      ],
    });
    const r = await getProposalsTotals('s1', admin);
    expect(r.lifetime).toBe(4);
    expect(r.thisMonth).toBe(2);
    expect(r.accepted).toBe(2);
    // 2 accepted / (2+1 decided) = 66.7%
    expect(r.acceptanceRatePct).toBeCloseTo(66.7, 1);
  });
});

describe('getMonthlyRevenue', () => {
  it('returns N empty buckets when supplier has zero released escrows', async () => {
    const r = await getMonthlyRevenue('s1', 6, makeAdmin({ escrow_transactions: [] }));
    expect(r).toHaveLength(6);
    expect(r.every((b) => b.total === 0)).toBe(true);
    // Buckets are chronological.
    expect([...r].sort((a, b) => a.month.localeCompare(b.month))).toEqual(r);
  });

  it('sums supplier_net into the matching month bucket', async () => {
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const admin = makeAdmin({
      escrow_transactions: [
        {
          status: 'released',
          released_at: now.toISOString(),
          supplier_net: 30_000,
          agreement: { supplier_id: 's1' },
        },
        {
          status: 'released',
          released_at: now.toISOString(),
          supplier_net: '15000.50',
          agreement: { supplier_id: 's1' },
        },
      ],
    });
    const r = await getMonthlyRevenue('s1', 6, admin);
    const currentBucket = r.find((b) => b.month === ym);
    expect(currentBucket?.total).toBeCloseTo(45000.5, 2);
  });
});

describe('getRevenueYoY', () => {
  it('returns zeros when no released revenue exists', async () => {
    const r = await getRevenueYoY('s1', makeAdmin({ escrow_transactions: [] }));
    expect(r.thisYear).toBe(0);
    expect(r.lastYear).toBe(0);
    expect(r.growthPct).toBeNull();
  });
});

describe('getAvgRating', () => {
  it('null average + 0 count for no reviews', async () => {
    const r = await getAvgRating('s1', makeAdmin({ reviews: [] }));
    expect(r.average).toBeNull();
    expect(r.count).toBe(0);
  });

  it('average + count for a supplier with reviews', async () => {
    const admin = makeAdmin({
      reviews: [
        { supplier_id: 's1', is_public: true, rating_overall: 5 },
        { supplier_id: 's1', is_public: true, rating_overall: 4 },
        { supplier_id: 's1', is_public: true, rating_overall: 5 },
      ],
    });
    const r = await getAvgRating('s1', admin);
    expect(r.count).toBe(3);
    expect(r.average).toBeCloseTo(4.7, 1);
  });
});

describe('getCategoryWinRate', () => {
  it('returns empty when supplier has no proposals', async () => {
    const r = await getCategoryWinRate('s1', makeAdmin({ proposals: [] }));
    expect(r).toEqual([]);
  });

  it('groups by service_type and computes win rates', async () => {
    const admin = makeAdmin({
      proposals: [
        { supplier_id: 's1', status: 'accepted', rfq: { service_type: 'booth' } },
        { supplier_id: 's1', status: 'rejected', rfq: { service_type: 'booth' } },
        { supplier_id: 's1', status: 'accepted', rfq: { service_type: 'gifts' } },
      ],
    });
    const r = await getCategoryWinRate('s1', admin);
    expect(r).toHaveLength(2);
    const booth = r.find((b) => b.category === 'booth')!;
    expect(booth.proposals).toBe(2);
    expect(booth.accepted).toBe(1);
    expect(booth.winRatePct).toBe(50);
    const gifts = r.find((b) => b.category === 'gifts')!;
    expect(gifts.winRatePct).toBe(100);
  });

  it('sorts by proposal count desc', async () => {
    const admin = makeAdmin({
      proposals: [
        { supplier_id: 's1', status: 'accepted', rfq: { service_type: 'gifts' } },
        { supplier_id: 's1', status: 'accepted', rfq: { service_type: 'booth' } },
        { supplier_id: 's1', status: 'accepted', rfq: { service_type: 'booth' } },
        { supplier_id: 's1', status: 'accepted', rfq: { service_type: 'booth' } },
      ],
    });
    const r = await getCategoryWinRate('s1', admin);
    expect(r[0].category).toBe('booth');
    expect(r[1].category).toBe('gifts');
  });
});
