import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { UnderstandingForm } from './understanding-form';
import { SignButton } from './sign-button';

interface AgreementRow {
  id: string;
  rfq_id: string;
  client_id: string;
  client_understanding: string;
  supplier_understanding: string;
  client_submitted_at: string | null;
  supplier_submitted_at: string | null;
  client_approved_at: string | null;
  supplier_approved_at: string | null;
  ai_recommendation: string | null;
  ai_agreed_points: unknown;
  ai_disputed_points: unknown;
  ai_missing_points: unknown;
  status: string;
}

export default async function ClientAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rfqId } = await params;
  const { user } = await requireRole(['client']);
  const supabase = await createClient();

  const { data: rowRaw } = await supabase
    .from('agreements')
    .select(
      'id, rfq_id, client_id, client_understanding, supplier_understanding, client_submitted_at, supplier_submitted_at, client_approved_at, supplier_approved_at, ai_recommendation, ai_agreed_points, ai_disputed_points, ai_missing_points, status'
    )
    .eq('rfq_id', rfqId)
    .single();
  const ag = rowRaw as unknown as AgreementRow | null;
  if (!ag || ag.client_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { href: '/dashboard', label: 'لوحة التحكم' },
          { href: '/dashboard/rfqs', label: 'طلباتي' },
          { href: `/dashboard/rfqs/${rfqId}`, label: 'الطلب' },
          { label: 'اتفاق المشروع' },
        ]}
      />
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        اتفاق المشروع
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        كل طرف يكتب فهمه للمشروع بكلماته. يحلّل الذكاء الاصطناعي الفرق ويقترح تعديلات قبل التوقيع.
      </p>

      <section className="mt-8">
        <h2 className="text-base font-semibold">فهمك للمشروع</h2>
        <UnderstandingForm
          agreementId={ag.id}
          initial={ag.client_understanding}
          submitted={Boolean(ag.client_submitted_at)}
        />
      </section>

      {ag.supplier_understanding ? (
        <section className="mt-8">
          <h2 className="text-base font-semibold">فهم المورد</h2>
          <p className="mt-2 whitespace-pre-line rounded-xl bg-white p-4 text-sm">
            {ag.supplier_understanding}
          </p>
        </section>
      ) : (
        <p className="mt-8 text-sm text-[var(--color-stone-600)]">
          المورد لم يقدّم فهمه بعد. سننبهك عند تقديمه.
        </p>
      )}

      {ag.ai_recommendation ? (
        <section className="mt-8 rounded-2xl bg-[var(--color-stone-100)] p-5">
          <h2 className="text-base font-semibold">تحليل الذكاء الاصطناعي</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{ag.ai_recommendation}</p>
          <Bucket title="نقاط الاتفاق" items={ag.ai_agreed_points as string[] | null} variant="success" />
          <Bucket title="نقاط الاختلاف" items={ag.ai_disputed_points as Array<Record<string, string>> | null} variant="warning" />
          <Bucket title="نقاط ناقصة" items={ag.ai_missing_points as Array<Record<string, string>> | null} variant="info" />
        </section>
      ) : null}

      {ag.client_submitted_at && ag.supplier_submitted_at ? (
        <section className="mt-8 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <h2 className="text-base font-semibold">التوقيع</h2>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            بعد توقيع الطرفين تنتقل الحالة إلى الضمان (Escrow) ويُطلب الإيداع المبدئي.
          </p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--color-stone-100)] p-3">
              توقيع العميل: {ag.client_approved_at ? '✓ موقّع' : 'لم يوقّع بعد'}
            </div>
            <div className="rounded-xl bg-[var(--color-stone-100)] p-3">
              توقيع المورد: {ag.supplier_approved_at ? '✓ موقّع' : 'لم يوقّع بعد'}
            </div>
          </div>
          {!ag.client_approved_at ? (
            <div className="mt-4">
              <SignButton agreementId={ag.id} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Bucket({
  title,
  items,
  variant,
}: {
  title: string;
  items: unknown[] | null;
  variant: 'success' | 'warning' | 'info';
}) {
  if (!items || items.length === 0) return null;
  const tone =
    variant === 'success'
      ? 'text-[var(--color-success)]'
      : variant === 'warning'
      ? 'text-[var(--color-warning)]'
      : 'text-[var(--color-info)]';
  return (
    <div className="mt-4">
      <div className={`text-xs font-medium ${tone}`}>{title}</div>
      <ul className="mt-1 list-inside list-disc text-xs">
        {items.map((it, i) => (
          <li key={i}>
            {typeof it === 'string'
              ? it
              : (it as { topic?: string }).topic ?? JSON.stringify(it)}
          </li>
        ))}
      </ul>
    </div>
  );
}
