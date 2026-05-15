import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface ProposalDetail {
  id: string;
  rfq_id: string;
  total_price: number;
  delivery_days: number;
  description: string | null;
  scope_of_work: string | null;
  excluded_items: string | null;
  payment_terms: string | null;
  validity_days: number | null;
  status: string;
  created_at: string;
  ai_score: number | null;
  ai_summary: string | null;
  ai_strengths: string[] | null;
  ai_concerns: string[] | null;
  supplier: {
    id: string;
    company_name: string;
    average_rating: number | null;
    total_completed_orders: number | null;
  } | null;
}

export default async function ClientProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string; proposalId: string }>;
}) {
  const { id: rfqId, proposalId } = await params;
  const { user } = await requireRole(['client']);

  // Workaround for recursive RLS on rfqs ↔ proposals: read via admin and
  // enforce ownership manually through the RFQ.client_id check.
  const admin = createAdminClient();

  const { data: rfqRowRaw } = await admin
    .from('rfqs')
    .select('id, client_id')
    .eq('id', rfqId)
    .is('deleted_at', null)
    .single();
  const rfq = rfqRowRaw as { id: string; client_id: string } | null;
  if (!rfq || rfq.client_id !== user.id) notFound();

  const { data: rowRaw } = await admin
    .from('proposals')
    .select(
      `id, rfq_id, total_price, delivery_days, description, scope_of_work, excluded_items, payment_terms, validity_days, status, created_at, ai_score, ai_summary, ai_strengths, ai_concerns,
       supplier:suppliers (id, company_name, average_rating, total_completed_orders)`
    )
    .eq('id', proposalId)
    .single();
  const p = rowRaw as unknown as ProposalDetail | null;
  if (!p || p.rfq_id !== rfqId) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        {p.supplier?.company_name ?? 'مورد'}
      </h1>
      <div className="mt-1 text-sm text-[var(--color-stone-600)]">
        قُدّم في {formatDate(p.created_at)}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Stat label="السعر" value={formatCurrency(p.total_price)} />
        <Stat label="مدة التسليم" value={`${p.delivery_days} يوم`} />
        {p.validity_days ? (
          <Stat label="صلاحية العرض" value={`${p.validity_days} يوم`} />
        ) : null}
        {p.ai_score != null ? <Stat label="تقييم الذكاء" value={`${p.ai_score}/100`} /> : null}
      </div>

      {p.description ? (
        <Section title="وصف العرض">{p.description}</Section>
      ) : null}
      {p.scope_of_work ? (
        <Section title="نطاق العمل">{p.scope_of_work}</Section>
      ) : null}
      {p.excluded_items ? (
        <Section title="ما لا يشمله العرض">{p.excluded_items}</Section>
      ) : null}
      {p.payment_terms ? (
        <Section title="شروط الدفع">{p.payment_terms}</Section>
      ) : null}

      {p.ai_summary ? (
        <Section title="ملخص الذكاء الاصطناعي">{p.ai_summary}</Section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium num">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm">{children}</p>
    </section>
  );
}
