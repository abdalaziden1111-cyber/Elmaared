import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { timeAgo } from '@/lib/utils/format';
import { Pagination } from '@/components/ui/pagination';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusFilter } from '@/components/ui/status-filter';

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  preferred_language: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  client: 'عميل',
  supplier: 'مورد',
  admin: 'Admin',
};

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const q = (params.q ?? '').trim();
  const role = (params.status ?? '').trim();

  const admin = createAdminClient();

  let countQ = admin.from('profiles').select('id', { count: 'exact', head: true });
  if (role) countQ = countQ.eq('role', role);
  if (q) countQ = countQ.ilike('full_name', `%${q}%`);
  const { count } = await countQ;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  let rowsQ = admin
    .from('profiles')
    .select('id, full_name, phone, role, preferred_language, created_at');
  if (role) rowsQ = rowsQ.eq('role', role);
  if (q) rowsQ = rowsQ.ilike('full_name', `%${q}%`);
  const { data: rowsRaw } = await rowsQ
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  const rows = (rowsRaw ?? []) as unknown as ProfileRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        المستخدمون
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        كل المستخدمين على المنصة. اضغط على المستخدم لفتح ملفه.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchBar placeholder="ابحث بالاسم…" />
        </div>
        <StatusFilter
          options={Object.entries(ROLE_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          label="الدور"
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            ما فيش مستخدمين يطابقون البحث.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-2">
            {rows.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-stone-300)] bg-white p-4 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold">
                      {u.full_name ?? '—'}
                    </h2>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-[var(--color-stone-600)]">
                      <span className="rounded-full bg-[var(--color-stone-100)] px-2 py-0.5">
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                      {u.phone ? <span className="num">{u.phone}</span> : null}
                      <span>· انضم {timeAgo(u.created_at)}</span>
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
