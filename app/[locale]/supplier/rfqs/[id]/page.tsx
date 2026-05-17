import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import {
  RFQ_STATUS_LABEL,
  SERVICE_LABEL,
  CITY_LABEL,
  RFQ_FIELD_LABEL,
  formatRfqDetailValue,
} from '@/lib/constants/labels';
import { SubmitDeliveryForm } from './submit-delivery-form';
import { OpenDisputeForm } from '@/components/dispute/open-dispute-form';

// Supplier can raise a dispute once they're locked into the project (awarded
// onwards) — pre-award they can just walk away. Terminal statuses block.
const DISPUTABLE_STATUSES = new Set([
  'in_escrow',
  'in_progress',
  'delivered',
  'completed',
]);

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
  winning_proposal_id: string | null;
}

export default async function SupplierRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole(['supplier']);

  // Workaround for the recursive RLS pair (rfqs ↔ proposals via
  // selected_supplier_view_rfq). Read via admin and re-enforce the
  // visibility rule manually: the supplier may see this RFQ only if
  // (a) it's an open RFQ matching their specializations, OR
  // (b) they own a proposal on it (any status).
  const admin = createAdminClient();

  const { data: supRaw } = await admin
    .from('suppliers')
    .select('id, status, specializations')
    .eq('owner_id', user.id)
    .single();
  const supplierRow = supRaw as
    | { id: string; status: string; specializations: string[] | null }
    | null;
  if (!supplierRow || supplierRow.status !== 'approved') notFound();

  const { data: rowRaw } = await admin
    .from('rfqs')
    .select(
      'id, rfq_number, title, description, service_type, status, details, exhibition_city, exhibition_date, budget_min, budget_max, proposals_deadline, winning_proposal_id'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  const rfq = rowRaw as unknown as RfqDetail | null;
  if (!rfq) notFound();

  // Visibility check
  const matchesSpecialization =
    Array.isArray(supplierRow.specializations) &&
    supplierRow.specializations.includes(rfq.service_type);
  const isOpenAndMatching = rfq.status === 'open' && matchesSpecialization;

  let isWinningSupplier = false;
  let hasOwnProposal = false;
  if (rfq.winning_proposal_id) {
    const { data: winRaw } = await admin
      .from('proposals')
      .select('supplier_id')
      .eq('id', rfq.winning_proposal_id)
      .maybeSingle();
    const winningProposal = winRaw as { supplier_id: string } | null;
    if (winningProposal) {
      isWinningSupplier = winningProposal.supplier_id === supplierRow.id;
    }
  }
  if (!isWinningSupplier) {
    const { data: ownPropRaw } = await admin
      .from('proposals')
      .select('id')
      .eq('rfq_id', rfq.id)
      .eq('supplier_id', supplierRow.id)
      .maybeSingle();
    hasOwnProposal = ownPropRaw != null;
  }
  if (!isOpenAndMatching && !isWinningSupplier && !hasOwnProposal) notFound();

  const canSubmitDelivery = isWinningSupplier && rfq.status === 'in_progress';
  const isAlreadyDelivered =
    isWinningSupplier &&
    (rfq.status === 'delivered' ||
      rfq.status === 'completed');
  const canSubmitProposal =
    rfq.status === 'open' && !isWinningSupplier && !hasOwnProposal;
  const canRaiseDispute = isWinningSupplier && DISPUTABLE_STATUSES.has(rfq.status);
  const isDisputed = rfq.status === 'disputed';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-stone-600)] num">{rfq.rfq_number}</div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--color-midnight-green)]">
            {rfq.title}
          </h1>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
          {RFQ_STATUS_LABEL[rfq.status] ?? rfq.status}
        </span>
      </div>

      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <Field label="نوع الخدمة" value={SERVICE_LABEL[rfq.service_type] ?? rfq.service_type} />
        {rfq.exhibition_city ? (
          <Field label="المدينة" value={CITY_LABEL[rfq.exhibition_city] ?? rfq.exhibition_city} />
        ) : null}
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
        <section className="mt-6">
          <h2 className="text-base font-semibold">الوصف</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{rfq.description}</p>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-base font-semibold">تفاصيل الخدمة</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(rfq.details).map(([k, v]) => (
            <li key={k} className="flex justify-between rounded-lg bg-white p-3">
              <span className="text-[var(--color-stone-600)]">{RFQ_FIELD_LABEL[k] ?? k}</span>
              <span className="font-medium">{formatRfqDetailValue(k, v, formatDate)}</span>
            </li>
          ))}
        </ul>
      </section>

      {canSubmitDelivery ? (
        <section className="mt-8 rounded-2xl border border-[var(--color-action-blue)] bg-[var(--color-action-blue)]/5 p-5">
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            إعلان التسليم
          </h2>
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">
            أعلن التسليم عند انتهاء التنفيذ. العميل سيراجع الصور ويعتمد التسليم.
          </p>
          <div className="mt-4">
            <SubmitDeliveryForm rfqId={rfq.id} />
          </div>
        </section>
      ) : null}

      {isAlreadyDelivered ? (
        <section className="mt-8 rounded-2xl border border-[var(--color-success)] bg-[var(--color-success-100)]/30 p-5 text-sm">
          <p className="font-medium text-[var(--color-success)]">
            ✓ تم تسجيل التسليم.{' '}
            {rfq.status === 'completed'
              ? 'العميل اعتمد التسليم وتم تحرير الدفعة.'
              : 'بانتظار اعتماد العميل للتسليم.'}
          </p>
        </section>
      ) : null}

      {canSubmitProposal ? (
        <div className="mt-8 flex justify-end">
          <a
            href={`/supplier/rfqs/${rfq.id}/proposal`}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            قدّم عرضك ←
          </a>
        </div>
      ) : null}

      {hasOwnProposal && !isWinningSupplier ? (
        <section className="mt-8 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 text-sm">
          <p className="font-medium text-[var(--color-midnight-green)]">
            ✓ قدّمت عرضاً على هذا الطلب
          </p>
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">
            تابع حالته من{' '}
            <a
              href="/ar/supplier/proposals"
              className="text-[var(--color-action-blue)] hover:underline"
            >
              صفحة عروضي
            </a>
            .
          </p>
        </section>
      ) : null}

      {canRaiseDispute ? (
        <section className="mt-8">
          <OpenDisputeForm rfqId={rfq.id} raiserRole="supplier" />
        </section>
      ) : null}

      {isDisputed ? (
        <section className="mt-6 rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-100)]/30 p-5 text-sm">
          <p className="font-medium text-[var(--color-danger)]">
            🚨 هذا الطلب تحت مراجعة Admin بسبب نزاع مرفوع.
          </p>
        </section>
      ) : null}
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
