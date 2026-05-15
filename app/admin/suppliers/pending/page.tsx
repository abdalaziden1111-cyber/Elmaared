import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApproveRejectButtons } from './approve-reject-buttons';
import { SearchBar } from '@/components/ui/search-bar';
import { Pagination } from '@/components/ui/pagination';

interface PendingSupplier {
  id: string;
  owner_id: string;
  company_name: string;
  cr_number: string;
  specializations: string[] | null;
  cities: string[] | null;
  bio: string | null;
  iban: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

export default async function AdminPendingSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const q = (params.q ?? '').trim();

  const admin = createAdminClient();

  let countQ = admin
    .from('suppliers')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_review');
  if (q) countQ = countQ.ilike('company_name', `%${q}%`);
  const { count } = await countQ;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  let rowsQ = admin
    .from('suppliers')
    .select(
      'id, owner_id, company_name, cr_number, specializations, cities, bio, iban, created_at'
    )
    .eq('status', 'pending_review');
  if (q) rowsQ = rowsQ.ilike('company_name', `%${q}%`);
  const { data: rowsRaw } = await rowsQ
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  const rows = (rowsRaw ?? []) as unknown as PendingSupplier[];
  const hasFilter = Boolean(q);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        موردون قيد المراجعة
      </h1>

      <div className="mt-6">
        <SearchBar placeholder="ابحث باسم الشركة…" />
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            {hasFilter
              ? 'ما فيش نتائج تطابق البحث.'
              : 'لا يوجد موردون بانتظار المراجعة الآن.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-4">
            {rows.map((s) => {
              const specializations = Array.isArray(s.specializations) ? s.specializations : [];
              const cities = Array.isArray(s.cities) ? s.cities : [];
              return (
                <li
                  key={s.id}
                  className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/admin/suppliers/pending/${s.id}`}
                        className="text-base font-semibold text-[var(--color-charcoal)] hover:text-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                      >
                        {s.company_name}
                      </Link>
                      <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                        سجل تجاري:{' '}
                        <span className="num font-medium">{s.cr_number}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {specializations.map((sp) => (
                          <span
                            key={sp}
                            className="rounded-full bg-[var(--color-stone-100)] px-2 py-0.5"
                          >
                            {sp}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                        المدن: {cities.length > 0 ? cities.join('، ') : '—'}
                      </div>
                      {s.bio ? (
                        <p className="mt-3 text-sm text-[var(--color-charcoal)]/80">
                          {s.bio}
                        </p>
                      ) : null}
                      <Link
                        href={`/admin/suppliers/pending/${s.id}`}
                        className="mt-3 inline-block text-xs text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                      >
                        فتح الملف الكامل + المستندات ←
                      </Link>
                    </div>
                    <ApproveRejectButtons supplierId={s.id} />
                  </div>
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
