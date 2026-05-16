import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { timeAgo } from '@/lib/utils/format';
import { Pagination } from '@/components/ui/pagination';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusFilter } from '@/components/ui/status-filter';

interface SupplierRow {
  id: string;
  company_name: string;
  cr_number: string;
  status: string;
  specializations: string[] | null;
  cities: string[] | null;
  total_completed_orders: number;
  average_rating: number | null;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'قيد المراجعة',
  approved: 'معتمد',
  inactive: 'غير نشط',
  suspended: 'موقوف',
  rejected: 'مرفوض',
};

const STATUS_TONE: Record<string, string> = {
  pending_review: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
  approved: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  inactive: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  suspended: 'bg-[var(--color-danger-100)] text-[var(--color-danger)]',
  rejected: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
};

const SERVICE_LABEL: Record<string, string> = {
  booth: 'بوث',
  gifts: 'هدايا',
  event: 'فعالية',
  printing: 'طباعة',
};

const PAGE_SIZE = 25;

export default async function AdminSuppliersAllPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const q = (params.q ?? '').trim();
  const status = (params.status ?? '').trim();

  const admin = createAdminClient();

  let countQ = admin.from('suppliers').select('id', { count: 'exact', head: true });
  if (status) countQ = countQ.eq('status', status);
  if (q) countQ = countQ.ilike('company_name', `%${q}%`);
  const { count } = await countQ;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  let rowsQ = admin
    .from('suppliers')
    .select(
      'id, company_name, cr_number, status, specializations, cities, total_completed_orders, average_rating, created_at, reviewed_at'
    );
  if (status) rowsQ = rowsQ.eq('status', status);
  if (q) rowsQ = rowsQ.ilike('company_name', `%${q}%`);
  const { data: rowsRaw } = await rowsQ
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  const rows = (rowsRaw ?? []) as unknown as SupplierRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        كل الموردين
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        دليل كامل لكل الموردين على المنصة بكل الحالات. لمراجعة التسجيلات الجديدة فقط اذهب إلى{' '}
        <Link
          href="/admin/suppliers/pending"
          className="text-[var(--color-action-blue)] hover:underline"
        >
          «موردون قيد المراجعة»
        </Link>
        .
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchBar placeholder="ابحث باسم الشركة…" />
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
            ما فيش موردين يطابقون البحث.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((s) => {
              const specs = Array.isArray(s.specializations) ? s.specializations : [];
              const cities = Array.isArray(s.cities) ? s.cities : [];
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/suppliers/${s.id}`}
                    className="block rounded-2xl border border-[var(--color-stone-300)] bg-white p-4 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold">
                          {s.company_name}
                        </h2>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-stone-600)]">
                          <span>سجل تجاري: <span className="num">{s.cr_number}</span></span>
                          {s.average_rating != null ? (
                            <span>· ★ <span className="num">{s.average_rating.toFixed(1)}</span></span>
                          ) : null}
                          <span>· <span className="num">{s.total_completed_orders ?? 0}</span> مشروع</span>
                        </div>
                        {specs.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            {specs.map((sp) => (
                              <span
                                key={sp}
                                className="rounded-full bg-[var(--color-stone-100)] px-2 py-0.5"
                              >
                                {SERVICE_LABEL[sp] ?? sp}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {cities.length > 0 ? (
                          <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                            المدن: {cities.join('، ')}
                          </div>
                        ) : null}
                        <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                          انضمّ {timeAgo(s.created_at)}
                          {s.reviewed_at ? ` · رُوجع ${timeAgo(s.reviewed_at)}` : ''}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs ${STATUS_TONE[s.status] ?? 'bg-[var(--color-stone-100)]'}`}
                      >
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
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
