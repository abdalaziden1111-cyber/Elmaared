import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { PublishButton } from './publish-button';

interface RfqDetail {
  id: string;
  rfq_number: string;
  title: string;
  description: string | null;
  service_type: string;
  status: string;
  details: Record<string, unknown>;
  exhibition_city: string | null;
  exhibition_date: string | null;
  budget_min: number | null;
  budget_max: number | null;
  proposals_deadline: string | null;
  created_at: string;
  client_id: string;
}

export default async function ClientRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole(['client']);
  const supabase = await createClient();

  const { data: rowRaw } = await supabase
    .from('rfqs')
    .select(
      'id, rfq_number, title, description, service_type, status, details, exhibition_city, exhibition_date, budget_min, budget_max, proposals_deadline, created_at, client_id'
    )
    .eq('id', id)
    .single();
  const rfq = rowRaw as unknown as RfqDetail | null;
  if (!rfq) notFound();
  if (rfq.client_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-xs text-[var(--color-stone-600)] num">{rfq.rfq_number}</div>
      <h1 className="mt-1 text-2xl font-semibold text-[var(--color-midnight-green)]">
        {rfq.title}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="نوع الخدمة" value={rfq.service_type} />
        <Field label="الحالة" value={rfq.status} />
        {rfq.exhibition_city ? <Field label="المدينة" value={rfq.exhibition_city} /> : null}
        {rfq.exhibition_date ? (
          <Field label="تاريخ المعرض" value={formatDate(rfq.exhibition_date)} />
        ) : null}
        {rfq.budget_min || rfq.budget_max ? (
          <Field
            label="الميزانية"
            value={`${rfq.budget_min ? formatCurrency(rfq.budget_min) : '?'} – ${rfq.budget_max ? formatCurrency(rfq.budget_max) : '?'}`}
          />
        ) : null}
        {rfq.proposals_deadline ? (
          <Field label="آخر موعد للعروض" value={formatDate(rfq.proposals_deadline)} />
        ) : null}
      </div>

      {rfq.description ? (
        <section className="mt-8">
          <h2 className="text-base font-semibold">الوصف</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
            {rfq.description}
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-base font-semibold">تفاصيل الخدمة</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(rfq.details).map(([k, v]) => (
            <li key={k} className="flex justify-between rounded-lg bg-white p-3">
              <span className="text-[var(--color-stone-600)]">{k}</span>
              <span className="font-medium">{String(v)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        {rfq.status === 'draft' ? <PublishButton rfqId={rfq.id} /> : <span />}
        {rfq.status !== 'draft' ? (
          <a
            href={`/dashboard/rfqs/${rfq.id}/compare`}
            className="text-sm font-medium text-[var(--color-action-blue)]"
          >
            عرض ومقارنة العروض ←
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
