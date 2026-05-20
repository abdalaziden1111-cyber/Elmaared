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
  ai_risky_clauses: unknown;
  status: string;
}

interface RiskyClause {
  clause: string;
  deviation: string;
  severity: 'high' | 'medium' | 'low';
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
      'id, rfq_id, client_id, client_understanding, supplier_understanding, client_submitted_at, supplier_submitted_at, client_approved_at, supplier_approved_at, ai_recommendation, ai_agreed_points, ai_disputed_points, ai_missing_points, ai_risky_clauses, status'
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

      {/* Phase W4.3 — surface a quick-glance badge when AI flagged risky
          clauses, so users don't miss the panel inside the AI section. */}
      {Array.isArray(ag.ai_risky_clauses) &&
      (ag.ai_risky_clauses as unknown[]).length > 0 ? (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-[var(--color-warning,#B45309)] bg-[var(--color-warning-50,#FFFBEB)] px-3 py-2 text-sm text-[var(--color-warning,#B45309)]">
          <span aria-hidden>⚠</span>
          <span>
            تحليل قانوني متاح —{' '}
            <strong className="font-semibold">
              {(ag.ai_risky_clauses as unknown[]).length} بنود تحتاج مراجعة
            </strong>
            . تحقّق منها أسفل قسم تحليل AI قبل التوقيع.
          </span>
        </div>
      ) : null}

      {ag.ai_recommendation ? (
        <section className="mt-8 rounded-2xl bg-[var(--color-stone-100)] p-5">
          <h2 className="text-base font-semibold">تحليل الذكاء الاصطناعي</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{ag.ai_recommendation}</p>
          <Bucket title="نقاط الاتفاق" items={ag.ai_agreed_points as string[] | null} variant="success" />
          <Bucket title="نقاط الاختلاف" items={ag.ai_disputed_points as Array<Record<string, string>> | null} variant="warning" />
          <Bucket title="نقاط ناقصة" items={ag.ai_missing_points as Array<Record<string, string>> | null} variant="info" />
          <RiskyClauses clauses={ag.ai_risky_clauses as RiskyClause[] | null} />
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

// V1.2 — Saudi commercial-law deviations flagged by AI. Severity drives
// the chip color: high = error red, medium = warning amber, low = info blue.
function RiskyClauses({ clauses }: { clauses: RiskyClause[] | null }) {
  if (!clauses || clauses.length === 0) return null;
  const severityTone: Record<RiskyClause['severity'], string> = {
    high: 'bg-[var(--color-error-50,#FEF2F2)] text-[var(--color-error,#B91C1C)] border-[var(--color-error,#B91C1C)]',
    medium: 'bg-[var(--color-warning-50,#FFFBEB)] text-[var(--color-warning,#B45309)] border-[var(--color-warning,#B45309)]',
    low: 'bg-[var(--color-info-50,#EFF6FF)] text-[var(--color-info,#1D4ED8)] border-[var(--color-info,#1D4ED8)]',
  };
  const severityLabel: Record<RiskyClause['severity'], string> = {
    high: 'مخاطرة عالية',
    medium: 'مخاطرة متوسطة',
    low: 'مخاطرة منخفضة',
  };
  return (
    <div
      className="mt-5 rounded-xl border border-dashed border-[var(--color-stone-300)] bg-white p-4"
      data-component="risky-clauses"
    >
      <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
        بنود قد تنحرف عن السوق السعودي
      </h3>
      <p className="mt-1 text-xs text-[var(--color-stone-600)]">
        مقارنة بالمعتاد التجاري السعودي — راجع كل بند مع طرفك قبل التوقيع.
      </p>
      <ul className="mt-3 space-y-2">
        {clauses.map((c, i) => (
          <li
            key={i}
            className={`rounded-lg border px-3 py-2 ${severityTone[c.severity]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold">{c.clause}</p>
              <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium">
                {severityLabel[c.severity]}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed">{c.deviation}</p>
          </li>
        ))}
      </ul>
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
