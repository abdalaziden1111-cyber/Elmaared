import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, timeAgo } from '@/lib/utils/format';
import { ResolveDisputeForm } from './resolve-dispute-form';

interface DisputeDetail {
  id: string;
  rfq_id: string;
  raised_by: string;
  raised_by_role: string;
  category: string;
  description: string;
  evidence_urls: string[] | null;
  status: string;
  resolution: string | null;
  resolution_in_favor_of: string | null;
  refund_decision: number | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  rfqs: { rfq_number: string; title: string; status: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'مفتوح',
  under_review: 'قيد المراجعة',
  resolved: 'محلول',
  closed: 'مُغلق',
};

const FAVOR_LABEL: Record<string, string> = {
  client: 'لصالح العميل',
  supplier: 'لصالح المورد',
  shared: 'مُشترك',
};

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: disputeRaw } = await admin
    .from('disputes')
    .select(
      'id, rfq_id, raised_by, raised_by_role, category, description, evidence_urls, status, resolution, resolution_in_favor_of, refund_decision, resolved_at, resolved_by, created_at, rfqs(rfq_number, title, status)'
    )
    .eq('id', id)
    .maybeSingle();
  const dispute = disputeRaw as DisputeDetail | null;
  if (!dispute) notFound();

  const evidence = Array.isArray(dispute.evidence_urls) ? dispute.evidence_urls : [];
  const isOpen = dispute.status === 'open';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-stone-600)] num">
            {dispute.rfqs?.rfq_number ?? '—'}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--color-midnight-green)]">
            نزاع: {dispute.rfqs?.title ?? '—'}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            رفعه {dispute.raised_by_role === 'client' ? 'العميل' : 'المورد'} ·{' '}
            {timeAgo(dispute.created_at)}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
          {STATUS_LABEL[dispute.status] ?? dispute.status}
        </span>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          تفاصيل النزاع
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--color-stone-600)]">الفئة</dt>
            <dd className="mt-1 text-sm font-medium">{dispute.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-stone-600)]">رُفع في</dt>
            <dd className="mt-1 text-sm">{formatDate(dispute.created_at)}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <p className="text-xs text-[var(--color-stone-600)]">الوصف</p>
          <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
            {dispute.description}
          </p>
        </div>
        {evidence.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs text-[var(--color-stone-600)]">الأدلة المرفقة</p>
            <ul className="mt-2 grid gap-1.5">
              {evidence.map((url, i) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                  >
                    الدليل #{i + 1} ←
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {dispute.status === 'resolved' && dispute.resolution ? (
        <section className="mt-4 rounded-2xl border border-[var(--color-success)] bg-[var(--color-success-100)]/30 p-5">
          <h2 className="text-base font-semibold text-[var(--color-success)]">
            القرار
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--color-stone-600)]">لصالح</p>
              <p className="mt-1 text-sm font-medium">
                {FAVOR_LABEL[dispute.resolution_in_favor_of ?? ''] ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-stone-600)]">مبلغ الاسترداد</p>
              <p className="mt-1 num text-sm font-medium">
                {dispute.refund_decision != null
                  ? `${dispute.refund_decision.toLocaleString('en')} ﷼`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-stone-600)]">حُسم في</p>
              <p className="mt-1 text-sm">
                {dispute.resolved_at ? formatDate(dispute.resolved_at) : '—'}
              </p>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
            {dispute.resolution}
          </p>
        </section>
      ) : null}

      {isOpen ? (
        <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            حسم النزاع
          </h2>
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">
            القرار يُسجَّل في الـ audit log ويغيّر حالة الطلب وفقاً لاختيارك.
          </p>
          <ResolveDisputeForm disputeId={dispute.id} />
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/admin/rfqs/${dispute.rfq_id}`}
          className="text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          → افتح الطلب
        </Link>
        <Link
          href="/admin/disputes"
          className="text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          ← العودة للنزاعات
        </Link>
      </div>
    </div>
  );
}
