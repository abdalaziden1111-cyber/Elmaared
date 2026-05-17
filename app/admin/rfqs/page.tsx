import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateShort, timeAgo } from '@/lib/utils/format';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusFilter } from '@/components/ui/status-filter';
import { Pagination } from '@/components/ui/pagination';

interface AdminRfqRow {
  id: string;
  rfq_number: string;
  title: string;
  service_type: string;
  status: string;
  created_at: string;
  proposals_deadline: string | null;
  exhibition_city: string | null;
  companies: { name: string | null; legal_name: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة',
  open: 'مفتوح',
  negotiating: 'قيد التفاوض',
  awarded: 'تم الاختيار',
  in_escrow: 'قيد الضمان',
  in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  completed: 'مكتمل',
  disputed: 'نزاع',
  cancelled: 'ملغى',
};

const SERVICE_LABEL: Record<string, string> = {
  booth: 'بوث',
  gifts: 'هدايا',
  event: 'فعالية',
  printing: 'طباعة',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  open: 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]',
  negotiating: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
  awarded: 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]',
  in_escrow: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
  in_progress: 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]',
  delivered: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  completed: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  disputed: 'bg-[var(--color-danger-100)] text-[var(--color-danger)]',
  cancelled: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
};

const PAGE_SIZE = 20;

export default async function AdminRfqsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const q = (params.q ?? '').trim();
  const status = (params.status ?? '').trim();

  const admin = createAdminClient();

  let countQ = admin
    .from('rfqs')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (q) countQ = countQ.ilike('title', `%${q}%`);
  if (status) countQ = countQ.eq('status', status);
  const { count } = await countQ;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  let rowsQ = admin
    .from('rfqs')
    .select(
      'id, rfq_number, title, service_type, status, created_at, proposals_deadline, exhibition_city, companies(name, legal_name)'
    )
    .is('deleted_at', null);
  if (q) rowsQ = rowsQ.ilike('title', `%${q}%`);
  if (status) rowsQ = rowsQ.eq('status', status);
  const { data: rowsRaw } = await rowsQ
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  const rows = (rowsRaw ?? []) as unknown as AdminRfqRow[];
  const hasFilters = Boolean(q || status);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        كل الطلبات
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        كل طلبات RFQ على المنصة، من الأحدث للأقدم.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="min-w-64 flex-1">
          <SearchBar placeholder="ابحث بعنوان الطلب…" />
        </div>
        <StatusFilter
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            {hasFilters
              ? 'ما فيش نتائج تطابق الفلتر.'
              : 'لا توجد طلبات بعد.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((r) => (
              <li key={r.id}>
                <a
                  href={`/admin/rfqs/${r.id}`}
                  className="block rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-[var(--color-stone-600)] num">
                        {r.rfq_number}
                      </div>
                      <h2 className="mt-0.5 text-base font-semibold">{r.title}</h2>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-stone-600)]">
                        <span>
                          العميل: {r.companies?.name ?? r.companies?.legal_name ?? '—'}
                        </span>
                        <span>· {SERVICE_LABEL[r.service_type] ?? r.service_type}</span>
                        {r.exhibition_city ? <span>· {r.exhibition_city}</span> : null}
                        <span>· أُنشئ {timeAgo(r.created_at)}</span>
                        {r.proposals_deadline ? (
                          <span>· آخر موعد {formatDateShort(r.proposals_deadline)}</span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs ${STATUS_TONE[r.status] ?? 'bg-[var(--color-stone-100)]'}`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                </a>
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
