// Phase V2.1 — GMV computation + threshold milestones.
//
// "Gross Merchandise Volume" per user = sum of `total_amount` from released
// escrow transactions on RFQs/agreements the user is party to.
//
// A user can be either side of a deal:
//   - client owns the RFQ (rfqs.client_id = user.id)
//   - supplier owns the proposal (suppliers.owner_id = user.id)
//
// Both perspectives count toward GMV — Plan v2 §11 treats the milestone as
// "value flowed through Elmaared because of you", not "money you paid".

import type { MilestoneType } from '@/lib/supabase/types';
import type { AdminSupabase } from '@/lib/supabase/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { maybeFireMilestone } from './triggers';

const GMV_THRESHOLDS: ReadonlyArray<{ amount: number; milestone: MilestoneType }> = [
  { amount: 100_000, milestone: '100k_gmv' },
  { amount: 500_000, milestone: '500k_gmv' },
  { amount: 1_000_000, milestone: '1m_gmv' },
];

/**
 * Sum the `total_amount` of all released escrow transactions tied to the
 * user, on either the client or supplier side. Released means
 * `escrow_transactions.status = 'released'` (Phase V uses the evidence-only
 * flow where `released_at` marks the close of the project).
 *
 * Returns 0 if the user has no completed deals — never throws.
 */
export async function computeUserGmv(
  userId: string,
  admin?: AdminSupabase
): Promise<number> {
  const client = admin ?? createAdminClient();

  // Client-side: escrow_transactions joined to rfqs where rfqs.client_id = userId
  const { data: asClientRaw } = await client
    .from('escrow_transactions')
    .select('total_amount, rfqs!inner(client_id)')
    .eq('status', 'released')
    .eq('rfqs.client_id', userId);

  // Supplier-side: through agreements.supplier_id → suppliers.owner_id = userId
  const { data: supplierRowRaw } = await client
    .from('suppliers')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  const supplierId = (supplierRowRaw as { id: string } | null)?.id ?? null;

  let asSupplierRaw: Array<{ total_amount: number | string | null }> = [];
  if (supplierId) {
    const { data } = await client
      .from('escrow_transactions')
      .select('total_amount, agreements!inner(supplier_id)')
      .eq('status', 'released')
      .eq('agreements.supplier_id', supplierId);
    asSupplierRaw = (data ?? []) as Array<{ total_amount: number | string | null }>;
  }

  const asClient = (asClientRaw ?? []) as Array<{ total_amount: number | string | null }>;

  const sum = (rows: Array<{ total_amount: number | string | null }>) =>
    rows.reduce((acc, r) => {
      const n =
        typeof r.total_amount === 'string'
          ? Number(r.total_amount)
          : r.total_amount;
      return acc + (typeof n === 'number' && Number.isFinite(n) ? n : 0);
    }, 0);

  return sum(asClient) + sum(asSupplierRaw);
}

/**
 * Compute the user's GMV and fire any threshold milestones they've crossed
 * but haven't claimed yet. Lower thresholds fire first, so a single project
 * pushing a user past two tiers will celebrate both.
 *
 * Returns the list of milestones actually fired this call (excludes ones
 * already claimed earlier).
 */
export async function checkGmvMilestones(
  userId: string,
  admin?: AdminSupabase
): Promise<MilestoneType[]> {
  const client = admin ?? createAdminClient();
  const gmv = await computeUserGmv(userId, client);
  const fired: MilestoneType[] = [];

  for (const tier of GMV_THRESHOLDS) {
    if (gmv < tier.amount) break;
    const result = await maybeFireMilestone(userId, tier.milestone, client);
    if (result.fired) fired.push(tier.milestone);
  }
  return fired;
}

export const _GMV_THRESHOLDS_FOR_TEST = GMV_THRESHOLDS;
