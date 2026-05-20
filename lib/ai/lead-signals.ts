// Phase V1.3 — Pure data assembly for lead scoring.
//
// Pulls deterministic behavioural signals for a single profile. Kept pure
// (no AI call, no email side-effects) so it can be unit-tested with
// fixtures and reused by both the nightly batch and the admin-recompute
// action.

import type { AdminSupabase } from '@/lib/supabase/admin';

export interface LeadSignals {
  role: 'client' | 'supplier' | 'admin';
  daysSinceSignup: number;
  daysSinceLastRfq: number | null;
  daysSinceLastProposal: number | null;
  rfqCount: number;
  rfqsLast30Days: number;
  proposalsSubmitted: number;
  proposalsShortlisted: number;
  proposalsAccepted: number;
  agreementsSigned: number;
  escrowsFunded: number;
  projectsCompleted: number;
  totalGmvSar: number;
  /** Days since the most recent activity of any kind. null when no activity. */
  daysSinceLastActivity: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(now: number, iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now - t) / MS_PER_DAY));
}

/**
 * Build the full signal panel for one user. Returns deterministic
 * zero-defaults so the score function doesn't have to handle undefined
 * everywhere.
 *
 * Why this is one big function rather than many small ones: the admin
 * recompute action runs O(1) per click and we want one round of DB calls,
 * not N. The nightly batch can wrap this in Promise.all for a many-user
 * fan-out.
 */
export async function collectLeadSignals(
  userId: string,
  admin: AdminSupabase,
  nowTs: number = Date.now()
): Promise<LeadSignals | null> {
  // Profile + signup date + role.
  const { data: profileRow } = await admin
    .from('profiles')
    .select('role, created_at')
    .eq('id', userId)
    .maybeSingle();
  const profile = profileRow as
    | { role: 'client' | 'supplier' | 'admin'; created_at: string }
    | null;
  if (!profile) return null;

  const daysSinceSignup = daysBetween(nowTs, profile.created_at) ?? 0;
  const since30 = new Date(nowTs - 30 * MS_PER_DAY).toISOString();

  if (profile.role === 'admin') {
    // Admins aren't leads; return a sentinel so callers can skip them.
    return {
      role: 'admin',
      daysSinceSignup,
      daysSinceLastRfq: null,
      daysSinceLastProposal: null,
      rfqCount: 0,
      rfqsLast30Days: 0,
      proposalsSubmitted: 0,
      proposalsShortlisted: 0,
      proposalsAccepted: 0,
      agreementsSigned: 0,
      escrowsFunded: 0,
      projectsCompleted: 0,
      totalGmvSar: 0,
      daysSinceLastActivity: null,
    };
  }

  // --- CLIENT-SIDE SIGNALS (RFQs they posted) ---
  const { data: rfqRows } = await admin
    .from('rfqs')
    .select('id, status, created_at')
    .eq('client_id', userId);
  const rfqs = (rfqRows ?? []) as Array<{
    id: string;
    status: string;
    created_at: string;
  }>;
  const rfqCount = rfqs.length;
  const rfqsLast30Days = rfqs.filter((r) => r.created_at >= since30).length;
  const lastRfqAt = rfqs.length
    ? rfqs.map((r) => r.created_at).sort().slice(-1)[0]
    : null;
  const daysSinceLastRfq = daysBetween(nowTs, lastRfqAt);

  // --- SUPPLIER-SIDE SIGNALS (proposals they submitted) ---
  let proposalsSubmitted = 0;
  let proposalsShortlisted = 0;
  let proposalsAccepted = 0;
  let lastProposalAt: string | null = null;

  if (profile.role === 'supplier') {
    const { data: supRow } = await admin
      .from('suppliers')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();
    const supplierId = (supRow as { id: string } | null)?.id;
    if (supplierId) {
      const { data: propRows } = await admin
        .from('proposals')
        .select('status, created_at')
        .eq('supplier_id', supplierId);
      const props = (propRows ?? []) as Array<{
        status: string;
        created_at: string;
      }>;
      proposalsSubmitted = props.length;
      proposalsShortlisted = props.filter(
        (p) => p.status === 'shortlisted' || p.status === 'accepted'
      ).length;
      proposalsAccepted = props.filter((p) => p.status === 'accepted').length;
      lastProposalAt = props.length
        ? props.map((p) => p.created_at).sort().slice(-1)[0]
        : null;
    }
  }
  const daysSinceLastProposal = daysBetween(nowTs, lastProposalAt);

  // --- BOTH SIDES: agreements / escrow / completions / GMV ---
  // Agreements (client OR supplier party).
  const { data: agreementsClientRow } =
    profile.role === 'client'
      ? await admin
          .from('agreements')
          .select('id, status, rfq:rfqs!inner(client_id)', { count: 'exact' })
          .eq('rfqs.client_id', userId)
          .eq('status', 'signed')
      : { data: null };
  const { data: agreementsSupplierRow } =
    profile.role === 'supplier'
      ? await admin
          .from('agreements')
          .select('id, status, supplier:suppliers!inner(owner_id)', { count: 'exact' })
          .eq('suppliers.owner_id', userId)
          .eq('status', 'signed')
      : { data: null };
  const agreementsSigned =
    (agreementsClientRow?.length ?? 0) + (agreementsSupplierRow?.length ?? 0);

  // Escrows funded (only clients fund; suppliers see them via released).
  let escrowsFunded = 0;
  if (profile.role === 'client') {
    const { data: escrowRows } = await admin
      .from('escrow_transactions')
      .select('id, rfq:rfqs!inner(client_id)')
      .eq('rfqs.client_id', userId)
      .in('status', ['work_in_progress', 'delivered', 'final_payment', 'released']);
    escrowsFunded = (escrowRows ?? []).length;
  }

  // Completed projects + GMV (released escrows on either side).
  const { data: releasedClientRows } =
    profile.role === 'client'
      ? await admin
          .from('escrow_transactions')
          .select('total_amount, rfq:rfqs!inner(client_id)')
          .eq('status', 'released')
          .eq('rfqs.client_id', userId)
      : { data: null };
  let releasedSupplierRows: Array<{ total_amount: number | string | null }> = [];
  if (profile.role === 'supplier') {
    const { data: supRow } = await admin
      .from('suppliers')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();
    const supplierId = (supRow as { id: string } | null)?.id;
    if (supplierId) {
      const { data } = await admin
        .from('escrow_transactions')
        .select('total_amount, agreement:agreements!inner(supplier_id)')
        .eq('status', 'released')
        .eq('agreements.supplier_id', supplierId);
      releasedSupplierRows = (data ?? []) as Array<{
        total_amount: number | string | null;
      }>;
    }
  }
  const releasedClient = (releasedClientRows ?? []) as Array<{
    total_amount: number | string | null;
  }>;
  const projectsCompleted = releasedClient.length + releasedSupplierRows.length;
  const sumTotals = (rows: Array<{ total_amount: number | string | null }>) =>
    rows.reduce((acc, r) => {
      const n =
        typeof r.total_amount === 'string'
          ? Number(r.total_amount)
          : r.total_amount;
      return acc + (typeof n === 'number' && Number.isFinite(n) ? n : 0);
    }, 0);
  const totalGmvSar =
    sumTotals(releasedClient) + sumTotals(releasedSupplierRows);

  // Most-recent activity timestamp across the signals we collected.
  const activityCandidates = [
    lastRfqAt,
    lastProposalAt,
  ].filter((t): t is string => Boolean(t));
  const lastActivityAt =
    activityCandidates.length > 0
      ? activityCandidates.sort().slice(-1)[0]
      : profile.created_at;
  const daysSinceLastActivity = daysBetween(nowTs, lastActivityAt);

  return {
    role: profile.role,
    daysSinceSignup,
    daysSinceLastRfq,
    daysSinceLastProposal,
    rfqCount,
    rfqsLast30Days,
    proposalsSubmitted,
    proposalsShortlisted,
    proposalsAccepted,
    agreementsSigned,
    escrowsFunded,
    projectsCompleted,
    totalGmvSar,
    daysSinceLastActivity,
  };
}
