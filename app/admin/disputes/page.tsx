import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { timeAgo } from '@/lib/utils/format';
import { Pagination } from '@/components/ui/pagination';
import { RealtimeDisputes } from './realtime-disputes';

interface DisputeRow {
  id: string;
  rfq_id: string;
  category: string;
  description: string;
  status: string;
  raised_by_role: string;
  resolution_in_favor_of: string | null;
  created_at: string;
  resolved_at: string | null;
  rfqs: { rfq_number: string; title: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'مفتوح',
  under_review: 'قيد المراجعة',
  resolved: 'محلول',
  closed: 'مُغلق',
};

const STATUS_TONE: Record<string, string> = {
  open: 'border-[var(--color-danger)] bg-[var(--color-danger-100)]/40',
  under_review:
    'border-[var(--color-warning)] bg-[var(--color-warning-100)]/40',
  resolved:
    'border-[var(--color-success)] bg-[var(--color-success-100)]/30',
  closed: 'border-[var(--color-stone-300)] bg-[var(--color-stone-100)]',
};

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

const PAGE_SIZE = 20;

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const tab = (params.tab ?? 'open').trim();

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countBase: any = admin
    .from('disputes')
    .select('id', { count: 'exact', head: true });
  const countQuery =
    tab === 'open'
      ? countBase.eq('status', 'open')
      : tab === 'resolved'
        ? countBase.eq('status', 'resolved')
        : countBase;
  const { count } = await countQuery;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowsBase: any = admin
    .from('disputes')
    .select(
      'id, rfq_id, category, description, status, raised_by_role, resolution_in_favor_of, created_at, resolved_at, rfqs(rfq_number, title)'
    );
  const rowsFiltered =
    tab === 'open'
      ? rowsBase.eq('status', 'open')
      : tab === 'resolved'
        ? rowsBase.eq('status', 'resolved')
        : rowsBase;
  const { data: rowsRaw } = await rowsFiltered
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  const rows = (rowsRaw ?? []) as unknown as DisputeRow[];

  function tabHref(t: string): string {
    return t === 'open' ? '?' : `?tab=${t}`;
  }
  const tabBtn = (val: string, label: string) => (
    <Link
      key={val}
      href={tabHref(val)}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${
        tab === val
          ? 'bg-[var(--color-danger)] text-white'
          : 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)] hover:bg-[var(--color-stone-300)]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <RealtimeDisputes />
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        النزاعات
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        النزاعات الرسمية المرفوعة على الطلبات. للتصعيد العاجل داخل المحادثة شاهد{' '}
        <Link
          href="/admin/chats?filter=panic"
          className="text-[var(--color-action-blue)] hover:underline"
        >
          محادثات التصعيد
        </Link>
        .
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabBtn('open', 'مفتوحة')}
        {tabBtn('resolved', 'محلولة')}
        {tabBtn('all', 'الكل')}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            {tab === 'open'
              ? 'لا توجد نزاعات مفتوحة. الوضع هادئ.'
              : 'لا توجد نزاعات في هذا التصنيف.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/admin/disputes/${d.id}`}
                  className={`block rounded-2xl border p-5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${STATUS_TONE[d.status] ?? 'border-[var(--color-stone-300)] bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium">
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                        <span className="text-xs text-[var(--color-stone-600)] num">
                          {d.rfqs?.rfq_number ?? '—'}
                        </span>
                      </div>
                      <h2 className="mt-1 truncate text-sm font-semibold">
                        {d.rfqs?.title ?? '—'}
                      </h2>
                      <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                        رفعه {d.raised_by_role === 'client' ? 'العميل' : 'المورد'} · الفئة:{' '}
                        {d.category}
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-charcoal)]">
                        {truncate(d.description, 200)}
                      </p>
                      {d.resolution_in_favor_of ? (
                        <p className="mt-2 text-xs text-[var(--color-success)]">
                          القرار:{' '}
                          {d.resolution_in_favor_of === 'client'
                            ? 'لصالح العميل'
                            : d.resolution_in_favor_of === 'supplier'
                              ? 'لصالح المورد'
                              : 'مُشترك'}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-end text-xs text-[var(--color-stone-600)]">
                      <div>رُفع {timeAgo(d.created_at)}</div>
                      {d.resolved_at ? (
                        <div className="mt-1 text-[var(--color-success)]">
                          حُسم {timeAgo(d.resolved_at)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
          />
        </>
      )}
    </div>
  );
}
