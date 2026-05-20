// Phase V6.1 — Supplier KPI query helpers.
//
// Pure data functions. Each takes a supplierId + an optional admin client
// (lets tests pass a mock). The page composes them with Promise.all for
// a single round-trip-shaped fan-out.

import type { AdminSupabase } from '@/lib/supabase/admin';
import { createAdminClient } from '@/lib/supabase/admin';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pickAdmin(admin?: AdminSupabase): AdminSupabase {
  return admin ?? createAdminClient();
}

export interface ProposalsTotalsResult {
  lifetime: number;
  thisMonth: number;
  accepted: number;
  acceptanceRatePct: number | null;
}

/**
 * Lifetime + this-month proposal counts + acceptance rate.
 * Acceptance rate = accepted / (accepted + rejected) — proposals that are
 * still open (submitted/under_review/shortlisted) are excluded so a fresh
 * supplier doesn't show 0% just because their deals are mid-flight.
 */
export async function getProposalsTotals(
  supplierId: string,
  admin?: AdminSupabase
): Promise<ProposalsTotalsResult> {
  const client = pickAdmin(admin);
  const since30 = new Date(Date.now() - 30 * MS_PER_DAY).toISOString();

  const { data } = await client
    .from('proposals')
    .select('status, created_at')
    .eq('supplier_id', supplierId);

  const rows = (data ?? []) as Array<{ status: string; created_at: string }>;
  const lifetime = rows.length;
  const thisMonth = rows.filter((r) => r.created_at >= since30).length;
  const accepted = rows.filter((r) => r.status === 'accepted').length;
  const rejected = rows.filter((r) => r.status === 'rejected').length;
  const decided = accepted + rejected;
  const acceptanceRatePct =
    decided > 0 ? Math.round((accepted / decided) * 1000) / 10 : null;

  return { lifetime, thisMonth, accepted, acceptanceRatePct };
}

export async function getActiveProjectsCount(
  supplierId: string,
  admin?: AdminSupabase
): Promise<number> {
  const client = pickAdmin(admin);
  // A project is "active" when an escrow exists in work_in_progress or
  // delivered, joined through the supplier-side agreement.
  const { data } = await client
    .from('escrow_transactions')
    .select('id, agreement:agreements!inner(supplier_id)')
    .eq('agreements.supplier_id', supplierId)
    .in('status', ['work_in_progress', 'delivered', 'final_payment']);
  return (data ?? []).length;
}

export interface MonthlyBucket {
  month: string; // YYYY-MM
  total: number;
}

/**
 * Released-escrow revenue grouped by month, for the trailing N months.
 * Uses `supplier_net` (the amount actually paid to the supplier after the
 * platform fee + VAT), not total_amount, to match the supplier's mental
 * model of "what I earned".
 */
export async function getMonthlyRevenue(
  supplierId: string,
  months = 12,
  admin?: AdminSupabase
): Promise<MonthlyBucket[]> {
  const client = pickAdmin(admin);
  const since = new Date(Date.now() - months * 31 * MS_PER_DAY).toISOString();

  const { data } = await client
    .from('escrow_transactions')
    .select(
      'supplier_net, released_at, agreement:agreements!inner(supplier_id)'
    )
    .eq('agreements.supplier_id', supplierId)
    .eq('status', 'released')
    .gte('released_at', since);

  const rows = (data ?? []) as Array<{
    supplier_net: number | string | null;
    released_at: string | null;
  }>;

  // Pre-fill the last N month buckets with zero so the chart shows a
  // continuous line even when months are empty. Build via Date.UTC so the
  // bucket key always matches formatMonth's UTC-based extraction even at
  // local-tz midnight boundaries.
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.set(formatMonth(d), 0);
  }

  for (const r of rows) {
    if (!r.released_at) continue;
    const key = formatMonth(new Date(r.released_at));
    if (!buckets.has(key)) continue;
    const v =
      typeof r.supplier_net === 'string'
        ? Number(r.supplier_net)
        : r.supplier_net;
    if (Number.isFinite(v ?? NaN)) {
      buckets.set(key, (buckets.get(key) ?? 0) + (v ?? 0));
    }
  }
  return Array.from(buckets.entries()).map(([month, total]) => ({
    month,
    total,
  }));
}

export interface RevenueYoYResult {
  thisYear: number;
  lastYear: number;
  growthPct: number | null;
}

export async function getRevenueYoY(
  supplierId: string,
  admin?: AdminSupabase
): Promise<RevenueYoYResult> {
  const client = pickAdmin(admin);
  const now = new Date();
  const startOfThisYear = new Date(now.getUTCFullYear(), 0, 1).toISOString();
  const startOfLastYear = new Date(now.getUTCFullYear() - 1, 0, 1).toISOString();
  const startOfThisYearLastYearWindow = new Date(
    now.getUTCFullYear() - 1,
    now.getUTCMonth(),
    now.getUTCDate()
  ).toISOString();

  const { data: rows } = await client
    .from('escrow_transactions')
    .select(
      'supplier_net, released_at, agreement:agreements!inner(supplier_id)'
    )
    .eq('agreements.supplier_id', supplierId)
    .eq('status', 'released')
    .gte('released_at', startOfLastYear);

  let thisYear = 0;
  let lastYear = 0;
  for (const r of (rows ?? []) as Array<{
    supplier_net: number | string | null;
    released_at: string | null;
  }>) {
    if (!r.released_at) continue;
    const t = r.released_at;
    const v =
      typeof r.supplier_net === 'string'
        ? Number(r.supplier_net)
        : r.supplier_net;
    if (!Number.isFinite(v ?? NaN)) continue;
    if (t >= startOfThisYear) thisYear += v ?? 0;
    else if (t < startOfThisYear && t >= startOfLastYear && t <= startOfThisYearLastYearWindow)
      lastYear += v ?? 0;
  }
  const growthPct =
    lastYear > 0
      ? Math.round(((thisYear - lastYear) / lastYear) * 1000) / 10
      : null;
  return { thisYear, lastYear, growthPct };
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export async function getAvgRating(
  supplierId: string,
  admin?: AdminSupabase
): Promise<RatingSummary> {
  const client = pickAdmin(admin);
  const { data } = await client
    .from('reviews')
    .select('rating_overall')
    .eq('supplier_id', supplierId)
    .eq('is_public', true);
  const rows = (data ?? []) as Array<{ rating_overall: number }>;
  if (rows.length === 0) return { average: null, count: 0 };
  const sum = rows.reduce((a, r) => a + (r.rating_overall ?? 0), 0);
  return {
    average: Math.round((sum / rows.length) * 10) / 10,
    count: rows.length,
  };
}

export interface CategoryWinRate {
  category: string;
  proposals: number;
  accepted: number;
  winRatePct: number;
}

export async function getCategoryWinRate(
  supplierId: string,
  admin?: AdminSupabase
): Promise<CategoryWinRate[]> {
  const client = pickAdmin(admin);
  const { data } = await client
    .from('proposals')
    .select('status, rfq:rfqs!inner(service_type)')
    .eq('supplier_id', supplierId);
  const rows = (data ?? []) as unknown as Array<{
    status: string;
    rfq:
      | { service_type: string }
      | { service_type: string }[]
      | null;
  }>;
  const buckets = new Map<string, { proposals: number; accepted: number }>();
  for (const r of rows) {
    const rfq = Array.isArray(r.rfq) ? r.rfq[0] ?? null : r.rfq;
    const cat = rfq?.service_type ?? 'unknown';
    const b = buckets.get(cat) ?? { proposals: 0, accepted: 0 };
    b.proposals += 1;
    if (r.status === 'accepted') b.accepted += 1;
    buckets.set(cat, b);
  }
  return Array.from(buckets.entries())
    .map(([category, b]) => ({
      category,
      proposals: b.proposals,
      accepted: b.accepted,
      winRatePct:
        b.proposals > 0
          ? Math.round((b.accepted / b.proposals) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.proposals - a.proposals);
}

export interface RatingTrendPoint {
  month: string;
  average: number;
  count: number;
}

export async function getRatingTrend(
  supplierId: string,
  months = 12,
  admin?: AdminSupabase
): Promise<RatingTrendPoint[]> {
  const client = pickAdmin(admin);
  const since = new Date(Date.now() - months * 31 * MS_PER_DAY).toISOString();
  const { data } = await client
    .from('reviews')
    .select('rating_overall, created_at')
    .eq('supplier_id', supplierId)
    .eq('is_public', true)
    .gte('created_at', since);
  const rows = (data ?? []) as Array<{
    rating_overall: number;
    created_at: string;
  }>;
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const key = formatMonth(new Date(r.created_at));
    const b = buckets.get(key) ?? { sum: 0, count: 0 };
    b.sum += r.rating_overall;
    b.count += 1;
    buckets.set(key, b);
  }
  return Array.from(buckets.entries())
    .map(([month, b]) => ({
      month,
      average: Math.round((b.sum / b.count) * 10) / 10,
      count: b.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface SupplierKpiSnapshot {
  proposals: ProposalsTotalsResult;
  activeProjects: number;
  monthlyRevenue: MonthlyBucket[];
  revenueYoY: RevenueYoYResult;
  rating: RatingSummary;
  categoryWinRate: CategoryWinRate[];
  ratingTrend: RatingTrendPoint[];
}

/**
 * Convenience: run every KPI in parallel. The dashboard uses this so it
 * makes a single fan-out instead of 7 sequential awaits.
 */
export async function getSupplierKpiSnapshot(
  supplierId: string,
  admin?: AdminSupabase
): Promise<SupplierKpiSnapshot> {
  const client = pickAdmin(admin);
  const [
    proposals,
    activeProjects,
    monthlyRevenue,
    revenueYoY,
    rating,
    categoryWinRate,
    ratingTrend,
  ] = await Promise.all([
    getProposalsTotals(supplierId, client),
    getActiveProjectsCount(supplierId, client),
    getMonthlyRevenue(supplierId, 12, client),
    getRevenueYoY(supplierId, client),
    getAvgRating(supplierId, client),
    getCategoryWinRate(supplierId, client),
    getRatingTrend(supplierId, 12, client),
  ]);
  return {
    proposals,
    activeProjects,
    monthlyRevenue,
    revenueYoY,
    rating,
    categoryWinRate,
    ratingTrend,
  };
}

function formatMonth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
