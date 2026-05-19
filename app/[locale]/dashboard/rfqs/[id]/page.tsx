import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import {
  RFQ_STATUS_LABEL as STATUS_LABEL,
  SERVICE_LABEL,
  CITY_LABEL,
  RFQ_FIELD_LABEL as FIELD_LABEL,
  formatRfqDetailValue,
} from '@/lib/constants/labels';
import { flags } from '@/lib/feature-flags';
import { PublishButton } from './publish-button';
import { ReviewForm } from './review-form';
import { OpenDisputeForm } from '@/components/dispute/open-dispute-form';

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


// RFQ statuses where the client can still raise a dispute. Pre-award and
// terminal statuses don't allow dispute creation.
const DISPUTABLE_STATUSES = new Set([
  'in_escrow',
  'in_progress',
  'delivered',
  'completed',
]);

// RFQ statuses where an award has been made — show the post-award summary
// card with links to escrow, chat, and the awarded supplier.
const AWARDED_STATUSES = new Set([
  'awarded',
  'in_escrow',
  'in_progress',
  'delivered',
  'completed',
  'disputed',
]);

export default async function ClientRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole(['client']);

  // Workaround for the recursive RLS policy on rfqs (see comment on the
  // list page): we read via admin and enforce ownership manually.
  const admin = createAdminClient();
  const { data: rowRaw } = await admin
    .from('rfqs')
    .select(
      'id, rfq_number, title, description, service_type, status, details, exhibition_city, exhibition_date, budget_min, budget_max, proposals_deadline, created_at, client_id'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  const rfq = rowRaw as unknown as RfqDetail | null;
  if (!rfq) notFound();
  if (rfq.client_id !== user.id) notFound();

  // Show the review form only when (a) status=completed, and (b) the
  // client hasn't already submitted a review for this RFQ.
  let alreadyReviewed = false;
  if (rfq.status === 'completed') {
    const { count } = await admin
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('rfq_id', rfq.id)
      .eq('client_id', user.id);
    alreadyReviewed = (count ?? 0) > 0;
  }

  // Post-award summary: awarded supplier + final price + chat thread.
  let awardedInfo: {
    supplierId: string;
    supplierName: string;
    totalPrice: number;
    chatId: string | null;
  } | null = null;
  if (AWARDED_STATUSES.has(rfq.status)) {
    const { data: propRaw } = await admin
      .from('proposals')
      .select(
        'id, total_price, supplier:suppliers (id, company_name)'
      )
      .eq('rfq_id', rfq.id)
      .eq('status', 'accepted')
      .maybeSingle();
    const prop = propRaw as unknown as
      | {
          id: string;
          total_price: number;
          supplier: { id: string; company_name: string } | null;
        }
      | null;
    if (prop?.supplier) {
      const { data: chatRaw } = await admin
        .from('chats')
        .select('id')
        .eq('rfq_id', rfq.id)
        .eq('supplier_id', prop.supplier.id)
        .maybeSingle();
      awardedInfo = {
        supplierId: prop.supplier.id,
        supplierName: prop.supplier.company_name,
        totalPrice: prop.total_price,
        chatId: (chatRaw as { id: string } | null)?.id ?? null,
      };
    }
  }

  // Dispute is allowed at any post-award state except terminal ones.
  const canRaiseDispute = DISPUTABLE_STATUSES.has(rfq.status);
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
          {STATUS_LABEL[rfq.status] ?? rfq.status}
        </span>
      </div>

      {awardedInfo ? (
        <aside className="mt-6 rounded-2xl border border-[var(--color-success-100)] bg-[var(--color-success-100)]/40 p-5">
          <p className="text-xs font-medium text-[var(--color-success)]">المورد المختار</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <Link
              href={`/discover/${awardedInfo.supplierId}`}
              className="text-lg font-semibold text-[var(--color-midnight-green)] hover:underline"
            >
              {awardedInfo.supplierName}
            </Link>
            <span className="text-base font-semibold text-[var(--color-midnight-green)] num">
              {formatCurrency(awardedInfo.totalPrice)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link
              href={`/dashboard/rfqs/${rfq.id}/escrow`}
              className="font-medium text-[var(--color-action-blue)] hover:underline"
            >
              الضمان ←
            </Link>
            <Link
              href={`/dashboard/rfqs/${rfq.id}/agreement`}
              className="font-medium text-[var(--color-action-blue)] hover:underline"
            >
              الاتفاقية ←
            </Link>
            {/* Phase U5 — new project execution + day-of pages live for
                any RFQ that has progressed past 'awarded'. */}
            <Link
              href={`/dashboard/rfqs/${rfq.id}/project`}
              className="font-medium text-[var(--color-action-blue)] hover:underline"
            >
              تنفيذ المشروع ←
            </Link>
            <Link
              href={`/dashboard/rfqs/${rfq.id}/event-day`}
              className="font-medium text-[var(--color-action-blue)] hover:underline"
            >
              يوم الحدث ←
            </Link>
            {awardedInfo.chatId ? (
              <Link
                href={`/dashboard/rfqs/${rfq.id}/chats/${awardedInfo.chatId}`}
                className="font-medium text-[var(--color-action-blue)] hover:underline"
              >
                المحادثة مع المورد ←
              </Link>
            ) : null}
          </div>
        </aside>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
              <span className="text-[var(--color-stone-600)]">{FIELD_LABEL[k] ?? k}</span>
              <span className="font-medium">{formatRfqDetailValue(k, v, formatDate)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Concierge MVP — Sprint 5 S5.3. Replaces the implicit "wait for
          suppliers" silence right after publishing an RFQ with a clear
          24-hour Customer Success commitment. Flag-gated; off by default. */}
      {flags.CONCIERGE_MODE && rfq.status === 'open' ? (
        <section
          className="mt-8 rounded-2xl border border-[var(--color-action-blue)]/30 bg-[var(--color-action-blue)]/5 p-5"
          data-component="concierge-rfq-success"
        >
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            خلال ٢٤ ساعة سيتواصل معك مدير حسابك
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-charcoal)]">
            وصل طلبك. خلال السنة الأولى من Elmaared، فريق Customer Success
            يتفاوض نيابة عنك مع موردين موثوقين خارج المنصة ثم يعرض عليك
            عروضاً مُختارة يدوياً. مدير حسابك سيراسلك على WhatsApp + Email
            خلال ٢٤ ساعة.
          </p>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        {rfq.status === 'draft' ? <PublishButton rfqId={rfq.id} /> : <span />}
        {rfq.status !== 'draft' ? (
          <a
            href={`/dashboard/rfqs/${rfq.id}/compare`}
            className="text-sm font-medium text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            عرض ومقارنة العروض ←
          </a>
        ) : null}
      </div>

      {rfq.status === 'completed' && !alreadyReviewed ? (
        <section className="mt-10 rounded-2xl border border-[var(--color-dune-gold)] bg-[var(--color-dune-gold)]/5 p-5">
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            قيّم المورد
          </h2>
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">
            مشروعك اكتمل. تقييمك يساعد عملاء آخرين على اختيار الموردين المناسبين.
          </p>
          <div className="mt-4">
            <ReviewForm rfqId={rfq.id} />
          </div>
        </section>
      ) : null}

      {rfq.status === 'completed' && alreadyReviewed ? (
        <section className="mt-10 rounded-2xl border border-[var(--color-success)] bg-[var(--color-success-100)]/30 p-5 text-sm">
          <p className="font-medium text-[var(--color-success)]">
            ✓ شكراً، تم تسجيل تقييمك لهذا المشروع.
          </p>
        </section>
      ) : null}

      {canRaiseDispute ? (
        <section className="mt-6">
          <OpenDisputeForm rfqId={rfq.id} raiserRole="client" />
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
