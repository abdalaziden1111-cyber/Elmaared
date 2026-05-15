import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils/format';
import { ShortlistButton } from './shortlist-button';
import { AwardButton } from './award-button';

interface ProposalRow {
  id: string;
  total_price: number;
  delivery_days: number;
  description: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_strengths: string[] | null;
  ai_concerns: string[] | null;
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

  const { data: rfqRowRaw } = await admin
    .from('rfqs')
    .select('id, rfq_number, title, client_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  const rfq = rfqRowRaw as
    | { id: string; rfq_number: string; title: string; client_id: string }
    | null;
  if (!rfq || rfq.client_id !== user.id) notFound();

  const { data: proposalsRaw } = await admin
    .from('proposals')
    .select(
      `id, total_price, delivery_days, description, ai_score, ai_summary, ai_strengths, ai_concerns, status, created_at,
       supplier:suppliers (id, company_name, average_rating, total_completed_orders)`
    )
    .eq('rfq_id', id)
    .order('ai_score', { ascending: false, nullsFirst: false });

  const proposals = (proposalsRaw ?? []) as unknown as ProposalRow[];

  return (
    <div>
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
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-[var(--color-midnight-green)]">
                      تقييم الذكاء الاصطناعي
                    </span>
                    <span className="num text-lg font-semibold">
                      {p.ai_score}/100
                    </span>
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
                </div>
              ) : (
                <p className="mt-4 text-xs text-[var(--color-stone-600)]">
                  جارٍ تقييم العرض من الذكاء الاصطناعي…
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
                  <span className="text-xs text-[var(--color-stone-600)]">{p.status}</span>
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
      )}
    </div>
  );
}
