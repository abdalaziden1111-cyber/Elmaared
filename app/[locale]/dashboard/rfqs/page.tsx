import { Link } from '@/lib/i18n/routing';
import { Plus } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateShort } from '@/lib/utils/format';
import { RFQ_STATUS_LABEL as STATUS_LABEL } from '@/lib/constants/labels';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusFilter } from '@/components/ui/status-filter';
import { Pagination } from '@/components/ui/pagination';

interface RfqRow {
  id: string;
  rfq_number: string;
  title: string;
  service_type: string;
  status: string;
  created_at: string;
  proposals_deadline: string | null;
}

const PAGE_SIZE = 20;

export default async function ClientRfqsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { user } = await requireRole(['client']);
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const q = (params.q ?? '').trim();
  const status = (params.status ?? '').trim();

  // Workaround: a recursive RLS policy on `rfqs` (selected_supplier_view_rfq
  // ↔ proposals.client_view_proposals_for_own_rfq) errors with
  // "infinite recursion detected in policy for relation rfqs" on the
  // user-scoped client. We use the admin client and enforce the same
  // ownership scoping (`client_id = user.id`) explicitly. requireRole
  // already guarantees the user is a client.
  const admin = createAdminClient();

  let countQ = admin
    .from('rfqs')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .is('deleted_at', null);
  if (q) countQ = countQ.ilike('title', `%${q}%`);
  if (status) countQ = countQ.eq('status', status);
  const { count } = await countQ;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  let rowsQ = admin
    .from('rfqs')
    .select('id, rfq_number, title, service_type, status, created_at, proposals_deadline')
    .eq('client_id', user.id)
    .is('deleted_at', null);
  if (q) rowsQ = rowsQ.ilike('title', `%${q}%`);
  if (status) rowsQ = rowsQ.eq('status', status);
  const { data: rowsRaw } = await rowsQ
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  const rows = (rowsRaw ?? []) as unknown as RfqRow[];
  const hasFilters = Boolean(q || status);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">طلباتي</h1>
        <Link
          href="/dashboard/rfqs/new"
          className="inline-flex h-10 items-center gap-1 rounded-xl bg-[var(--color-action-blue)] px-4 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          <Plus className="size-4" /> طلب جديد
        </Link>
      </div>

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
              : 'لا توجد طلبات بعد. أنشئ طلبك الأول لتصلك عروض من الموردين.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/rfqs/${r.id}`}
                  className="block rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[var(--color-stone-600)] num">{r.rfq_number}</div>
                      <h2 className="mt-0.5 text-base font-semibold">{r.title}</h2>
                      <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                        أُنشئ في {formatDateShort(r.created_at)}
                        {r.proposals_deadline
                          ? ` · آخر موعد ${formatDateShort(r.proposals_deadline)}`
                          : ''}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
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
