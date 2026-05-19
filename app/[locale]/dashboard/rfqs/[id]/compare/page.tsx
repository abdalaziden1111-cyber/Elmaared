import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils/format';
import { StatusPill } from '@/components/ui/status-pill';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ConfidenceBadge } from '@/components/ai/confidence-badge';
import { MarketRange } from '@/components/ai/market-range';
import { AIFallback } from '@/components/ai/ai-fallback';
import { AIDisagreeButton } from '@/components/ai/ai-disagree-button';
import {
  IdentityBadges,
  type IdentityBadgeSignals,
} from '@/components/trust/identity-badges';
import { flags } from '@/lib/feature-flags';
import type { AiConfidenceLevel } from '@/lib/supabase/types';
import { ShortlistButton } from './shortlist-button';
import { AwardButton } from './award-button';

// AI scoring is async. If a proposal has been waiting for > 5 minutes without
// a score, the AI Gateway is either down or unconfigured — show a static
// "scoring unavailable" notice instead of a perpetually-pending placeholder.
const AI_PENDING_WINDOW_MS = 5 * 60 * 1000;

interface ProposalRow {
  id: string;
  total_price: number;
  delivery_days: number;
  description: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_strengths: string[] | null;
  ai_concerns: string[] | null;
  // UX Plan v2 Decision #01 — market-quality metadata (Sprint 1 S1.1).
  ai_confidence: AiConfidenceLevel | null;
  ai_sample_size: number | null;
  ai_variance_pct: number | null;
  ai_price_range_min: number | null;
  ai_price_range_max: number | null;
  status: string;
  created_at: string;
  supplier: {
    id: string;
    company_name: string;
    average_rating: number | null;
    total_completed_orders: number | null;
  } | null;
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole(['client']);

  // Workaround for recursive RLS on rfqs ↔ proposals: read via admin, enforce
  // ownership manually. requireRole already proved the user is a client.
  const admin = createAdminClient();

  // Sprint 6 S6.2 — RFQ ownership check and proposal SELECT are independent
  // queries; the ownership guard runs in-process after both return. Fan out
  // both Supabase round-trips in parallel. If ownership fails we waste a
  // single proposals SELECT — trivial cost on the rare 404 path.
  const [{ data: rfqRowRaw }, { data: proposalsRaw }] = await Promise.all([
    admin
      .from('rfqs')
      .select('id, rfq_number, title, client_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    admin
      .from('proposals')
      .select(
        `id, total_price, delivery_days, description, ai_score, ai_summary, ai_strengths, ai_concerns,
         ai_confidence, ai_sample_size, ai_variance_pct, ai_price_range_min, ai_price_range_max,
         status, created_at,
         supplier:suppliers (id, company_name, average_rating, total_completed_orders)`,
      )
      .eq('rfq_id', id)
      .order('ai_score', { ascending: false, nullsFirst: false }),
  ]);
  const rfq = rfqRowRaw as
    | { id: string; rfq_number: string; title: string; client_id: string }
    | null;
  if (!rfq || rfq.client_id !== user.id) notFound();

  const proposals = (proposalsRaw ?? []) as unknown as ProposalRow[];

  // Plan v2 Decision #01 — market context is identical for every proposal in
  // this RFQ (same service_type baseline). Render one MarketRange card at the
  // top instead of repeating it per row. Pulled from the first proposal that
  // has been scored. Hidden when FF_AI_CONFIDENCE is off.
  const marketRef = proposals.find((p) => p.ai_confidence != null);
  const showAiConfidenceUi = flags.AI_CONFIDENCE_UI;

  // Trust Layer 1 (Sprint 3 S3.1) — fetch identity signals in one batched
  // query keyed by every supplier appearing in the proposal list. Skipped
  // entirely when FF_TRUST is off so the migration-not-applied path stays
  // a no-op.
  const trustSignalsBySupplier = new Map<string, IdentityBadgeSignals>();
  if (flags.TRUST_ARCHITECTURE && proposals.length > 0) {
    const supplierIds = Array.from(
      new Set(proposals.map((p) => p.supplier?.id).filter(Boolean) as string[]),
    );
    if (supplierIds.length > 0) {
      const { data: signalRows } = await admin
        .from('supplier_trust_signals')
        .select(
          'supplier_id, identity_verified, zatca_verified, gov_id_verified, photo_id_uploaded, references_count',
        )
        .in('supplier_id', supplierIds);
      for (const row of signalRows ?? []) {
        trustSignalsBySupplier.set(row.supplier_id, {
          identityVerified: row.identity_verified,
          zatcaVerified: row.zatca_verified,
          govIdVerified: row.gov_id_verified,
          photoIdUploaded: row.photo_id_uploaded,
          referencesCount: row.references_count,
        });
      }
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { href: '/dashboard', label: 'لوحة التحكم' },
          { href: '/dashboard/rfqs', label: 'طلباتي' },
          { href: `/dashboard/rfqs/${id}`, label: rfq.rfq_number },
          { label: 'مقارنة العروض' },
        ]}
      />
      <div className="text-xs text-[var(--color-stone-600)] num">{rfq.rfq_number}</div>
      <h1 className="mt-1 text-2xl font-semibold text-[var(--color-midnight-green)]">
        مقارنة العروض
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        {rfq.title} · {proposals.length} عروض
      </p>

      {proposals.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لم تصل عروض بعد. فور تقديم أول عرض، سنخطرك ويبدأ الذكاء الاصطناعي
            بالتقييم تلقائياً.
          </p>
        </div>
      ) : (
        <>
          {showAiConfidenceUi && marketRef ? (
            <div className="mt-6">
              <MarketRange
                level={marketRef.ai_confidence ?? 'unknown'}
                min={marketRef.ai_price_range_min}
                max={marketRef.ai_price_range_max}
                sampleSize={marketRef.ai_sample_size}
                variancePct={marketRef.ai_variance_pct}
              />
            </div>
          ) : null}
          <ul className="mt-6 grid gap-4">
          {proposals.map((p, idx) => (
            <li
              key={p.id}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {idx === 0 && p.ai_score ? (
                      <span className="rounded-full bg-[var(--color-dune-gold-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-dune-gold)]">
                        الأفضل وفق التقييم
                      </span>
                    ) : null}
                    <h2 className="text-base font-semibold">
                      {p.supplier?.company_name ?? 'مورد'}
                    </h2>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--color-stone-600)]">
                    {p.supplier?.average_rating ? (
                      <span className="num">★ {p.supplier.average_rating}</span>
                    ) : null}
                    {p.supplier?.total_completed_orders ? (
                      <span>· {p.supplier.total_completed_orders} مشروع</span>
                    ) : null}
                  </div>
                  {/* Trust Layer 1 (compact) — identity badges in the row header (Sprint 3 S3.5) */}
                  {flags.TRUST_ARCHITECTURE && p.supplier ? (
                    <div className="mt-2">
                      <IdentityBadges
                        signals={trustSignalsBySupplier.get(p.supplier.id) ?? null}
                        compact
                      />
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 text-end">
                  <div className="text-lg font-semibold text-[var(--color-midnight-green)] num">
                    {formatCurrency(p.total_price)}
                  </div>
                  <div className="text-xs text-[var(--color-stone-600)]">
                    {p.delivery_days} يوم تسليم
                  </div>
                </div>
              </div>

              {p.ai_score != null ? (
                <div className="mt-4 rounded-xl bg-[var(--color-stone-100)] p-4 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-[var(--color-midnight-green)]">
                      تقييم الذكاء الاصطناعي
                    </span>
                    {showAiConfidenceUi && p.ai_confidence ? (
                      <ConfidenceBadge
                        level={p.ai_confidence}
                        sampleSize={p.ai_sample_size}
                        variancePct={p.ai_variance_pct}
                      />
                    ) : (
                      <span className="num text-lg font-semibold">
                        {p.ai_score}/100
                      </span>
                    )}
                  </div>
                  {p.ai_summary ? (
                    <p className="mt-2 text-sm text-[var(--color-charcoal)]/80">
                      {p.ai_summary}
                    </p>
                  ) : null}
                  {p.ai_strengths?.length ? (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-[var(--color-success)]">
                        نقاط قوة
                      </div>
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {p.ai_strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {p.ai_concerns?.length ? (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-[var(--color-warning)]">
                        ملاحظات
                      </div>
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {p.ai_concerns.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {showAiConfidenceUi ? (
                    <div className="mt-3 flex justify-end">
                      <AIDisagreeButton proposalId={p.id} />
                    </div>
                  ) : null}
                </div>
              ) : Date.now() - new Date(p.created_at).getTime() <
                AI_PENDING_WINDOW_MS ? (
                showAiConfidenceUi ? (
                  <div className="mt-4">
                    <AIFallback reason="pending" />
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-[var(--color-stone-600)]">
                    جارٍ تقييم العرض من الذكاء الاصطناعي…
                  </p>
                )
              ) : showAiConfidenceUi ? (
                <div className="mt-4">
                  <AIFallback reason="service_error" />
                </div>
              ) : (
                <p className="mt-4 text-xs text-[var(--color-stone-600)]">
                  تقييم الذكاء الاصطناعي غير متاح لهذا العرض حالياً.
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={`/dashboard/rfqs/${id}/proposals/${p.id}`}
                  className="text-sm text-[var(--color-action-blue)]"
                >
                  عرض التفاصيل ←
                </Link>
                <div className="flex items-center gap-3">
                  <StatusPill status={p.status} kind="proposal" />
                  {p.status === 'submitted' || p.status === 'under_review' ? (
                    <ShortlistButton proposalId={p.id} rfqId={id} />
                  ) : p.status === 'shortlisted' ? (
                    <AwardButton proposalId={p.id} rfqId={id} />
                  ) : null}
                </div>
              </div>
            </li>
          ))}
          </ul>
        </>
      )}
    </div>
  );
}
